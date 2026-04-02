// app/api/meta/sync/route.ts — Pull Meta Ads data for a user
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

// Known fallback account (Elle Wilder Books) — tried if /me/adaccounts returns nothing useful
const FALLBACK_ACCOUNT_ID = 'act_898774062895926'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await req.json().catch(() => {}) // consume body

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

    // ── Discover all ad accounts with spend info ──────────────────────────────
    const accountsRes = await fetch(
      `${GRAPH_URL}/me/adaccounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`
    )
    const accountsJson = await accountsRes.json()

    if (accountsJson.error) {
      console.error('[Meta Sync] /me/adaccounts error:', accountsJson.error)
      return NextResponse.json({ error: accountsJson.error.message || 'Failed to fetch ad accounts' }, { status: 400 })
    }

    const discovered: { id: string; name: string; account_status: number; amount_spent?: string }[] =
      accountsJson.data || []

    console.log(`[Meta Sync] Found ${discovered.length} ad accounts via /me/adaccounts:`)
    for (const a of discovered) {
      const id = a.id.startsWith('act_') ? a.id : `act_${a.id}`
      console.log(`  ${id}  name="${a.name}"  amount_spent=${a.amount_spent ?? '?'}  status=${a.account_status}`)
    }

    // Build deduplicated list — always include the known Elle Wilder account + stored ID
    const seen = new Set<string>()
    const allAccounts: { id: string; name: string }[] = []

    function addAccount(rawId: string, name: string) {
      const id = rawId.startsWith('act_') ? rawId : `act_${rawId}`
      if (!seen.has(id)) { seen.add(id); allAccounts.push({ id, name }) }
    }

    // Prefer the known account first so it's tried before any others
    addAccount(FALLBACK_ACCOUNT_ID, 'Elle Wilder Books (hardcoded)')
    for (const a of discovered) addAccount(a.id, a.name)
    if (user.metaAdAccountId) addAccount(user.metaAdAccountId, 'stored account')

    console.log(`[Meta Sync] Will try ${allAccounts.length} accounts: ${allAccounts.map(a => a.id).join(', ')}`)

    // ── Fetch insights from each account, use date_preset=last_30_days ────────
    const allAds: MetaAd[] = []
    let totalSpend = 0
    let bestAccountId: string | null = null
    let bestAccountSpend = -1

    for (const account of allAccounts) {
      try {
        const ads = await fetchAccountAds(token, account.id)
        const accountSpend = ads.reduce((s, a) => s + a.spend, 0)
        console.log(`[Meta Sync] ${account.id} ("${account.name}"): ${ads.length} campaigns, $${accountSpend.toFixed(2)} spend`)
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

    console.log(`[Meta Sync] Total: ${allAds.length} campaigns, $${totalSpend.toFixed(2)} spend. Best account: ${bestAccountId}`)

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

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[Meta Sync] Error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

async function fetchAccountAds(token: string, accountId: string): Promise<MetaAd[]> {
  // Use date_preset=last_30_days — always pulls the last 30 real days of data
  // regardless of the current date in the month
  const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc,reach,unique_clicks,unique_ctr,frequency'
  const url = `${GRAPH_URL}/${accountId}/insights?fields=${fields}&date_preset=last_30_days&level=campaign&limit=100&access_token=${token}`

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
