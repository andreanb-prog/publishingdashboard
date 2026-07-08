# Issue: Per-format KDP royalty history (KU vs eBook vs Paperback vs Hardcover vs Audio)

**Goal:** The dashboard currently shows one blended KDP royalty number per month. Authors want to see the split — especially **how much comes from KU page reads vs paperback vs audio**. On the June sample, ~76% of royalties came from KU alone, and that's invisible today.

**Status:** The parser (the hard part) is **already built, tested, and committed to the working tree**. What remains is plumbing: download the report during the sync, store the split, and render it. This issue covers only that remaining work.

---

## Already done (do not redo)

`lib/browserbase/royalty-report.ts` — parses KDP's downloadable "Prior Month's Royalties" `.xlsx` into a per-format USD breakdown. Verified against the real June 2026 file:

```
eBook sales   $25.62  (49 units)
Paperback     $2.21   (1 unit)
Hardcover     $0
Audiobook     $0
KU / KENP     19,816 pages  → ~$89.17
```

Exports:
- `parseRoyaltyReport(buffer: Buffer): RoyaltyReportBreakdown` — per-format USD + units + KENP pages + parsed `monthKey`.
- `deriveKuUsd(breakdown, blendedTotalUsd)` — KU dollars. **Preferred:** `blendedTotal − (ebook+paperback+hardcover+audiobook)` so the parts always reconcile to the headline number the user already sees. **Fallback:** `kenpPages × 0.0045` when no blended total exists.
- `FX_TO_USD` — approximate currency roll-up table (USD rows unaffected).

The KDP report has 6 sheets: `eBook Royalty`, `KENP`, `Paperback Royalty`, `Hardcover Royalty`, `Audiobook Royalty`, `Total Earnings`. Row 0 = `["Sales Period","June 2026",…]`, row 1 = headers, rows 2+ = data. Each royalty sheet has per-row `Royalty` + `Currency`. The KENP sheet is **pages only** — KDP never puts a KU dollar figure in the file (rate finalizes ~the 15th), which is why KU dollars are derived.

---

## Task 1 — Schema: add a JSON column to store the split

Add ONE nullable column to `KdpSale` in `prisma/schema.prisma`. **Do not add new tables or touch aggregation.**

```prisma
model KdpSale {
  // …existing fields…
  formatBreakdown Json?   // per-format split, set only on the ALL_BOOKS browserbase row
}
```

Create a migration under `prisma/migrations/` (this repo uses timestamped SQL migrations — see `20260706000000_add_swap_entry_source_list_id`). The SQL is simply:

```sql
ALTER TABLE "KdpSale" ADD COLUMN "formatBreakdown" JSONB;
```

**Why a JSON column and not per-format rows:** `aggregateKdp()` in `lib/kdpDataPriority.ts` sums **every** `source==='browserbase'` row into royalties/units/kenp. Adding per-format sentinel rows would double-count the money. Storing the split as JSON on the existing `ALL_BOOKS` month row is purely additive and leaves the money math untouched. **This is a hard constraint — do not modify `aggregateKdp`.**

The stored shape:
```ts
{
  ebookUsd, ebookUnits,
  paperbackUsd, paperbackUnits,
  hardcoverUsd, hardcoverUnits,
  audiobookUsd, audiobookUnits,
  kenpPages, kuUsd, kuDerived: boolean,
  currency: "USD", fxApprox: true
}
```

---

## Task 2 — Sync: download the monthly report and store the split

In `lib/browserbase/kdp-sync.ts`, for each month the backfill loop handles (and the current month), download that month's royalty report, parse it, and write the breakdown onto that month's `ALL_BOOKS` row.

**Page flow (validated live):**
- Report list lives at `https://kdpreports.amazon.com/reports/pmr` (left nav → STATEMENTS → "Prior Months' Royalties").
- There's a **"Choose a month"** dropdown and a **"Download report"** button.
- The downloaded filename encodes the month: `KDP_Prior_Month_Royalties-2026-06-01-<uuid>.xlsx` → map by the `YYYY-MM` in the name.

**Browserbase download retrieval (the one tricky bit):** Browserbase does not stream downloads to the local filesystem. Steps:
1. Before triggering, enable downloads via CDP on the Playwright page: `Page.setDownloadBehavior` → `{ behavior: 'allow', downloadPath: 'downloads' }` (or Browserbase's documented `browser_settings` download handling).
2. Select the month, click "Download report", wait for completion.
3. After the run (or per month), fetch the session's downloads from the Browserbase API:
   `GET https://api.browserbase.com/v1/sessions/{sessionId}/downloads` with header `X-BB-API-Key: <cfg.apiKey>`. Returns a **ZIP** of all files downloaded in the session.
4. Unzip (use `adm-zip` or `jszip`, both already installed), match each `KDP_Prior_Month_Royalties-YYYY-MM-01-*.xlsx` to its month, `parseRoyaltyReport(buffer)`, then `deriveKuUsd(breakdown, blendedTotalForThatMonth)` using the `ALL_BOOKS` royalty already stored for that month.
5. Update that month's `ALL_BOOKS` row: `db.kdpSale.update({ … data: { formatBreakdown } })`.

**Safety (match the existing sync's style — non-negotiable):** Wrap the entire download+parse block in try/catch and make it **fully NON-FATAL**. If downloads fail, the sync must still succeed with the blended totals it already has. Log a warning; never throw. Cap how many months you download per run (reuse the existing `MAX_BACKFILL_PER_RUN` chunking so we don't blow the serverless time budget).

`getBrowserbaseConfig()` gives `{ apiKey, projectId }`. The session id is `stagehand.browserbaseSessionID`. The Playwright page is `stagehand.context.activePage()`.

---

## Task 3 — UI: show the breakdown on the KDP page

On the KDP dashboard (`app/dashboard/kdp/page.tsx` and its panels), when a month's `ALL_BOOKS` row has `formatBreakdown`, render a small split — a stacked bar or a 5-row mini-table: **KU, eBook, Paperback, Hardcover, Audiobook** with USD + share-of-total. Show KENP pages next to KU. Label KU dollars "estimated" when `kuDerived` is false, and add a quiet footnote that non-USD royalties are converted at approximate rates. Keep it consistent with the locked design system (cream/navy/amber/sage; Fraunces headings, JetBrains Mono for numbers).

For the lifetime view, aggregate the per-month `formatBreakdown` JSON across the selected range to show the format split over time.

---

## Verification

1. Unit-test the parser (already passing): `parseRoyaltyReport` on the June file returns the numbers above; `deriveKuUsd(b, 117)` → `{ kuUsd: 89.17, derived: true }`.
2. After wiring: run a real KDP sync, confirm `ALL_BOOKS` rows gain `formatBreakdown`, and the KDP page renders the split with the parts summing to the existing blended total.
3. Confirm the blended royalty numbers on the dashboard are **unchanged** (aggregation untouched).

## Gotchas
- KU dollars are always derived/estimated — never advertise them as exact.
- Multi-currency: roll up to USD via `FX_TO_USD`; USD-heavy accounts are barely affected.
- Do not modify `aggregateKdp()` or add per-format `KdpSale` rows.
- Keep the download block non-fatal so it can never regress the working sync.
