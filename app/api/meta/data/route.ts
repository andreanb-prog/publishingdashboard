// app/api/meta/data/route.ts — fetch Meta Ads data for a specific date range
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'

const GRAPH = 'https://graph.facebook.com/v21.0'

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate   = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

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
    const HARDCODED_ACCOUNT_ID = 'act_940232825191906'

    const allAds: MetaAd[] = []

    try {
      const ads = await fetchAccountAds(token, HARDCODED_ACCOUNT_ID, startDate, endDate)
      allAds.push(...ads)
    } catch (err) {
      console.error(`[Meta Data] Error fetching ${HARDCODED_ACCOUNT_ID}:`, err)
    }

    if (allAds.length === 0) {
      return NextResponse.json({
        data: null,
        message: 'No ad data found for this date range.',
      })
    }

    const totalSpend      = allAds.reduce((s, a) => s + a.spend, 0)
    const totalClicks     = allAds.reduce((s, a) => s + a.clicks, 0)
    const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0)
    const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
    const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0

    const sorted   = [...allAds].sort((a, b) => b.ctr - a.ctr)
    const bestAd   = sorted[0] || null
    const worstAds = [...allAds].sort((a, b) => a.ctr - b.ctr).filter(a => a.spend > 5).slice(0, 3)

    const data: MetaData = {
      totalSpend:       Math.round(totalSpend * 100) / 100,
      totalClicks,
      totalImpressions,
      avgCTR,
      avgCPC,
      ads:      allAds,
      bestAd,
      worstAds,
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[Meta Data] Unhandled error:', err)
    return NextResponse.json({ error: 'Failed to fetch Meta data' }, { status: 500 })
  }
}

async function pollAsyncJob(reportRunId: string, token: string, retries = 3): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes  = await fetch(`${GRAPH}/${reportRunId}?fields=async_status,async_percent_completion&access_token=${token}`)
    const statusData = await statusRes.json()
    if (statusData.async_status === 'Job Complete') {
      const resultsRes  = await fetch(`${GRAPH}/${reportRunId}/insights?access_token=${token}`)
      const resultsData = await resultsRes.json()
      return resultsData.data ?? []
    }
    if (statusData.async_status === 'Job Failed') return []
  }
  return []
}

async function fetchAccountAds(token: string, accountId: string, since: string, until: string): Promise<MetaAd[]> {
  const insightsUrl = new URL(`${GRAPH}/${accountId}/insights`)
  insightsUrl.searchParams.set('level', 'ad')
  insightsUrl.searchParams.set('time_range', JSON.stringify({ since, until }))
  insightsUrl.searchParams.set('fields', INSIGHTS_FIELDS)
  insightsUrl.searchParams.set('limit', '100')
  insightsUrl.searchParams.set('access_token', token)

  const res  = await fetch(insightsUrl.toString())
  const json = await res.json()

  if (json.error) {
    const code = json.error.code
    if (code === 190) throw new Error('TOKEN_EXPIRED')
    throw new Error(`Meta API error ${code}: ${json.error.message}`)
  }

  if (json.report_run_id) {
    const rows = await pollAsyncJob(json.report_run_id, token)
    return parseInsightsRows(rows)
  }

  if (!json.data || json.data.length === 0) return []

  return parseInsightsRows(json.data)
}

function parseInsightsRows(rows: any[]): MetaAd[] {
  return rows.map((c: any) => {
    const spend       = parseFloat(c.spend || '0')
    const clicks      = parseInt(c.clicks || '0')
    const impressions = parseInt(c.impressions || '0')
    const ctr         = parseFloat(c.ctr || '0')
    const cpc         = parseFloat(c.cpc || '0')
    const reach       = parseInt(c.reach || '0')

    let status: MetaAd['status'] = 'LOW_DATA'
    if (spend > 5 && clicks > 10) {
      if (ctr >= 2)      status = 'SCALE'
      else if (ctr >= 1) status = 'WATCH'
      else               status = 'CUT'
    }

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
      uniqueCtr:    parseFloat(c.unique_ctr || '0'),
      frequency:    parseFloat(c.frequency || '0'),
    }
  })
}
