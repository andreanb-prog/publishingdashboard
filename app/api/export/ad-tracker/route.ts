// app/api/export/ad-tracker/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'
import type { Analysis } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch data
  const [roasLogs, rankLogs, analyses] = await Promise.all([
    db.roasLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' },
      take: 180,
    }),
    db.rankLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' },
      take: 180,
    }),
    db.analysis.findMany({
      where: { userId: session.user.id },
      orderBy: { month: 'desc' },
      take: 3,
    }),
  ])

  const latestAnalysis = (analyses[0]?.data ?? null) as (Analysis & Record<string, unknown>) | null
  const meta    = latestAnalysis?.meta
  const kdp     = latestAnalysis?.kdp
  const month   = latestAnalysis?.month ?? new Date().toISOString().substring(0, 7)
  const monthLabel = new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: ROAS Log ───────────────────────────────────────────────────────
  const roasHeader = ['DATE', 'DAILY AD SPEND', 'EARNINGS', 'ROAS', 'ROI', 'NOTES']
  const roasRows = roasLogs.map(log => [
    new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    log.spend,
    log.earnings,
    log.roas,
    log.earnings - log.spend,
    log.notes ?? '',
  ])

  const totals = roasLogs.reduce((acc, l) => ({
    spend: acc.spend + l.spend,
    earnings: acc.earnings + l.earnings,
  }), { spend: 0, earnings: 0 })

  const roasSheet = XLSX.utils.aoa_to_sheet([
    [`AuthorDash Ad Tracker — ${monthLabel}`, '', '', '', '', ''],
    [],
    roasHeader,
    ...roasRows,
    [],
    ['TOTALS', totals.spend.toFixed(2), totals.earnings.toFixed(2),
      totals.spend > 0 ? (totals.earnings / totals.spend).toFixed(2) : '—',
      (totals.earnings - totals.spend).toFixed(2), ''],
  ])
  XLSX.utils.book_append_sheet(wb, roasSheet, 'ROAS Log')

  // ── Sheet 2: Meta Ads ───────────────────────────────────────────────────────
  if (meta) {
    const metaHeader = ['AD NAME', 'SPEND', 'CLICKS', 'IMPRESSIONS', 'CTR %', 'CPC', 'REACH', 'STATUS']
    const metaRows = meta.ads.map(ad => [
      ad.name,
      ad.spend,
      ad.clicks,
      ad.impressions,
      ad.ctr,
      ad.cpc,
      ad.reach,
      ad.status,
    ])
    const metaSheet = XLSX.utils.aoa_to_sheet([
      [`Meta Ads — ${monthLabel}`, '', '', '', '', '', '', ''],
      [`Total Spend: $${meta.totalSpend}`, `Total Clicks: ${meta.totalClicks}`,
       `Avg CTR: ${meta.avgCTR}%`, `Avg CPC: $${meta.avgCPC}`, '', '', '', ''],
      [],
      ['GOALS', '', '', '', '15', '0.15', '', ''],
      ['(target CTR %)', '', '', '', '', '', '', ''],
      [],
      metaHeader,
      ...metaRows,
    ])
    XLSX.utils.book_append_sheet(wb, metaSheet, 'Meta Ads')
  }

  // ── Sheet 3: KDP Summary ────────────────────────────────────────────────────
  if (kdp) {
    const kdpHeader = ['BOOK', 'UNITS', 'KENP READS', 'ROYALTIES ($)', 'EST. KU EARNINGS ($)']
    const kdpRows = kdp.books.map(b => [
      b.title,
      b.units,
      b.kenp,
      b.royalties,
      Math.round(b.kenp * 0.0045 * 100) / 100,
    ])
    const kdpSheet = XLSX.utils.aoa_to_sheet([
      [`KDP Sales — ${monthLabel}`, '', '', '', ''],
      [`Total Royalties: $${kdp.totalRoyaltiesUSD}`,
       `Total Units: ${kdp.totalUnits}`,
       `Total KENP: ${kdp.totalKENP?.toLocaleString()}`, '', ''],
      [],
      kdpHeader,
      ...kdpRows,
      [],
      ['TOTAL', kdp.totalUnits, kdp.totalKENP, kdp.totalRoyaltiesUSD,
       Math.round((kdp.totalKENP ?? 0) * 0.0045 * 100) / 100],
    ])
    XLSX.utils.book_append_sheet(wb, kdpSheet, 'KDP Sales')
  }

  // ── Sheet 4: Rank Log ───────────────────────────────────────────────────────
  if (rankLogs.length > 0) {
    const rankHeader = ['DATE', 'BOOK', 'ASIN', 'RANK', 'MOVEMENT']
    const rankRows = rankLogs.map(r => [
      new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      r.book,
      r.asin,
      r.rank,
      '',
    ])
    const rankSheet = XLSX.utils.aoa_to_sheet([rankHeader, ...rankRows])
    XLSX.utils.book_append_sheet(wb, rankSheet, 'Rank Tracker')
  }

  // Generate buffer and return as download
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `AuthorDash_Ad_Tracker_${month}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
