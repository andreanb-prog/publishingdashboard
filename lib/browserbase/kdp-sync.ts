// lib/browserbase/kdp-sync.ts
// Server-side KDP sync via Browserbase + Stagehand.
// Navigates to kdpreports.amazon.com/dashboard, clicks "This month",
// and extracts aggregate Royalties / Orders / KENP totals.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import AdmZip from 'adm-zip'
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

    // 7. Prior-month coverage. NOTE (2026-07): KDP migrated reports to a new
    // dashboard (kdpreports.amazon.com) that only offers Today / Yesterday /
    // This month — the arbitrary date-range picker the old backfill drove is
    // gone, so prior months can no longer be read from the dashboard at all.
    // Prior-month totals AND their per-format split now come from the
    // downloadable monthly royalty report instead (block 7c below), which is a
    // more complete and reliable source. The current month is still read from
    // the dashboard above (step 6/7). This block just enumerates the window.
    // Which months inside the lifetime window are candidates for prior-month
    // data? (Newest first.) The actual acquisition now happens in 7c below,
    // from the downloadable monthly royalty report — see the note there.
    const windowMonths: { monthKey: string; ago: number }[] = []
    for (let ago = 1; ago <= LIFETIME_WINDOW_MONTHS; ago++) {
      windowMonths.push({ monthKey: monthKeyAgo(ago), ago })
    }

    // 7c. Prior-month acquisition + per-format split, BOTH from the downloadable
    // monthly royalty report. Since KDP's new dashboard can't show prior months
    // (see step 7 note), the report is now the sole prior-month source: one
    // download yields the per-format dollars (KU / eBook / Paperback / Hardcover
    // / Audio) AND — when no row exists for that month yet — the blended total to
    // CREATE the month row itself. For months that already have a browserbase
    // row, we keep that row's authoritative totals and only attach the split.
    //
    // ENTIRELY NON-FATAL and capped at MAX_BACKFILL_PER_RUN months/run: any
    // failure logs a warning and the sync still succeeds with the current month
    // it already wrote. The only rows it creates are the same ALL_BOOKS month
    // sentinels the old backfill made, so aggregateKdp()'s math is unaffected.
    try {
      const currentMonthKey = monthKeyAgo(0)
      // Existing browserbase ALL_BOOKS rows in the window + their split state.
      const existingRows = await db.kdpSale.findMany({
        where: {
          userId, asin: 'ALL_BOOKS', source: 'browserbase',
          monthKey: { in: windowMonths.map(w => w.monthKey) },
        },
        select: { monthKey: true, royalties: true, formatBreakdown: true },
      })
      const rowByMonth = new Map<string, { royalties: number; hasSplit: boolean }>()
      for (const r of existingRows) {
        if (r.monthKey) rowByMonth.set(r.monthKey, { royalties: r.royalties, hasSplit: r.formatBreakdown != null })
      }

      // Newest prior months still needing data: no row at all, or a row without
      // a split. Never the current month (KDP publishes a month's report only
      // after the month closes).
      const targetMonths = windowMonths
        .filter(w => w.monthKey !== currentMonthKey)
        .filter(w => {
          const r = rowByMonth.get(w.monthKey)
          return !r || !r.hasSplit
        })
        .slice(0, MAX_BACKFILL_PER_RUN)

      if (targetMonths.length > 0 && bbSessionId) {
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

        // Trigger one download per target month. Month attribution does NOT
        // depend on these clicks landing right — the filename encodes the month
        // (KDP_Prior_Month_Royalties-YYYY-MM-01-<uuid>.xlsx) and we map by
        // filename below, so a wrong dropdown pick can't write the wrong month.
        let triggered = 0
        for (const tm of targetMonths) {
          try {
            const { label } = monthMeta(tm.monthKey) // "June 2026"
            await stagehand.act(`Click the "Choose a month" dropdown and select "${label}" from the list of months`)
            await page.waitForTimeout(1500)
            await stagehand.act('Click the "Download report" button')
            await page.waitForTimeout(4000) // let the download land in session storage
            triggered++
          } catch (dlErr) {
            console.warn(`[kdp-sync] royalty report download for ${tm.monthKey} skipped:`, dlErr instanceof Error ? dlErr.message : String(dlErr))
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
            console.warn('[kdp-sync] royalty report: downloads ZIP never became available — prior-month data skipped this run')
          } else {
            const targetKeys = new Set(targetMonths.map(tm => tm.monthKey))
            for (const entry of zip.getEntries()) {
              const fm = entry.entryName.match(FILE_RE)
              if (!fm) continue
              const monthKey = `${fm[1]}-${fm[2]}`
              if (!targetKeys.has(monthKey)) continue // not a month we're filling
              try {
                const breakdown = parseRoyaltyReport(entry.getData())
                // Belt-and-braces: the file's own "Sales Period" must agree with
                // the filename before we write anything under this monthKey.
                if (breakdown.monthKey && breakdown.monthKey !== monthKey) {
                  console.warn(`[kdp-sync] royalty report ${entry.entryName}: file says ${breakdown.monthKey}, filename says ${monthKey} — skipped`)
                  continue
                }

                const existing = rowByMonth.get(monthKey)
                // Reconcile KU against a real blended total when we have one;
                // otherwise deriveKuUsd falls back to pages × the KENP rate.
                const blended = existing && existing.royalties > 0 ? existing.royalties : null
                const { kuUsd, derived } = deriveKuUsd(breakdown, blended)
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

                if (existing) {
                  // Keep the row's authoritative totals; only attach the split.
                  await db.kdpSale.update({
                    where: { userId_asin_source_monthKey: { userId, asin: 'ALL_BOOKS', source: 'browserbase', monthKey } },
                    data: { formatBreakdown },
                  })
                } else {
                  // No row for this month yet — create it FROM the report.
                  // Blended = the four format dollars + the KU estimate; units =
                  // sum of paid format units; kenp = the report's page reads.
                  const blendedTotal = +(
                    breakdown.ebookUsd + breakdown.paperbackUsd +
                    breakdown.hardcoverUsd + breakdown.audiobookUsd + kuUsd
                  ).toFixed(2)
                  const units =
                    breakdown.ebookUnits + breakdown.paperbackUnits +
                    breakdown.hardcoverUnits + breakdown.audiobookUnits
                  await db.kdpSale.create({
                    data: {
                      userId, asin: 'ALL_BOOKS', title: 'All Books (Statement Total)',
                      date: `${monthKey}-01`, units, kenp: breakdown.kenpPages,
                      royalties: blendedTotal, format: 'ebook', source: 'browserbase',
                      monthKey, formatBreakdown,
                    },
                  })
                  rowsFetched++
                }
                console.log(`[kdp-sync] prior-month ${existing ? 'split' : 'row+split'} stored for ${monthKey}: KU $${kuUsd}${derived ? '' : ' (KENP-rate estimate)'} · eBook $${breakdown.ebookUsd} · PB $${breakdown.paperbackUsd} · HC $${breakdown.hardcoverUsd} · Audio $${breakdown.audiobookUsd} · ${breakdown.kenpPages} KENP pages`)
              } catch (parseErr) {
                console.warn(`[kdp-sync] royalty report handling for ${monthKey} skipped:`, parseErr instanceof Error ? parseErr.message : String(parseErr))
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
