import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'json'

  const today = new Date()
  const defaultEnd = today.toISOString().substring(0, 10)
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

  const startStr = searchParams.get('start') ?? defaultStart
  const endStr   = searchParams.get('end')   ?? defaultEnd

  const [kdpSales, bsrLogs, books] = await Promise.all([
    db.kdpSale.findMany({
      where: { userId: session.user.id, date: { gte: startStr, lte: endStr } },
      orderBy: { date: 'desc' },
    }),
    db.bsrLog.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(startStr + 'T00:00:00.000Z'),
          lte: new Date(endStr + 'T23:59:59.999Z'),
        },
      },
    }),
    db.book.findMany({
      where: { userId: session.user.id },
      select: { asin: true, title: true },
    }),
  ])

  const titleByAsin = new Map<string, string>()
  for (const b of books) {
    if (b.asin) titleByAsin.set(b.asin.toUpperCase(), b.title)
  }
  for (const s of kdpSales) {
    if (!titleByAsin.has(s.asin.toUpperCase())) titleByAsin.set(s.asin.toUpperCase(), s.title)
  }

  const bsrByKey = new Map<string, typeof bsrLogs[0]>()
  for (const b of bsrLogs) {
    const dateStr = b.date.toISOString().substring(0, 10)
    const key = `${b.asin.toUpperCase()}::${dateStr}`
    if (!bsrByKey.has(key)) bsrByKey.set(key, b)
  }

  const rows = kdpSales.map(sale => {
    const key     = `${sale.asin.toUpperCase()}::${sale.date}`
    const bsr     = bsrByKey.get(key)
    const adSpend = bsr?.adSpend ?? null
    const revenue = bsr?.revenue ?? null
    const roas    = adSpend != null && revenue != null && adSpend > 0 ? revenue / adSpend : null
    return {
      date:    sale.date,
      asin:    sale.asin,
      title:   titleByAsin.get(sale.asin.toUpperCase()) ?? sale.title,
      units:   sale.units,
      kenp:    sale.kenp,
      rank:    bsr?.rank ?? null,
      adSpend,
      revenue,
      roas,
    }
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

    const totalUnits   = rows.reduce((a, r) => a + r.units, 0)
    const totalKenp    = rows.reduce((a, r) => a + r.kenp, 0)
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
    dateRange: { start: startStr, end: endStr },
  })
}
