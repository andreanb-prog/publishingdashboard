// lib/browserbase/meta-sync.ts
// Server-side Meta Ads sync via Browserbase + Stagehand.
// Opens Ads Manager with the date range set VIA URL PARAMS (no fragile picker
// clicking — the lesson from the KDP backfill), verifies the displayed range,
// and extracts per-campaign this-month rows matching the Ads Manager table.
//
// URL facts verified against the live Ads Manager (Jul 2026):
//   - ?act=<adAccountId> selects the ad account
//   - ?date=YYYY-MM-DD_YYYY-MM-DD sets the range, BUT the end date is
//     EXCLUSIVE-ish: date=2026-06-01_2026-06-30 renders "Jun 1 – Jun 29".
//     Passing end+1 (the 1st of the next month) renders the full month.
import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, META_ADSMANAGER_URL } from '@/lib/browserbase'

const CampaignRowSchema = z.object({
  name:        z.string(),
  delivery:    z.string(),   // e.g. "Active", "Off", "In draft"
  spend:       z.number(),   // Amount spent (USD)
  results:     z.number(),   // Results column (e.g. landing page views)
  reach:       z.number(),
  impressions: z.number(),
  linkClicks:  z.number(),
  ctr:         z.number(),   // CTR (link click-through rate), percent
  cpc:         z.number(),   // CPC (cost per link click), USD
})

const AdsManagerSchema = z.object({
  dateLabel: z.string(),     // the EXACT text shown by the date range selector
  campaigns: z.array(CampaignRowSchema),
})

function monthKeyNow(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Builds the Ads Manager URL for a full-month view of monthKey.
// End date passed as the 1st of the NEXT month (see URL facts above).
function adsManagerUrlForMonth(adAccountId: string | null, monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const next = new Date(y, m, 1) // first of next month
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
  const params = new URLSearchParams()
  if (adAccountId) params.set('act', adAccountId.replace(/^act_/, ''))
  params.set('date', `${monthKey}-01_${end}`)
  return `${META_ADSMANAGER_URL}?${params.toString()}`
}

// Does the displayed date label plausibly cover the target month?
// Accepts "Jul 1, 2026 – Jul 31, 2026", "This month", "July 2026" variants.
function dateLabelMatchesMonth(label: string, monthKey: string): boolean {
  const lower = label.toLowerCase()
  const [y, m] = monthKey.split('-').map(Number)
  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' }).toLowerCase()
  const mon3 = monthName.slice(0, 3)
  if (lower.includes('this month')) return true
  if (lower.includes(mon3) && lower.includes(String(y))) return true
  return false
}

export async function syncMetaForUser(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { metaContextId: true, metaAdAccountId: true },
  })

  if (!user?.metaContextId) {
    await db.syncLog.create({
      data: {
        userId, source: 'meta', status: 'failed',
        errorType: 'no_context',
        errorDetail: 'No metaContextId stored for this user. Connect Meta first.',
      },
    })
    return
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    await db.syncLog.create({
      data: {
        userId, source: 'meta', status: 'failed',
        errorType: 'config_missing',
        errorDetail: 'BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID not set.',
      },
    })
    return
  }

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    disablePino: true, // pino-pretty is unavailable in serverless — crashes at construction
    verbose: 0,
    logger: (line) => {
      try { console.log('[stagehand-meta]', typeof line === 'string' ? line : JSON.stringify(line)) } catch { /* ignore */ }
    },
    browserbaseSessionCreateParams: {
      projectId: cfg.projectId,
      // Residential proxy: Facebook white-screens datacenter IPs (see
      // createLiveSessionForUrl). The sync needs the same treatment or Ads
      // Manager may refuse to render.
      proxies: true,
      browserSettings: {
        context: { id: user.metaContextId, persist: true },
      },
    },
  })

  let bbSessionId: string | undefined
  let syncLogId: string | undefined

  try {
    await Promise.race([
      stagehand.init(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stagehand init/connect timed out after 90s')), 90_000),
      ),
    ])
    bbSessionId = stagehand.browserbaseSessionID ?? undefined

    const syncLogEntry = await db.syncLog.create({
      data: { userId, source: 'meta', status: 'failed', sessionId: bbSessionId },
    })
    syncLogId = syncLogEntry.id

    const page = stagehand.context.activePage()
    if (!page) throw new Error('No active page in Browserbase session')

    const monthKey = monthKeyNow()
    const targetUrl = adsManagerUrlForMonth(user.metaAdAccountId, monthKey)
    await page.goto(targetUrl, { waitUntil: 'load', timeoutMs: 20_000 })
    // Ads Manager is a heavy SPA — give the campaign table time to render.
    await page.waitForTimeout(8000)

    // Login/checkpoint bounce = session expired → needs re-login, not a crash.
    const currentUrl = page.url().toLowerCase()
    if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || currentUrl.includes('two_step_verification')) {
      await db.user.update({ where: { id: userId }, data: { metaSyncStatus: 'needs_reauth' } })
      await db.syncLog.update({
        where: { id: syncLogEntry.id },
        data: {
          status: 'expired', completedAt: new Date(),
          errorType: 'session_expired',
          errorDetail: `Redirected to login: ${page.url()}`,
        },
      })
      return
    }

    // Extract the campaign table + the displayed date range (60s hard timeout).
    const extractPromise = stagehand.extract(
      `On this Meta Ads Manager Campaigns page, return:
- dateLabel: the EXACT text shown in the date range selector near the top right (e.g. "Jul 1, 2026 – Jul 31, 2026" or "This month"). Copy verbatim.
- campaigns: one entry per row of the campaign table (skip the totals/results footer row). For each row:
  - name: the campaign name
  - delivery: the delivery status text (e.g. "Active", "Off", "In draft")
  - spend: Amount spent in USD as a number, 0 if blank or "—"
  - results: the Results count as a number, 0 if blank
  - reach: Reach as a number ignoring commas, 0 if blank
  - impressions: Impressions as a number ignoring commas, 0 if blank
  - linkClicks: Link clicks as a number, 0 if blank
  - ctr: CTR (link click-through rate) as a number without the % sign, 0 if blank
  - cpc: CPC (cost per link click) in USD as a number, 0 if blank
If the table shows no campaigns at all, return an empty campaigns array.`,
      AdsManagerSchema,
    )
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Meta extraction timed out after 60s')), 60_000),
    )
    const result = await Promise.race([extractPromise, timeoutPromise])

    // VERIFY before writing — never store numbers for a range we can't confirm.
    if (!dateLabelMatchesMonth(result.dateLabel, monthKey)) {
      throw new Error(`Date range not verified: selector shows "${result.dateLabel}", expected ${monthKey} — no data written`)
    }

    // Upsert one row per campaign for this month (source=browserbase, monthKey set).
    const monthDate = new Date(`${monthKey}-01T00:00:00.000Z`)
    let rows = 0
    for (const c of result.campaigns) {
      if (!c.name) continue
      await db.metaAdData.upsert({
        where: {
          userId_campaignName_source_monthKey: {
            userId, campaignName: c.name, source: 'browserbase', monthKey,
          },
        },
        update: {
          date: monthDate,
          spend: c.spend, impressions: c.impressions, clicks: c.linkClicks,
          ctr: c.ctr, cpc: c.cpc, results: c.results, reach: c.reach,
          costPerResult: c.results > 0 ? c.spend / c.results : null,
        },
        create: {
          userId, campaignName: c.name, source: 'browserbase', monthKey,
          date: monthDate,
          spend: c.spend, impressions: c.impressions, clicks: c.linkClicks,
          ctr: c.ctr, cpc: c.cpc, results: c.results, reach: c.reach,
          costPerResult: c.results > 0 ? c.spend / c.results : null,
        },
      })
      rows++
    }

    await db.user.update({ where: { id: userId }, data: { metaLastSync: new Date(), metaSyncStatus: 'connected' } })
    await db.syncLog.update({
      where: { id: syncLogEntry.id },
      data: { status: 'success', completedAt: new Date(), rowsFetched: rows },
    })
    console.log(`[meta-sync] ${userId}: ${rows} campaigns for ${monthKey} ("${result.dateLabel}")`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (syncLogId) {
      await db.syncLog.update({
        where: { id: syncLogId },
        data: { status: 'failed', completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000) },
      }).catch(() => undefined)
    } else {
      await db.syncLog.create({
        data: {
          userId, source: 'meta', status: 'failed', sessionId: bbSessionId,
          completedAt: new Date(), errorType: 'sync_error', errorDetail: msg.slice(0, 1000),
        },
      })
    }
  } finally {
    try { await stagehand.close() } catch { /* ignore */ }
  }
}
