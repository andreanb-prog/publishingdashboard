// app/api/meta/data/route.ts — fetch Meta Ads data for a specific date range
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'

const GRAPH = 'https://graph.facebook.com/v21.0'

// Query uploaded MetaAdData rows from DB, aggregate into MetaData, and return
async function respondFromDB(userId: string, startDate: string, endDate: string) {
  const start = new Date(startDate + 'T00:00:00.000Z')
  const end   = new Date(endDate   + 'T23:59:59.999Z')

  console.log('[Meta data] querying DB:', { startDate, endDate, startUTC: start.toISOString(), endUTC: end.toISOString() })

  // Check if the user's entire MetaAdData has only 1 distinct date (aggregated/summary upload)
  const allUserDates = await db.metaAdData.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: 'asc' },
  })
  const distinctDates = new Set(allUserDates.map(r => r.date.toISOString().split('T')[0]))
  const isAggregated = distinctDates.size <= 1 && allUserDates.length > 0

  const dbRows = await db.metaAdData.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  })

  console.log(`[Meta data] DB returned ${dbRows.length} rows, isAggregated=${isAggregated}`)

  if (dbRows.length === 0) {
    // Return the actual date range of stored data so the UI can offer a one-click switch
    const [oldest, newest] = [
      allUserDates[0] ?? null,
      allUserDates[allUserDates.length - 1] ?? null,
    ]
    const availableRange = oldest && newest ? {
      start: oldest.date.toISOString().split('T')[0],
      end:   newest.date.toISOString().split('T')[0],
    } : null
    return NextResponse.json({ data: null, message: 'No data for this date range.', availableRange, isAggregated })
  }

  // Group by campaignName, summing spend/clicks/impressions across days
  const campaignMap = new Map<string, { spend: number; clicks: number; impressions: number; ctrs: number[]; cpcs: number[]; results: number; costPerResult: number | null }>()
  for (const row of dbRows) {
    if (!campaignMap.has(row.campaignName)) {
      campaignMap.set(row.campaignName, { spend: 0, clicks: 0, impressions: 0, ctrs: [], cpcs: [], results: 0, costPerResult: null })
    }
    const c = campaignMap.get(row.campaignName)!
    c.spend       += row.spend
    c.clicks      += row.clicks
    c.impressions += row.impressions
    if (row.ctr > 0) c.ctrs.push(row.ctr)
    if (row.cpc > 0) c.cpcs.push(row.cpc)
    if (row.results != null) c.results += row.results
    if (row.costPerResult != null) c.costPerResult = row.costPerResult
  }

  const ads: MetaAd[] = Array.from(campaignMap.entries()).map(([name, d]) => {
    const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0
    const cpc = d.clicks > 0 ? d.spend / d.clicks : 0

    let status: MetaAd['status'] = 'LOW_DATA'
    if (d.spend > 5 && d.clicks > 10) {
      if (ctr >= 2)      status = 'SCALE'
      else if (ctr >= 1) status = 'WATCH'
      else               status = 'CUT'
    }

    return {
      name,
      spend:        Math.round(d.spend * 100) / 100,
      clicks:       d.clicks,
      impressions:  d.impressions,
      ctr:          Math.round(ctr * 10) / 10,
      cpc:          Math.round(cpc * 100) / 100,
      reach:        0,
      status,
      results:      d.results > 0 ? d.results : undefined,
      costPerResult: d.costPerResult ?? undefined,
    }
  }).sort((a, b) => b.ctr - a.ctr)

  const totalSpend       = ads.reduce((s, a) => s + a.spend, 0)
  const totalClicks      = ads.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0)
  const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
  const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0

  const sorted   = [...ads].sort((a, b) => b.ctr - a.ctr)
  const bestAd   = sorted[0] || null
  const worstAds = [...ads].sort((a, b) => a.ctr - b.ctr).filter(a => a.spend > 5).slice(0, 3)

  const data: MetaData = {
    totalSpend:       Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalImpressions,
    avgCTR,
    avgCPC,
    ads,
    bestAd,
    worstAds,
  }

  return NextResponse.json({ data, isAggregated })
}

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
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate   = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { metaAccessToken: true, metaAdAccountId: true, metaTokenExpires: true },
    })

    // If no Meta token or token expired, fall back to uploaded data in MetaAdData DB
    const hasLiveToken = user?.metaAccessToken &&
      (!user.metaTokenExpires || new Date(user.metaTokenExpires) >= new Date())

    if (!hasLiveToken) {
      return respondFromDB(session.user.id, startDate, endDate)
    }

    const token = user!.metaAccessToken as string
    const HARDCODED_ACCOUNT_ID = 'act_940232825191906'

    const allAds: MetaAd[] = []

    try {
      const ads = await fetchAccountAds(token, HARDCODED_ACCOUNT_ID, startDate, endDate)
      allAds.push(...ads)
    } catch (err) {
      console.error(`[Meta Data] Error fetching ${HARDCODED_ACCOUNT_ID}:`, err)
    }

    // If live API returned nothing, fall back to uploaded DB data
    if (allAds.length === 0) {
      return respondFromDB(session.user.id, startDate, endDate)
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
