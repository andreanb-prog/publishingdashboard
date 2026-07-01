// lib/browserbase/kdp-sync.ts
// Server-side KDP sync via Browserbase + Stagehand.
// Navigates to kdpreports.amazon.com/dashboard, clicks "This month",
// and extracts aggregate Royalties / Orders / KENP totals.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig } from '@/lib/browserbase'

const KDP_DASHBOARD_URL = 'https://kdpreports.amazon.com/dashboard'

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

// How many prior months the sync backfills when they're missing (2 = ~90 days
// of coverage including the current month). Backfill only runs for months with
// no existing browserbase row, so steady-state nightly syncs skip it entirely.
const BACKFILL_MONTHS = 2

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
    // sent to a sign-in page or the marketing site (kdp.amazon.com).
    const isLoginPage =
      currentUrl.includes('/ap/signin') ||
      currentUrl.includes('/signin') ||
      currentHost !== 'kdpreports.amazon.com'

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
    for (let ago = 1; ago <= BACKFILL_MONTHS; ago++) {
      const monthKey = monthKeyAgo(ago)
      try {
        const existing = await db.kdpSale.findUnique({
          where: {
            userId_asin_source_monthKey: {
              userId, asin: 'ALL_BOOKS', source: 'browserbase', monthKey,
            },
          },
          select: { id: true },
        })
        if (existing) continue

        const { label, lastDay } = monthMeta(monthKey)
        const instruction = ago === 1
          ? 'Open the date range selector and choose the "Last month" option so the summary shows last month\'s totals'
          : `Open the date range selector and choose a custom date range covering all of ${label} — from ${label.split(' ')[0]} 1 to ${label.split(' ')[0]} ${lastDay}, ${monthKey.slice(0, 4)} — then apply it so the summary shows that month's totals`
        await stagehand.act(instruction)
        await page.waitForTimeout(3000)

        const totals = await extractTotals()
        await upsertMonthRow(monthKey, totals)
        rowsFetched++
        console.log(`[kdp-sync] backfilled ${monthKey}: $${totals.royalties} / ${totals.orders} orders / ${totals.kenp} KENP`)
      } catch (backfillErr) {
        console.warn(`[kdp-sync] backfill for ${monthKey} skipped:`, backfillErr instanceof Error ? backfillErr.message : String(backfillErr))
      }
    }

    // 8. Update user sync metadata and mark success
    await db.user.update({
      where: { id: userId },
      data: { kdpLastSyncAt: new Date() },
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
