// app/api/meta/sync/route.ts — Pull Meta Ads data for a user
// API version: v21.0 (minimum required for current Insights API)
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { metaSyncLimiter, checkRateLimit, RATE_LIMIT_RESPONSE } from '@/lib/ratelimit'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'

const GRAPH = 'https://graph.facebook.com/v21.0'

// Insights fields for ad-level query
const INSIGHTS_FIELDS = [
  'ad_name',
  'adset_name',
  'campaign_name',
  'spend',
  'clicks',
  'ctr',
  'cpc',
  'reach',
  'impressions',
  'unique_clicks',
  'unique_ctr',
  'frequency',
].join(',')

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { limited } = await checkRateLimit(metaSyncLimiter, `meta-sync:${session.user.id}`)
  if (limited) return RATE_LIMIT_RESPONSE

  await req.json().catch(() => {}) // consume body

  console.log('=== META SYNC START ===')

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { metaAccessToken: true, metaAdAccountId: true, metaTokenExpires: true },
    })

    console.log('Token exists:', !!user?.metaAccessToken)
    console.log('Stored metaAdAccountId:', user?.metaAdAccountId ?? 'none')

    const token = user?.metaAccessToken

    if (!token) {
      return NextResponse.json({ error: 'Meta account not connected. Please reconnect in Settings.' }, { status: 401 })
    }

    if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
      console.log('[Meta Sync] Token expired at', user.metaTokenExpires)
      return NextResponse.json({ error: 'Meta token expired — reconnect in Settings' }, { status: 401 })
    }

    // ── Step 1: Validate token ──────────────────────────────────────────────────
    console.log('[Meta Sync] Step 1: validating token via /me ...')
    const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`)
    const meData = await meRes.json()
    console.log('[Meta Sync] /me response:', JSON.stringify(meData))

    if (meData.error) {
      const code = meData.error.code
      console.error('[Meta Sync] Token invalid. Code:', code, '| Message:', meData.error.message)
      if (code === 190) {
        // Expired/invalid token — clear it so the UI shows "reconnect"
        await db.user.update({
          where: { id: session.user.id },
          data: { metaAccessToken: null, metaTokenExpires: null },
        })
        return NextResponse.json({ error: 'Token expired — please reconnect Meta Ads' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Token invalid' }, { status: 401 })
    }

    // ── Step 2: Verify stored account access (if one is saved) ───────────────
    if (user.metaAdAccountId) {
      console.log('[Meta Sync] Step 2: testing stored account access ...')
      const accountTestRes = await fetch(
        `${GRAPH}/${user.metaAdAccountId}?fields=id,name,account_status&access_token=${token}`
      )
      const accountTestData = await accountTestRes.json()
      console.log('[Meta Sync] Account test:', JSON.stringify(accountTestData))
      if (accountTestData.error) {
        console.error('[Meta Sync] No access to stored account. Code:', accountTestData.error.code, '| Message:', accountTestData.error.message)
      }
    } else {
      console.log('[Meta Sync] Step 2: no stored account — skipping account test')
    }

    // ── Step 3: Use hardcoded ad account ─────────────────────────────────────
    // This account was created via Instagram and is not discoverable via /me/adaccounts
    const HARDCODED_ACCOUNT_ID = 'act_940232825191906'
    const allAccounts: { id: string; name: string }[] = [
      { id: HARDCODED_ACCOUNT_ID, name: 'Elle Wilder Ads' },
    ]
    console.log(`[Meta Sync] Using hardcoded account: ${HARDCODED_ACCOUNT_ID}`)

    // ── Step 4: Fetch insights from each account ───────────────────────────────
    const allAds: MetaAd[] = []
    let totalSpend = 0
    let bestAccountId: string | null = null
    let bestAccountSpend = -1

    for (const account of allAccounts) {
      try {
        const ads = await fetchAccountAds(token, account.id)
        const accountSpend = ads.reduce((s, a) => s + a.spend, 0)
        console.log(`[Meta Sync] ${account.id} ("${account.name}"): ${ads.length} ads, $${accountSpend.toFixed(2)} spend`)
        if (ads.length > 0) {
          allAds.push(...ads)
          totalSpend += accountSpend
          if (accountSpend > bestAccountSpend) {
            bestAccountSpend = accountSpend
            bestAccountId = account.id
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'PERMISSION_DENIED') throw err
        console.error(`[Meta Sync] Error fetching ${account.id}:`, err)
      }
    }

    console.log(`[Meta Sync] Total: ${allAds.length} ads, $${totalSpend.toFixed(2)} spend. Best account: ${bestAccountId}`)

    // Accounts were found but every one returned zero ads — almost always means the user
    // connected a personal Facebook profile that has view access to an account but no actual
    // spend data, or the linked account has no activity in the last 30 days.
    if (allAds.length === 0) {
      console.log('[Meta Sync] Zero ads across all accounts — returning descriptive error')
      return NextResponse.json({
        error: 'No ad data found in the last 30 days. If you\'re running ads, make sure you\'re connecting the Facebook account that owns your Ads Manager. Disconnect and reconnect with the correct account.',
        code: 'NO_AD_DATA',
        accountsChecked: allAccounts.map(a => a.id),
      }, { status: 400 })
    }

    // Update stored ad account to the one with the most spend
    if (bestAccountId) {
      await db.user.update({ where: { id: session.user.id }, data: { metaAdAccountId: bestAccountId } })
      console.log(`[Meta Sync] Updated metaAdAccountId to ${bestAccountId}`)
    }

    const totalClicks = allAds.reduce((s, a) => s + a.clicks, 0)
    const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0)
    const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
    const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0

    const sorted = [...allAds].sort((a, b) => b.ctr - a.ctr)
    const bestAd = sorted[0] || null
    const worstAds = [...allAds].sort((a, b) => a.ctr - b.ctr).filter(a => a.spend > 5).slice(0, 3)

    const data: MetaData = {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalClicks,
      totalImpressions,
      avgCTR,
      avgCPC,
      ads: allAds,
      bestAd,
      worstAds,
    }

    // ── Persist to Analysis table so the Meta page can display it ────────────
    const currentMonth = new Date().toISOString().slice(0, 7)
    const existing = await db.analysis.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      const existingData = (existing.data as Record<string, unknown>) || {}
      await db.analysis.update({
        where: { id: existing.id },
        data: { data: { ...existingData, meta: data } as any },
      })
      console.log(`[Meta Sync] Updated analysis ${existing.id} with ${allAds.length} ads`)
    } else {
      await db.analysis.create({
        data: {
          userId: session.user.id,
          month: currentMonth,
          data: { month: currentMonth, meta: data } as any,
        },
      })
      console.log(`[Meta Sync] Created new analysis for ${currentMonth} with ${allAds.length} ads`)
    }

    await db.user.update({ where: { id: session.user.id }, data: { metaLastSync: new Date() } })

    console.log('=== META SYNC COMPLETE ===')
    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof Error && err.message === 'PERMISSION_DENIED') {
      console.error('[Meta Sync] Permission denied — ads_read not granted for this account')
      return NextResponse.json({
        error: 'permission_denied',
        message: 'Your ad account hasn\'t granted AuthorDash read access. Disconnect and reconnect Meta to re-authorize with the correct permissions.',
      }, { status: 403 })
    }
    console.error('[Meta Sync] Unhandled error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// ── Poll an async report job until complete ──────────────────────────────────
async function pollAsyncJob(reportRunId: string, token: string, retries = 3): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch(
      `${GRAPH}/${reportRunId}?fields=async_status,async_percent_completion&access_token=${token}`
    )
    const statusData = await statusRes.json()
    console.log(`[Meta Sync] Async job ${reportRunId} poll ${i + 1}/${retries}:`, statusData.async_status, `${statusData.async_percent_completion ?? 0}%`)

    if (statusData.async_status === 'Job Complete') {
      const resultsRes = await fetch(`${GRAPH}/${reportRunId}/insights?access_token=${token}`)
      const resultsData = await resultsRes.json()
      console.log('[Meta Sync] Async results fetched:', (resultsData.data ?? []).length, 'rows')
      return resultsData.data ?? []
    }
    if (statusData.async_status === 'Job Failed') {
      console.error('[Meta Sync] Async job failed:', statusData)
      return []
    }
  }
  console.warn('[Meta Sync] Async job timed out after', retries, 'polls')
  return []
}

async function fetchAccountAds(token: string, accountId: string): Promise<MetaAd[]> {
  const insightsUrl = new URL(`${GRAPH}/${accountId}/insights`)
  const today = new Date().toISOString().split('T')[0]
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  insightsUrl.searchParams.set('level', 'ad')
  insightsUrl.searchParams.set('time_range', JSON.stringify({ since, until: today }))
  insightsUrl.searchParams.set('fields', INSIGHTS_FIELDS)
  insightsUrl.searchParams.set('limit', '100')
  insightsUrl.searchParams.set('access_token', token)

  console.log(`[Meta Sync] Insights URL: ${insightsUrl.toString().replace(token, 'TOKEN_REDACTED')}`)

  const res = await fetch(insightsUrl.toString())
  const json = await res.json()

  console.log(`[Meta Sync] Raw response for ${accountId}:`, JSON.stringify(json).slice(0, 800))

  // Case C/D: API error
  if (json.error) {
    const code = json.error.code
    const msg = json.error.message
    console.error(`[Meta Sync] Insights error for ${accountId} — code ${code}:`, msg)
    if (code === 190) throw new Error('TOKEN_EXPIRED')
    if (code === 200 && (msg?.includes('ads_read') || msg?.includes('ads_management'))) {
      throw new Error('PERMISSION_DENIED')
    }
    throw new Error(`Meta API error ${code}: ${msg}`)
  }

  // Case E: async job — poll for results
  if (json.report_run_id) {
    console.log(`[Meta Sync] ${accountId} returned async job: ${json.report_run_id}`)
    const rows = await pollAsyncJob(json.report_run_id, token)
    return parseInsightsRows(rows)
  }

  // Case B: empty data (no spend in range)
  if (!json.data || json.data.length === 0) {
    console.log(`[Meta Sync] ${accountId}: no data in last_30_days (empty result is normal if no spend)`)
    return []
  }

  // Case A: normal success
  console.log(`[Meta Sync] ${accountId}: ${json.data.length} ads returned`)
  return parseInsightsRows(json.data)
}

function parseInsightsRows(rows: any[]): MetaAd[] {
  return rows.map((c: any) => {
    const spend = parseFloat(c.spend || '0')
    const clicks = parseInt(c.clicks || '0')
    const impressions = parseInt(c.impressions || '0')
    const ctr = parseFloat(c.ctr || '0')
    const cpc = parseFloat(c.cpc || '0')
    const reach = parseInt(c.reach || '0')

    let status: MetaAd['status'] = 'LOW_DATA'
    if (spend > 5 && clicks > 10) {
      if (ctr >= 2) status = 'SCALE'
      else if (ctr >= 1) status = 'WATCH'
      else status = 'CUT'
    }

    // With level=ad, name comes from ad_name; fall back through campaign hierarchy
    const name = c.ad_name || c.adset_name || c.campaign_name || 'Untitled'

    return {
      name,
      spend,
      clicks,
      impressions,
      ctr,
      cpc,
      reach,
      status,
      uniqueClicks: parseInt(c.unique_clicks || '0'),
      uniqueCtr: parseFloat(c.unique_ctr || '0'),
      frequency: parseFloat(c.frequency || '0'),
    }
  })
}
