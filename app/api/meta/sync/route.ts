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
    // Get user's Meta credentials
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "metaAccessToken", "metaAdAccountId", "metaTokenExpires" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    )
    const user = rows[0]

    if (!user?.metaAccessToken || !user?.metaAdAccountId) {
      return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
    }

    // Check token expiration
    if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
      return NextResponse.json({ error: 'Meta token expired — reconnect in Settings' }, { status: 401 })
    }

    const data = await fetchMetaAds(user.metaAccessToken, user.metaAdAccountId, days)

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

async function fetchMetaAds(token: string, adAccountId: string, days: number): Promise<MetaData> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const until = new Date().toISOString().split('T')[0]

  const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc,reach,actions,unique_clicks,unique_ctr,frequency'
  const url = `${GRAPH_URL}/${adAccountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=100&access_token=${token}`

  console.log('[Meta Sync] Fetching:', adAccountId, 'days:', days)
  const res = await fetch(url)
  const json = await res.json()

  if (json.error) {
    console.error('[Meta Sync] API error:', json.error)
    throw new Error(json.error.message || 'Meta API error')
  }

  const campaigns = json.data || []
  console.log('[Meta Sync] Got', campaigns.length, 'campaigns')

  const ads: MetaAd[] = campaigns.map((c: any) => {
    const spend = parseFloat(c.spend || '0')
    const clicks = parseInt(c.clicks || '0')
    const impressions = parseInt(c.impressions || '0')
    const ctr = parseFloat(c.ctr || '0')
    const cpc = parseFloat(c.cpc || '0')
    const reach = parseInt(c.reach || '0')

    // Determine status
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

  const totalSpend = ads.reduce((s, a) => s + a.spend, 0)
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0)
  const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
  const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0

  const sorted = [...ads].sort((a, b) => b.ctr - a.ctr)
  const bestAd = sorted[0] || null
  const worstAds = [...ads].sort((a, b) => a.ctr - b.ctr).filter(a => a.spend > 5).slice(0, 3)

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalImpressions,
    avgCTR,
    avgCPC,
    ads,
    bestAd,
    worstAds,
  }
}
