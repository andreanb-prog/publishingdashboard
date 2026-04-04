// app/api/meta/sync/route.ts — Pull Meta Ads data for a user
// API version: v21.0 (minimum required for current Insights API)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await req.json().catch(() => {}) // consume body

  console.log('=== META SYNC START ===')

  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "metaAccessToken", "metaAdAccountId", "metaTokenExpires" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    )
    const user = rows[0]

    console.log('Token exists:', !!user?.metaAccessToken)
    console.log('Token first 20 chars:', user?.metaAccessToken?.slice(0, 20) ?? 'none')
    console.log('Stored metaAdAccountId:', user?.metaAdAccountId ?? 'none')

    if (!user?.metaAccessToken) {
      console.log('[Meta Sync] No token found — aborting')
      return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
    }

    if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
      console.log('[Meta Sync] Token expired at', user.metaTokenExpires)
      return NextResponse.json({ error: 'Meta token expired — reconnect in Settings' }, { status: 401 })
    }

    const token = user.metaAccessToken

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
        await db.$executeRawUnsafe(
          `UPDATE "User" SET "metaAccessToken" = NULL, "metaTokenExpires" = NULL WHERE "id" = $1`,
          session.user.id
        )
        return NextResponse.json({ error: 'Token expired — please reconnect Meta Ads' }, { status: 401 })
      }
      return NextResponse.json({ error: meData.error.message || 'Token invalid' }, { status: 401 })
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

    // ── Step 3: Discover all ad accounts ──────────────────────────────────────
    const discovered: { id: string; name: string; amount_spent?: string }[] = []

    // Path 1: direct ad accounts on the user
    try {
      const res = await fetch(`${GRAPH}/me/adaccounts?fields=id,name,amount_spent&limit=50&access_token=${token}`)
      const json = await res.json()
      if (json.error) {
        console.error('[Meta Sync] /me/adaccounts error:', json.error)
      } else {
        console.log(`[Meta Sync] Path 1 (/me/adaccounts): ${(json.data ?? []).length} accounts`)
        for (const a of (json.data ?? [])) discovered.push(a)
      }
    } catch (e) {
      console.error('[Meta Sync] Path 1 failed:', e)
    }

    // Path 2: business portfolio ad accounts
    try {
      const bizRes = await fetch(`${GRAPH}/me/businesses?fields=id,name&limit=50&access_token=${token}`)
      const bizJson = await bizRes.json()
      if (bizJson.error) {
        console.error('[Meta Sync] /me/businesses error:', bizJson.error)
      } else {
        const businesses: { id: string; name: string }[] = bizJson.data ?? []
        console.log(`[Meta Sync] Path 2: found ${businesses.length} businesses`)
        for (const biz of businesses) {
          try {
            const acctRes = await fetch(`${GRAPH}/${biz.id}/owned_ad_accounts?fields=id,name,amount_spent&limit=50&access_token=${token}`)
            const acctJson = await acctRes.json()
            if (!acctJson.error) {
              console.log(`  Business "${biz.name}" (${biz.id}): ${(acctJson.data ?? []).length} owned accounts`)
              for (const a of (acctJson.data ?? [])) discovered.push(a)
            }
          } catch (e) {
            console.error(`  Business ${biz.id} owned_ad_accounts failed:`, e)
          }
        }
      }
    } catch (e) {
      console.error('[Meta Sync] Path 2 failed:', e)
    }

    // Path 3: Instagram-linked ad accounts
    try {
      const igRes = await fetch(`${GRAPH}/me/instagram_accounts?fields=id,name&limit=50&access_token=${token}`)
      const igJson = await igRes.json()
      if (igJson.error) {
        console.log('[Meta Sync] /me/instagram_accounts:', igJson.error.message)
      } else {
        const igAccounts: { id: string; name: string }[] = igJson.data ?? []
        console.log(`[Meta Sync] Path 3 (/me/instagram_accounts): ${igAccounts.length} accounts`)
        for (const ig of igAccounts) {
          try {
            const adRes = await fetch(`${GRAPH}/${ig.id}/adaccounts?fields=id,name,amount_spent&access_token=${token}`)
            const adJson = await adRes.json()
            if (!adJson.error) {
              console.log(`  Instagram "${ig.name}" (${ig.id}): ${(adJson.data ?? []).length} ad accounts`)
              for (const a of (adJson.data ?? [])) discovered.push(a)
            }
          } catch (e) {
            console.error(`  Instagram ${ig.id} adaccounts failed:`, e)
          }
        }
      }
    } catch (e) {
      console.error('[Meta Sync] Path 3 failed:', e)
    }

    console.log(`[Meta Sync] All discovered accounts (${discovered.length}):`)
    for (const a of discovered) {
      const id = a.id.startsWith('act_') ? a.id : `act_${a.id}`
      console.log(`  ${id}  name="${a.name}"  amount_spent=${a.amount_spent ?? '?'}`)
    }

    // Build deduplicated list — always try the known Elle Wilder account first
    const seen = new Set<string>()
    const allAccounts: { id: string; name: string }[] = []

    const addAccount = (rawId: string, name: string) => {
      const id = rawId.startsWith('act_') ? rawId : `act_${rawId}`
      if (!seen.has(id)) { seen.add(id); allAccounts.push({ id, name }) }
    }

    // Stored account first (user's explicit selection), then anything discovered via OAuth
    if (user.metaAdAccountId) addAccount(user.metaAdAccountId, 'stored account')
    for (const a of discovered) addAccount(a.id, a.name)

    console.log(`[Meta Sync] Will try ${allAccounts.length} accounts: ${allAccounts.map(a => a.id).join(', ')}`)

    // No ad accounts discovered at all → wrong FB account connected
    if (allAccounts.length === 0) {
      console.log('[Meta Sync] No ad accounts found — aborting with user-facing error')
      return NextResponse.json({
        error: 'No ad account found. Make sure you\'re connecting the Facebook account that has your Ads Manager. Disconnect and try again with the correct account.',
        code: 'NO_AD_ACCOUNT',
      }, { status: 400 })
    }

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
      await db.$executeRawUnsafe(
        `UPDATE "User" SET "metaAdAccountId" = $1 WHERE "id" = $2`,
        bestAccountId,
        session.user.id
      )
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

    await db.$executeRawUnsafe(
      `UPDATE "User" SET "metaLastSync" = NOW() WHERE "id" = $1`,
      session.user.id
    )

    console.log('=== META SYNC COMPLETE ===')
    return NextResponse.json({ success: true, data })
  } catch (err) {
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
