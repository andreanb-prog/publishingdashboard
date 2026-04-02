// app/api/meta/sync/route.ts — Pull Meta Ads data for a user
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { days = 30 } = await req.json().catch(() => ({ days: 30 }))

  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "metaAccessToken", "metaAdAccountId", "metaTokenExpires" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    )
    const user = rows[0]

    if (!user?.metaAccessToken) {
      return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
    }

    if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
      return NextResponse.json({ error: 'Meta token expired — reconnect in Settings' }, { status: 401 })
    }

    const token = user.metaAccessToken

    // ── Discover all ad accounts ──────────────────────────────────────────────
    const accountsRes = await fetch(
      `${GRAPH_URL}/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`
    )
    const accountsJson = await accountsRes.json()

    if (accountsJson.error) {
      console.error('[Meta Sync] /me/adaccounts error:', accountsJson.error)
      return NextResponse.json({ error: accountsJson.error.message || 'Failed to fetch ad accounts' }, { status: 400 })
    }

    const allAccounts: { id: string; name: string; account_status: number }[] = accountsJson.data || []
    console.log(`[Meta Sync] Found ${allAccounts.length} ad accounts:`, allAccounts.map(a => `${a.id} (${a.name})`).join(', '))

    // Also include the stored ad account ID if it's not in the list (Business Manager edge case)
    const storedId = user.metaAdAccountId
    if (storedId && !allAccounts.find(a => a.id === storedId)) {
      console.log(`[Meta Sync] Adding stored account ${storedId} not found in /me/adaccounts`)
      allAccounts.push({ id: storedId, name: 'Stored account', account_status: 1 })
    }

    if (allAccounts.length === 0) {
      console.warn('[Meta Sync] No ad accounts found — user may not have a Business ad account')
      return NextResponse.json({ error: 'No ad accounts found. Make sure your Facebook account is linked to a Business ad account.' }, { status: 400 })
    }

    // ── Fetch insights from each account, keep the one(s) with spend ─────────
    const allAds: MetaAd[] = []
    let totalSpend = 0
    let accountsWithData = 0

    for (const account of allAccounts) {
      // Ensure act_ prefix
      const accountId = account.id.startsWith('act_') ? account.id : `act_${account.id}`
      try {
        const ads = await fetchAccountAds(token, accountId, days)
        const accountSpend = ads.reduce((s, a) => s + a.spend, 0)
        console.log(`[Meta Sync] Account ${accountId} (${account.name}): ${ads.length} campaigns, $${accountSpend.toFixed(2)} spend`)
        if (ads.length > 0) {
          allAds.push(...ads)
          totalSpend += accountSpend
          accountsWithData++
        }
      } catch (err) {
        console.error(`[Meta Sync] Error fetching account ${accountId}:`, err)
      }
    }

    console.log(`[Meta Sync] Total: ${allAds.length} campaigns across ${accountsWithData} accounts with spend data`)

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
    const currentMonth = new Date().toISOString().slice(0, 7) // e.g. "2026-04"
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
      console.log(`[Meta Sync] Updated existing analysis ${existing.id} with ${allAds.length} ads`)
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

    // Update last sync time
    await db.$executeRawUnsafe(
      `UPDATE "User" SET "metaLastSync" = NOW() WHERE "id" = $1`,
      session.user.id
    )

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[Meta Sync] Error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

async function fetchAccountAds(token: string, accountId: string, days: number): Promise<MetaAd[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const until = new Date().toISOString().split('T')[0]

  const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc,reach,actions,unique_clicks,unique_ctr,frequency'
  const url = `${GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=100&access_token=${token}`

  const res = await fetch(url)
  const json = await res.json()

  if (json.error) {
    console.error(`[Meta Sync] Insights error for ${accountId}:`, json.error)
    throw new Error(json.error.message || 'Meta API error')
  }

  const campaigns = json.data || []

  return campaigns.map((c: any) => {
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

    return {
      name: c.campaign_name || 'Untitled',
      spend, clicks, impressions, ctr, cpc, reach, status,
      uniqueClicks: parseInt(c.unique_clicks || '0'),
      uniqueCtr: parseFloat(c.unique_ctr || '0'),
      frequency: parseFloat(c.frequency || '0'),
    }
  })
}
