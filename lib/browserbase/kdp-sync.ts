// lib/browserbase/kdp-sync.ts
// Server-side KDP sync via Browserbase + Stagehand.
// Navigates to kdpreports.amazon.com/dashboard, clicks "This month",
// and extracts aggregate Royalties / Orders / KENP totals.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import AdmZip from 'adm-zip'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getBrowserbaseConfig } from '@/lib/browserbase'
import { parseRoyaltyReport, deriveKuUsd } from '@/lib/browserbase/royalty-report'

const KDP_DASHBOARD_URL = 'https://kdpreports.amazon.com/dashboard'
// Left nav → STATEMENTS → "Prior Months' Royalties" — the downloadable per-format
// royalty report list. One .xlsx per completed month (never the current month).
const KDP_PMR_URL = 'https://kdpreports.amazon.com/reports/pmr'

// Aggregate totals shown on the dashboard page for a given time period.
const DashboardSchema = z.object({
  royalties: z.number(),   // Estimated royalties in USD
  orders:    z.number(),   // Total orders (units sold)
  kenp:      z.number(),   // KENP pages read
})

// Returns YYYY-MM for the current month minus `monthsAgo` months (0 = current).
function monthKeyAgo(monthsAgo: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "2026-05" → "May 2026" / last day of month e.g. 31 — for Stagehand instructions.
function monthMeta(monthKey: string): { label: string; lastDay: number } {
  const [y, m] = monthKey.split('-').map(Number)
  const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const lastDay = new Date(y, m, 0).getDate()
  return { label, lastDay }
}

// Lifetime history is seeded a few months at a time. A serverless function
// can't drive dozens of verified month-switches in one request (that was the
// timeout the old "Prior Months' Royalties" reader tried — and failed — to
// dodge), so each sync backfills at most MAX_BACKFILL_PER_RUN of the NEWEST
// still-missing months inside a LIFETIME_WINDOW_MONTHS window. Successive syncs
// (including the nightly cron) walk backward until the whole window is covered.
// Steady state there are 0–1 missing months, so this stays cheap.
const LIFETIME_WINDOW_MONTHS = 36
const MAX_BACKFILL_PER_RUN = 4

export async function syncKdpForUser(userId: string): Promise<void> {
  // 1. Look up kdpContextId
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { kdpContextId: true },
  })

  if (!user?.kdpContextId) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed',
        errorType: 'no_context',
        errorDetail: 'No kdpContextId stored for this user. Connect KDP first.',
      },
    })
    return
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed',
        errorType: 'config_missing',
        errorDetail: 'BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set.',
      },
    })
    return
  }

  // 2. Open Stagehand session using the stored context
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    // Stagehand's default logger uses pino + the pino-pretty transport, which is
    // unavailable in Vercel's serverless runtime and throws
    // "unable to determine transport target for pino-pretty" at construction —
    // crashing the whole sync before it opens a browser. Disable the pino
    // backend and route logs through a plain console logger instead.
    disablePino: true,
    verbose: 0,
    logger: (line) => {
      try { console.log('[stagehand]', typeof line === 'string' ? line : JSON.stringify(line)) } catch { /* ignore */ }
    },
    browserbaseSessionCreateParams: {
      projectId: cfg.projectId,
      browserSettings: {
        context: { id: user.kdpContextId, persist: true },
      },
    },
  })

  let bbSessionId: string | undefined
  let syncLogId: string | undefined

  try {
    // Hard cap on init/connect so a stuck Browserbase session can't hang the
    // whole function until Vercel kills it (which leaves NO error logged and a
    // 5-minute ghost session). If this fires, the catch block records a real
    // 'failed' SyncLog with this message.
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Stagehand init/connect timed out after 90s — Browserbase session never became drivable (likely a locked Context from an unreleased login session)')),
          90_000,
        ),
      ),
    ])
    bbSessionId = stagehand.browserbaseSessionID ?? undefined

    const syncLogEntry = await db.syncLog.create({
      data: {
        userId,
        source: 'kdp',
        status: 'failed', // updated to 'success' at the end
        sessionId: bbSessionId,
      },
    })
    syncLogId = syncLogEntry.id

    // 3. Navigate to KDP dashboard
    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page in Browserbase session')

    await page.goto(KDP_DASHBOARD_URL, { waitUntil: 'load', timeoutMs: 15_000 })

    // Let the page fully render before checking URL or extracting
    await page.waitForTimeout(3000)

    // 4. Check for redirect to login or landing on the marketing homepage
    const currentUrl = page.url()
    let currentHost = ''
    try { currentHost = new URL(currentUrl).hostname.toLowerCase() } catch { /* keep empty */ }
    // Logged in when we're anywhere on the reports host (root OR /dashboard —
    // Amazon sometimes drops the path). Only treat as a login bounce if we were
    // sent to an actual sign-in page or the marketing site (kdp.amazon.com).
    const isLoginPage =
      currentUrl.includes('/ap/signin') ||
      currentUrl.includes('/signin') ||
      currentHost === 'kdp.amazon.com'

    if (isLoginPage) {
      await db.user.update({
        where: { id: userId },
        data: { kdpSyncStatus: 'needs_reauth' },
      })
      await db.syncLog.update({
        where: { id: syncLogEntry.id },
        data: {
          status: 'expired',
          completedAt: new Date(),
          errorType: 'session_expired',
          errorDetail: `Redirected away from dashboard: ${currentUrl}`,
        },
      })
      return
    }

    // Any OTHER unexpected host (captcha, robot-check, error interstitial, or an
    // unparseable URL) is a TRANSIENT failure — NOT login expiry. Throw so it's
    // recorded as a sync_error and kdpSyncStatus stays 'connected', instead of
    // wrongly flipping to needs_reauth and dropping the user from the nightly cron.
    if (currentHost !== 'kdpreports.amazon.com') {
      throw new Error(`Unexpected KDP host (transient, not reauth): ${currentUrl}`)
    }

    // 5. Make sure the "This month" view is selected. NON-FATAL: it may already
    // be the active tab (nothing to click), so a failure here must not abort the
    // whole sync — we just proceed to extract whatever the current view shows.
    try {
      await stagehand.act('Select the "This month" tab so the summary shows current-month totals')
      await page.waitForTimeout(2500)
    } catch (actErr) {
      console.warn('[kdp-sync] "This month" tab select skipped:', actErr instanceof Error ? actErr.message : String(actErr))
    }

    // 6. Extract aggregate totals for the currently selected period (60s hard timeout)
    const extractTotals = async (): Promise<z.infer<typeof DashboardSchema>> => {
      const extractPromise = stagehand.extract(
        `On this Amazon KDP reports dashboard, read the summary totals shown near the top
for the CURRENTLY SELECTED date range — the row containing Estimated royalties, Orders, and KENP. Return:
- royalties: the Estimated royalties amount as a number, ignoring "$", commas and any trailing "*" (e.g. 121.00)
- orders: the Orders count as an integer, ignoring commas (e.g. 50)
- kenp: the KENP (also labelled "KENP Read" or "Pages") count as an integer, ignoring commas (e.g. 19753)
If a value shows a dash or is missing, return 0.`,
        DashboardSchema,
      )
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('KDP extraction timed out after 60s')), 60_000),
      )
      return Promise.race([extractPromise, timeoutPromise])
    }

    // Upserts the aggregate browserbase row for a month — the monthly truth row.
    const upsertMonthRow = async (monthKey: string, totals: z.infer<typeof DashboardSchema>) => {
      await db.kdpSale.upsert({
        where: {
          userId_asin_source_monthKey: {
            userId,
            asin:     'ALL_BOOKS',
            source:   'browserbase',
            monthKey,
          },
        },
        update: {
          title:     'All Books (Dashboard Total)',
          units:     totals.orders,
          kenp:      totals.kenp,
          royalties: totals.royalties,
        },
        create: {
          userId,
          asin:      'ALL_BOOKS',
          title:     'All Books (Dashboard Total)',
          date:      `${monthKey}-01`,
          units:     totals.orders,
          kenp:      totals.kenp,
          royalties: totals.royalties,
          format:    'ebook',
          source:    'browserbase',
          monthKey,
        },
      })
    }

    const result = await extractTotals()
    await upsertMonthRow(monthKeyAgo(0), result)
    let rowsFetched = 1

    // 7. Backfill: pull prior months that have no browserbase row yet (~90 days
    // of coverage). Runs on first sync / after gaps; steady-state nights skip it.
    // Every step is NON-FATAL — a failed backfill month never fails the sync.
    //
    // CRITICAL SAFETY: the date-range switch is VERIFIED before any write. An
    // earlier version trusted stagehand.act() blindly and wrote the current
    // month's totals under prior monthKeys when the click silently failed.
    // Backfill extraction therefore also reads the date range text the page is
    // ACTUALLY showing, and the row is only written when that text matches the
    // target month. No verification → no write.
    const BackfillSchema = DashboardSchema.extend({
      periodLabel: z.string(), // the date range text currently displayed by the selector
    })

    const extractWithPeriod = async (): Promise<z.infer<typeof BackfillSchema>> => {
      const p = stagehand.extract(
        `On this Amazon KDP reports dashboard, read the summary totals shown near the top
for the CURRENTLY SELECTED date range — the row containing Estimated royalties, Orders, and KENP. Return:
- royalties: the Estimated royalties amount as a number, ignoring "$", commas and any trailing "*" (e.g. 121.00)
- orders: the Orders count as an integer, ignoring commas (e.g. 50)
- kenp: the KENP (also labelled "KENP Read" or "Pages") count as an integer, ignoring commas (e.g. 19753)
- periodLabel: the EXACT text currently displayed by the date range selector/dropdown (e.g. "Last month", "Jun 1, 2026 - Jun 30, 2026", "This month"). Copy it verbatim.
If a value shows a dash or is missing, return 0.`,
        BackfillSchema,
      )
      const t = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('KDP backfill extraction timed out after 60s')), 60_000),
      )
      return Promise.race([p, t])
    }

    // Does the selector text plausibly refer to the target month?
    // Accepts "June", "Jun", "06/2026", "2026-06", or "Last month" for ago===1.
    const labelMatchesMonth = (periodLabel: string, monthKey: string, ago: number): boolean => {
      const lower = periodLabel.toLowerCase()
      const { label } = monthMeta(monthKey)             // "June 2026"
      const monthName = label.split(' ')[0].toLowerCase() // "june"
      const [year, mm] = monthKey.split('-')
      if (lower.includes(monthName.slice(0, 3))) return true
      if (lower.includes(`${mm}/`) && lower.includes(year)) return true
      if (lower.includes(monthKey)) return true
      if (ago === 1 && lower.includes('last month')) return true
      return false
    }

    // Which months inside the lifetime window still lack a browserbase row?
    // Backfill the NEWEST missing ones first, capped per run so we never blow
    // the function budget; later syncs pick up where this one left off.
    const windowMonths: { monthKey: string; ago: number }[] = []
    for (let ago = 1; ago <= LIFETIME_WINDOW_MONTHS; ago++) {
      windowMonths.push({ monthKey: monthKeyAgo(ago), ago })
    }
    const existingBackfill = await db.kdpSale.findMany({
      where: {
        userId, asin: 'ALL_BOOKS', source: 'browserbase',
        monthKey: { in: windowMonths.map(w => w.monthKey) },
      },
      select: { monthKey: true },
    })
    const haveBackfill = new Set(existingBackfill.map(r => r.monthKey))
    const missingMonths = windowMonths
      .filter(w => !haveBackfill.has(w.monthKey))
      .slice(0, MAX_BACKFILL_PER_RUN)

    for (const { monthKey, ago } of missingMonths) {
      try {
        const { label, lastDay } = monthMeta(monthKey)
        const monthName = label.split(' ')[0]
        const year = monthKey.slice(0, 4)
        const instructions = ago === 1
          ? [
              'Click the date range selector/dropdown near the top of the dashboard, then click the "Last month" option in the list that appears',
              `Open the date range picker and select a custom range from ${monthName} 1, ${year} to ${monthName} ${lastDay}, ${year}, then apply it`,
            ]
          : [
              `Click the date range selector/dropdown near the top of the dashboard and select a custom date range from ${monthName} 1, ${year} to ${monthName} ${lastDay}, ${year}, then apply it`,
              `Open the date range picker, navigate to ${label}, select the full month (${monthName} 1 to ${monthName} ${lastDay}), and apply`,
            ]

        let written = false
        for (const instruction of instructions) {
          await stagehand.act(instruction)
          await page.waitForTimeout(4000)
          const totals = await extractWithPeriod()
          if (labelMatchesMonth(totals.periodLabel, monthKey, ago)) {
            await upsertMonthRow(monthKey, totals)
            rowsFetched++
            written = true
            console.log(`[kdp-sync] backfilled ${monthKey} ("${totals.periodLabel}"): $${totals.royalties} / ${totals.orders} orders / ${totals.kenp} KENP`)
            break
          }
          console.warn(`[kdp-sync] backfill ${monthKey}: range switch NOT verified (selector shows "${totals.periodLabel}") — not writing, retrying`)
        }
        if (!written) {
          console.warn(`[kdp-sync] backfill ${monthKey}: could not verify the date range switch after ${instructions.length} attempts — month skipped, no data written`)
        }
      } catch (backfillErr) {
        console.warn(`[kdp-sync] backfill for ${monthKey} skipped:`, backfillErr instanceof Error ? backfillErr.message : String(backfillErr))
      }
    }

    // 7c. Per-format royalty split — download KDP's "Prior Months' Royalties"
    // .xlsx for months whose ALL_BOOKS row has no formatBreakdown yet, parse it
    // into a per-format USD split (KU / eBook / Paperback / Hardcover / Audio),
    // and stash it as JSON on that month's EXISTING row. This is additive-only:
    // no new rows, no touched royalty/units/kenp fields, so aggregateKdp()'s
    // money math is unchanged. Prior months only — KDP publishes the report
    // after month end, so the current month never has one.
    //
    // ENTIRELY NON-FATAL: any failure logs a warning and the sync still
    // succeeds with the blended totals it already wrote. Capped at
    // MAX_BACKFILL_PER_RUN months per run (same chunking as the backfill loop)
    // so we never blow the serverless time budget.
    try {
      const splitCandidates = await db.kdpSale.findMany({
        where: {
          userId,
          asin:     'ALL_BOOKS',
          source:   'browserbase',
          monthKey: { in: windowMonths.map(w => w.monthKey) },
          formatBreakdown: { equals: Prisma.AnyNull },
        },
        select:  { monthKey: true, royalties: true },
        orderBy: { monthKey: 'desc' },
        take:    MAX_BACKFILL_PER_RUN,
      })

      if (splitCandidates.length > 0 && bbSessionId) {
        // Blended dashboard total per month — used to derive KU dollars so the
        // per-format parts always reconcile to the headline the user sees.
        const blendedByMonth = new Map<string, number>()
        for (const c of splitCandidates) {
          if (c.monthKey) blendedByMonth.set(c.monthKey, c.royalties)
        }

        // Enable downloads in the remote browser via CDP. Browserbase does NOT
        // stream downloads to the local filesystem — files land in the session's
        // cloud storage and are fetched afterwards via the downloads API.
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cdp = await (stagehand.context as any).newCDPSession(page)
          try {
            await cdp.send('Browser.setDownloadBehavior', {
              behavior: 'allow', downloadPath: 'downloads', eventsEnabled: true,
            })
          } catch {
            // Older CDP fallback
            await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: 'downloads' })
          }
        } catch (cdpErr) {
          console.warn('[kdp-sync] royalty report: could not set CDP download behavior (continuing):', cdpErr instanceof Error ? cdpErr.message : String(cdpErr))
        }

        await page.goto(KDP_PMR_URL, { waitUntil: 'load', timeoutMs: 20_000 })
        await page.waitForTimeout(3000)

        // Trigger one download per candidate month. Month attribution does NOT
        // depend on these clicks landing right — the downloaded filename encodes
        // the month (KDP_Prior_Month_Royalties-YYYY-MM-01-<uuid>.xlsx) and we
        // map by filename below, so a wrong dropdown pick can never write data
        // under the wrong monthKey.
        let triggered = 0
        for (const cand of splitCandidates) {
          if (!cand.monthKey) continue
          try {
            const { label } = monthMeta(cand.monthKey) // "June 2026"
            await stagehand.act(`Click the "Choose a month" dropdown and select "${label}" from the list of months`)
            await page.waitForTimeout(1500)
            await stagehand.act('Click the "Download report" button')
            await page.waitForTimeout(4000) // let the download land in session storage
            triggered++
          } catch (dlErr) {
            console.warn(`[kdp-sync] royalty report download for ${cand.monthKey} skipped:`, dlErr instanceof Error ? dlErr.message : String(dlErr))
          }
        }

        if (triggered > 0) {
          // Fetch the session's downloads — the API returns a ZIP of every file
          // downloaded in the session. Files can take a moment to appear, so
          // poll briefly and stop early once all expected reports are present.
          const FILE_RE = /KDP_Prior_Month_Royalties-(\d{4})-(\d{2})-01-.*\.xlsx$/i
          let zip: AdmZip | null = null
          for (let attempt = 0; attempt < 4; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 3000))
            try {
              const res = await fetch(
                `https://api.browserbase.com/v1/sessions/${bbSessionId}/downloads`,
                { headers: { 'X-BB-API-Key': cfg.apiKey } },
              )
              if (!res.ok) continue
              const buf = Buffer.from(await res.arrayBuffer())
              if (buf.length === 0) continue
              const candidateZip = new AdmZip(buf)
              const xlsxCount = candidateZip.getEntries().filter(e => FILE_RE.test(e.entryName)).length
              zip = candidateZip
              if (xlsxCount >= triggered) break // everything we asked for is in
            } catch { /* partial/invalid zip — retry */ }
          }

          if (!zip) {
            console.warn('[kdp-sync] royalty report: downloads ZIP never became available — format split skipped this run')
          } else {
            for (const entry of zip.getEntries()) {
              const m = entry.entryName.match(FILE_RE)
              if (!m) continue
              const monthKey = `${m[1]}-${m[2]}`
              if (!blendedByMonth.has(monthKey)) continue // not a month we're filling
              try {
                const breakdown = parseRoyaltyReport(entry.getData())
                // Belt-and-braces: the "Sales Period" cell inside the file must
                // agree with the filename before we write anything.
                if (breakdown.monthKey && breakdown.monthKey !== monthKey) {
                  console.warn(`[kdp-sync] royalty report ${entry.entryName}: file says ${breakdown.monthKey}, filename says ${monthKey} — skipped`)
                  continue
                }
                const { kuUsd, derived } = deriveKuUsd(breakdown, blendedByMonth.get(monthKey))
                const formatBreakdown = {
                  ebookUsd:       breakdown.ebookUsd,
                  ebookUnits:     breakdown.ebookUnits,
                  paperbackUsd:   breakdown.paperbackUsd,
                  paperbackUnits: breakdown.paperbackUnits,
                  hardcoverUsd:   breakdown.hardcoverUsd,
                  hardcoverUnits: breakdown.hardcoverUnits,
                  audiobookUsd:   breakdown.audiobookUsd,
                  audiobookUnits: breakdown.audiobookUnits,
                  kenpPages:      breakdown.kenpPages,
                  kuUsd,
                  kuDerived:      derived,
                  currency:       'USD',
                  fxApprox:       true,
                }
                await db.kdpSale.update({
                  where: {
                    userId_asin_source_monthKey: {
                      userId, asin: 'ALL_BOOKS', source: 'browserbase', monthKey,
                    },
                  },
                  data: { formatBreakdown },
                })
                console.log(`[kdp-sync] format split stored for ${monthKey}: KU $${kuUsd}${derived ? '' : ' (KENP-rate estimate)'} · eBook $${breakdown.ebookUsd} · PB $${breakdown.paperbackUsd} · HC $${breakdown.hardcoverUsd} · Audio $${breakdown.audiobookUsd} · ${breakdown.kenpPages} KENP pages`)
              } catch (parseErr) {
                console.warn(`[kdp-sync] royalty report parse for ${monthKey} skipped:`, parseErr instanceof Error ? parseErr.message : String(parseErr))
              }
            }
          }
        }
      }
    } catch (reportErr) {
      console.warn('[kdp-sync] royalty report block skipped (non-fatal):', reportErr instanceof Error ? reportErr.message : String(reportErr))
    }

    // NOTE: An earlier "Prior Months' Royalties" ON-SCREEN statements reader was
    // removed after live validation (2026-07). That page can't be read in one
    // shot — it shows ONE month at a time via a dropdown, split across
    // marketplaces and currencies (USD/GBP/EUR/…) with "Total earnings: N/A" —
    // so it's a worse source than the dashboard totals the backfill loop reads.
    // Blended monthly totals therefore come from the chunked backfill window
    // above. Block 7c is different: it uses the PMR page's DOWNLOADABLE .xlsx
    // (which the on-screen reader never touched) purely for the per-format
    // split, and reconciles KU dollars back to the blended dashboard total.

    // 7d. KDP Bookshelf → auto-populate the book catalog WITH FORMATS, and detect
    // an empty bookshelf (Gina's "connected the zero-titles state"). One read of a
    // page we already reach. Fills in only MISSING fields on existing books, so it
    // never clobbers a user's manual edits. NON-FATAL.
    try {
      const BookshelfSchema = z.object({
        books: z.array(z.object({
          title:         z.string(),
          kindleAsin:    z.string().optional(),
          paperbackAsin: z.string().optional(),
          paperbackIsbn: z.string().optional(),
          hardcoverAsin: z.string().optional(),
          hardcoverIsbn: z.string().optional(),
          audiobookAsin: z.string().optional(),
          hasAudiobook:  z.boolean().optional(),
          seriesName:    z.string().optional(),
        })),
      })

      await page.goto('https://kdp.amazon.com/en_US/bookshelf', { waitUntil: 'domcontentloaded', timeoutMs: 20_000 })
      await page.waitForTimeout(5000)

      const shelfPromise = stagehand.extract(
        `On this Amazon KDP Bookshelf page, read EVERY title the author has published.
Each title groups its editions in labelled sections: "Kindle eBook", "Audible audiobook", "Paperback", and "Hardcover". Under each section, a published edition shows a line like "ASIN: B0XXXXXXXX". An un-published edition instead shows a call to action like "+ Add audiobook…", "+ Create hardcover", or "Not eligible" (and has NO ASIN).
For each distinct book return:
- title: the book title
- seriesName: the series name if the title shows "Book in <name> series", else omit
- kindleAsin: the ASIN under the "Kindle eBook" section (starts with "B0"), else omit
- paperbackAsin: the ASIN under the "Paperback" section (also starts with "B0"), else omit
- paperbackIsbn: a Paperback ISBN ONLY if one is explicitly shown (usually it is not), else omit
- hardcoverAsin: the ASIN under the "Hardcover" section if published, else omit
- hardcoverIsbn: a Hardcover ISBN ONLY if explicitly shown, else omit
- audiobookAsin: the ASIN under the "Audible audiobook" section if a real audiobook is published, else omit
- hasAudiobook: true if the "Audible audiobook" section shows a PUBLISHED audiobook (not "+ Add…" and not "Not eligible"), otherwise false
Return "books": the full array. If the bookshelf shows no titles at all, return an empty array.`,
        BookshelfSchema,
      )
      const shelfTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Bookshelf extraction timed out after 60s')), 60_000),
      )
      const shelf = await Promise.race([shelfPromise, shelfTimeout])

      if (shelf.books.length === 0) {
        // Empty bookshelf → likely the wrong Amazon account (or a genuinely empty
        // KDP). Flag it so the UI can warn instead of showing silent zeros.
        await db.syncLog.create({
          data: {
            userId, source: 'kdp', status: 'needs_human',
            errorType: 'empty_bookshelf',
            errorDetail: 'Connected to KDP but the Bookshelf shows no titles — the user may be signed into the wrong Amazon account.',
          },
        }).catch(() => undefined)
        console.warn('[kdp-sync] Bookshelf empty — flagged empty_bookshelf')
      } else {
        let catalogRows = 0
        for (const b of shelf.books) {
          if (!b.title) continue
          // Match an existing catalog book by Kindle ASIN first, else by title.
          const existing = b.kindleAsin
            ? await db.book.findFirst({ where: { userId, asin: b.kindleAsin } })
            : await db.book.findFirst({ where: { userId, title: { equals: b.title, mode: 'insensitive' } } })

          if (existing) {
            // Fill ONLY missing fields — never overwrite the user's own edits.
            await db.book.update({
              where: { id: existing.id },
              data: {
                asin:          existing.asin          ?? b.kindleAsin    ?? null,
                asinPaperback: existing.asinPaperback ?? b.paperbackAsin ?? null,
                isbnPaperback: existing.isbnPaperback ?? b.paperbackIsbn ?? null,
                isbnHardcover: existing.isbnHardcover ?? b.hardcoverIsbn ?? null,
                asinAudiobook: existing.asinAudiobook ?? b.audiobookAsin ?? null,
                seriesName:    existing.seriesName    ?? b.seriesName    ?? null,
              },
            })
          } else {
            await db.book.create({
              data: {
                userId,
                title:         b.title,
                asin:          b.kindleAsin    ?? null,
                asinPaperback: b.paperbackAsin ?? null,
                isbnPaperback: b.paperbackIsbn ?? null,
                isbnHardcover: b.hardcoverIsbn ?? null,
                asinAudiobook: b.audiobookAsin ?? null,
                seriesName:    b.seriesName    ?? null,
              },
            })
          }
          catalogRows++
        }
        console.log(`[kdp-sync] Bookshelf: synced ${catalogRows} title(s) into catalog`)
      }
    } catch (shelfErr) {
      console.warn('[kdp-sync] Bookshelf read skipped:', shelfErr instanceof Error ? shelfErr.message : String(shelfErr))
    }

    // 8. Update user sync metadata and mark success. Also restore 'connected':
    // if the user had been flagged 'needs_reauth' (possibly by a transient blip),
    // a successful extraction proves the session is valid again — otherwise the
    // nightly cron (which selects only kdpSyncStatus:'connected') drops them forever.
    await db.user.update({
      where: { id: userId },
      data: { kdpLastSyncAt: new Date(), kdpSyncStatus: 'connected' },
    })

    await db.syncLog.update({
      where: { id: syncLogEntry.id },
      data: {
        status:      'success',
        completedAt: new Date(),
        rowsFetched,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: {
          status:      'failed',
          completedAt: new Date(),
          errorType:   'sync_error',
          errorDetail: msg.slice(0, 1000),
        },
      }).catch(() => undefined)
    } else {
      await db.syncLog.create({
        data: {
          userId,
          source:      'kdp',
          status:      'failed',
          sessionId:   bbSessionId,
          completedAt: new Date(),
          errorType:   'sync_error',
          errorDetail: msg.slice(0, 1000),
        },
      })
    }
  } finally {
    try {
      await stagehand.close()
    } catch {
      // Ignore close errors
    }
  }
}
