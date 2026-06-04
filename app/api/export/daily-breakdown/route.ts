import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'
import { resolveKdpRows, aggregateKdp } from '@/lib/kdpDataPriority'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'json'

  const today = new Date()
  const defaultEnd   = today.toISOString().substring(0, 10)
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

  const startStr = searchParams.get('start') ?? defaultStart
  const endStr   = searchParams.get('end')   ?? defaultEnd

  const userId = session.user.id

  const [allKdpRows, bsrLogs, metaRows, books] = await Promise.all([
    // Fetch ALL user KDP rows (not date-filtered) so resolveKdpRows can see
    // extension MTD rows whose .date may fall outside the requested range.
    db.kdpSale.findMany({
      where:   { userId },
      orderBy: { date: 'desc' },
    }),
    db.bsrLog.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startStr + 'T00:00:00.000Z'),
          lte: new Date(endStr   + 'T23:59:59.999Z'),
        },
      },
    }),
    db.metaAdData.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startStr + 'T00:00:00.000Z'),
          lte: new Date(endStr   + 'T23:59:59.999Z'),
        },
      },
    }),
    db.book.findMany({
      where:  { userId },
      select: { asin: true, title: true },
    }),
  ])

  // ── Resolve KDP deduplication ──────────────────────────────────────────────
  const resolved = resolveKdpRows(allKdpRows)

  // Deduped totals for the requested range (includes extension MTD where applicable)
  const agg = aggregateKdp(resolved, { start: startStr, end: endStr })

  // ── Title lookup ──────────────────────────────────────────────────────────
  const titleByAsin = new Map<string, string>()
  for (const b of books) {
    if (b.asin) titleByAsin.set(b.asin.toUpperCase(), b.title)
  }
  for (const s of allKdpRows) {
    if (!titleByAsin.has(s.asin.toUpperCase())) titleByAsin.set(s.asin.toUpperCase(), s.title)
  }

  // ── KdpSale lookup: asin::date → row (per-day, non-extension, in range) ───
  const kdpByKey = new Map<string, typeof resolved[0]>()
  for (const r of resolved) {
    if (!r.shapeOnly && r.source !== 'extension' && r.date >= startStr && r.date <= endStr) {
      const key = `${r.asin.toUpperCase()}::${r.date}`
      if (!kdpByKey.has(key)) kdpByKey.set(key, r)
    }
  }

  // ── BsrLog lookup: asin::date → row ───────────────────────────────────────
  const bsrByKey = new Map<string, typeof bsrLogs[0]>()
  for (const b of bsrLogs) {
    const dateStr = b.date.toISOString().substring(0, 10)
    const key = `${b.asin.toUpperCase()}::${dateStr}`
    if (!bsrByKey.has(key)) bsrByKey.set(key, b)
  }

  // ── MetaAdData lookup: date → summed spend + clicks ───────────────────────
  // MetaAdData has no asin — spread total daily spend across all book rows for that date.
  const metaByDate = new Map<string, { spend: number; clicks: number }>()
  for (const m of metaRows) {
    const dateStr = m.date.toISOString().substring(0, 10)
    const existing = metaByDate.get(dateStr) ?? { spend: 0, clicks: 0 }
    metaByDate.set(dateStr, {
      spend:  existing.spend  + m.spend,
      clicks: existing.clicks + m.clicks,
    })
  }

  // ── Full outer join: collect all unique (asin, date) pairs ────────────────
  // A row appears if ANY source (KdpSale or BsrLog) has data for that asin+date.
  // We can't infer an asin from MetaAdData alone, so it contributes only when
  // there is at least a KdpSale or BsrLog row for that date.
  const allPairs = new Set<string>()
  Array.from(kdpByKey.keys()).forEach(k => allPairs.add(k))
  Array.from(bsrByKey.keys()).forEach(k => allPairs.add(k))

  const rows = Array.from(allPairs).map(key => {
    const sepIdx  = key.indexOf('::')
    const asin    = key.substring(0, sepIdx)
    const date    = key.substring(sepIdx + 2)

    const kdp  = kdpByKey.get(key)
    const bsr  = bsrByKey.get(key)
    const meta = metaByDate.get(date) ?? null

    const title   = titleByAsin.get(asin) ?? kdp?.title ?? bsr?.bookTitle ?? asin
    const units   = kdp?.units    ?? 0
    const kenp    = kdp?.kenp     ?? 0
    // revenue = book royalties (KdpSale.royalties); used as the numerator for ROAS
    const revenue = kdp?.royalties != null ? kdp.royalties : null
    const rank    = bsr?.rank     ?? null
    const adSpend = meta != null  ? meta.spend  : null
    const roas    = adSpend != null && revenue != null && adSpend > 0
      ? revenue / adSpend
      : null

    let topCategoryRank: { rank: number; category: string } | null = null
    if (bsr?.categoryRanks) {
      const cats = bsr.categoryRanks as { rank: number; category: string }[]
      if (Array.isArray(cats) && cats.length > 0) {
        topCategoryRank = cats.reduce((best, c) => c.rank < best.rank ? c : best, cats[0])
      }
    }

    return { date, asin, title, units, kenp, rank, topCategoryRank, adSpend, revenue, roas }
  })

  rows.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.units - a.units
  })

  const booksMap = new Map<string, string>()
  for (const r of rows) booksMap.set(r.asin, r.title)
  const uniqueBooks = Array.from(booksMap.entries()).map(([asin, title]) => ({ asin, title }))

  if (format === 'xlsx') {
    const month  = startStr.substring(0, 7)
    const wb     = XLSX.utils.book_new()
    const header = ['DATE', 'TITLE', 'ASIN', 'UNITS SOLD', 'PAGE READS (KENP)', 'BSR RANK', 'AD SPEND', 'REVENUE', 'ROAS']

    const dataRows = rows.map(r => [
      r.date,
      r.title,
      r.asin,
      r.units,
      r.kenp,
      r.rank ?? '',
      r.adSpend ?? '',
      r.revenue ?? '',
      r.roas != null ? parseFloat(r.roas.toFixed(2)) : '',
    ])

    // Use aggregateKdp totals — correctly includes extension MTD for months in range
    const totalUnits   = agg.units
    const totalKenp    = agg.kenp
    const totalSpend   = rows.reduce((a, r) => a + (r.adSpend ?? 0), 0)
    const totalRevenue = rows.reduce((a, r) => a + (r.revenue ?? 0), 0)
    const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : null

    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      ...dataRows,
      [],
      ['TOTALS', '', '', totalUnits, totalKenp, '',
        totalSpend > 0 ? parseFloat(totalSpend.toFixed(2)) : '',
        totalRevenue > 0 ? parseFloat(totalRevenue.toFixed(2)) : '',
        avgRoas != null ? parseFloat(avgRoas.toFixed(2)) : ''],
    ])

    XLSX.utils.book_append_sheet(wb, sheet, 'Daily Breakdown')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="AuthorDash_Daily_Breakdown_${month}.xlsx"`,
      },
    })
  }

  return NextResponse.json({
    rows,
    books: uniqueBooks,
    dateRange:            { start: startStr, end: endStr },
    totals:               { units: agg.units, kenp: agg.kenp, royalties: agg.royalties },
    hasMonthGranularData: agg.hasMonthGranularData,
  })
}
