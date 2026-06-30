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

// Returns YYYY-MM for the current month.
function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

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
    await stagehand.init()
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

    // 6. Extract aggregate totals from the dashboard (60s hard timeout)
    const extractPromise = stagehand.extract(
      `On this Amazon KDP reports dashboard, read the current-month ("This month") summary
totals shown near the top — the row containing Estimated royalties, Orders, and KENP. Return:
- royalties: the Estimated royalties amount as a number, ignoring "$", commas and any trailing "*" (e.g. 121.00)
- orders: the Orders count as an integer, ignoring commas (e.g. 50)
- kenp: the KENP (also labelled "KENP Read" or "Pages") count as an integer, ignoring commas (e.g. 19753)
If a value shows a dash or is missing, return 0.`,
      DashboardSchema,
    )
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('KDP extraction timed out after 60s')), 60_000),
    )
    const result = await Promise.race([extractPromise, timeoutPromise])

    const monthKey = currentMonthKey()

    // 7. Upsert aggregate row — overwrites any prior browserbase row for this month
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
        units:     result.orders,
        kenp:      result.kenp,
        royalties: result.royalties,
      },
      create: {
        userId,
        asin:      'ALL_BOOKS',
        title:     'All Books (Dashboard Total)',
        date:      `${monthKey}-01`,
        units:     result.orders,
        kenp:      result.kenp,
        royalties: result.royalties,
        format:    'ebook',
        source:    'browserbase',
        monthKey,
      },
    })

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
        rowsFetched: 1,
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
