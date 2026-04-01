// lib/parsers/meta.ts
import Papa from 'papaparse'
import type { MetaData, MetaAd } from '@/types'

export function parseMetaFile(csvText: string): MetaData {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  })

  const rows = result.data as any[]

  // Log available headers to help debug column mismatches
  if (rows.length > 0) {
    console.log('[Meta parser] CSV headers found:', Object.keys(rows[0]))
  }

  // Flexible column-name resolver — tries multiple variants in order
  function col(row: any, ...keys: string[]): string | number {
    for (const k of keys) {
      if (row[k] != null && row[k] !== '') return row[k]
    }
    return 0
  }

  // Filter to rows that have ad names (skip summary/blank rows)
  const adRows = rows.filter((r) => {
    const name = r['Ad name'] ?? r['Ad Name'] ?? r['Ad set name'] ?? ''
    return String(name).trim() !== ''
  })

  // Group by ad name, sum across date ranges
  const adMap = new Map<string, {
    spend: number; clicks: number; impressions: number; reach: number; ctrs: number[]; cpcs: number[]
  }>()

  for (const row of adRows) {
    const name = String(col(row, 'Ad name', 'Ad Name', 'Ad set name', 'Campaign name')).trim()
    const spend = Number(col(row,
      'Amount spent (USD)', 'Amount spent', 'Spend', 'Cost'))
    const clicks = Number(col(row,
      'Clicks (all)', 'Link clicks', 'Clicks', 'Results'))
    const impressions = Number(col(row, 'Impressions'))
    const reach = Number(col(row, 'Reach'))
    const ctr = Number(col(row,
      'CTR (all)', 'CTR (link click-through rate)', 'CTR'))
    const cpc = Number(col(row,
      'CPC (all) (USD)', 'CPC (cost per link click) (USD)', 'CPC (all)', 'CPC'))

    if (!adMap.has(name)) {
      adMap.set(name, { spend: 0, clicks: 0, impressions: 0, reach: 0, ctrs: [], cpcs: [] })
    }
    const ad = adMap.get(name)!
    ad.spend += spend
    ad.clicks += clicks
    ad.impressions += impressions
    ad.reach = Math.max(ad.reach, reach)
    if (ctr > 0) ad.ctrs.push(ctr)
    if (cpc > 0) ad.cpcs.push(cpc)
  }

  const ads: MetaAd[] = Array.from(adMap.entries()).map(([name, data]) => {
    const avgCTR = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
    const avgCPC = data.clicks > 0 ? data.spend / data.clicks : 0
    const isVideo = name.toLowerCase().includes('video') || name.toLowerCase().includes('pulse')

    let status: MetaAd['status']
    if (isVideo && data.clicks === 0) {
      status = 'DELETE'
    } else if (data.clicks === 0 && data.spend > 0) {
      status = 'CUT'
    } else if (data.impressions < 10 || data.clicks < 3) {
      status = 'LOW_DATA'
    } else if (avgCTR >= 15) {
      status = 'SCALE'
    } else if (avgCTR >= 8) {
      status = 'WATCH'
    } else {
      status = 'CUT'
    }

    return {
      name,
      spend: Math.round(data.spend * 100) / 100,
      clicks: data.clicks,
      impressions: data.impressions,
      ctr: Math.round(avgCTR * 10) / 10,
      cpc: Math.round(avgCPC * 100) / 100,
      reach: data.reach,
      status,
    }
  }).sort((a, b) => b.ctr - a.ctr)

  const totalSpend = ads.reduce((s, a) => s + a.spend, 0)
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0)
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0

  const bestAd = ads.find(a => a.status === 'SCALE') || null
  const worstAds = ads.filter(a => a.status === 'DELETE' || a.status === 'CUT')

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalImpressions,
    avgCTR: Math.round(avgCTR * 10) / 10,
    avgCPC: Math.round(avgCPC * 100) / 100,
    ads,
    bestAd,
    worstAds,
  }
}
