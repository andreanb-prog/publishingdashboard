// Shared Meta Graph API helpers — used by /api/meta/sync and /api/extension/meta-trigger
import type { MetaAd } from '@/types'

export const GRAPH = 'https://graph.facebook.com/v21.0'

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

async function pollAsyncJob(reportRunId: string, token: string, retries = 3): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch(
      `${GRAPH}/${reportRunId}?fields=async_status,async_percent_completion&access_token=${token}`
    )
    const statusData = await statusRes.json()
    console.log(`[Meta] Async job ${reportRunId} poll ${i + 1}/${retries}:`, statusData.async_status, `${statusData.async_percent_completion ?? 0}%`)

    if (statusData.async_status === 'Job Complete') {
      const resultsRes = await fetch(`${GRAPH}/${reportRunId}/insights?access_token=${token}`)
      const resultsData = await resultsRes.json()
      console.log('[Meta] Async results fetched:', (resultsData.data ?? []).length, 'rows')
      return resultsData.data ?? []
    }
    if (statusData.async_status === 'Job Failed') {
      console.error('[Meta] Async job failed:', statusData)
      return []
    }
  }
  console.warn('[Meta] Async job timed out after', retries, 'polls')
  return []
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

export async function fetchAccountAds(token: string, accountId: string): Promise<MetaAd[]> {
  const insightsUrl = new URL(`${GRAPH}/${accountId}/insights`)
  const today = new Date().toISOString().split('T')[0]
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  insightsUrl.searchParams.set('level', 'ad')
  insightsUrl.searchParams.set('time_range', JSON.stringify({ since, until: today }))
  insightsUrl.searchParams.set('fields', INSIGHTS_FIELDS)
  insightsUrl.searchParams.set('limit', '100')
  insightsUrl.searchParams.set('access_token', token)

  console.log(`[Meta] Insights URL: ${insightsUrl.toString().replace(token, 'TOKEN_REDACTED')}`)

  const res = await fetch(insightsUrl.toString())
  const json = await res.json()

  console.log(`[Meta] Raw response for ${accountId}:`, JSON.stringify(json).slice(0, 800))

  if (json.error) {
    const code = json.error.code
    const msg = json.error.message
    console.error(`[Meta] Insights error for ${accountId} — code ${code}:`, msg)
    if (code === 190) throw new Error('TOKEN_EXPIRED')
    if (code === 200 && (msg?.includes('ads_read') || msg?.includes('ads_management'))) {
      throw new Error('PERMISSION_DENIED')
    }
    throw new Error(`Meta API error ${code}: ${msg}`)
  }

  if (json.report_run_id) {
    console.log(`[Meta] ${accountId} returned async job: ${json.report_run_id}`)
    const rows = await pollAsyncJob(json.report_run_id, token)
    return parseInsightsRows(rows)
  }

  if (!json.data || json.data.length === 0) {
    console.log(`[Meta] ${accountId}: no data in last_30_days`)
    return []
  }

  console.log(`[Meta] ${accountId}: ${json.data.length} ads returned`)
  return parseInsightsRows(json.data)
}
