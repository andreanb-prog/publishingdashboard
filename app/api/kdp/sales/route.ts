// app/api/kdp/sales/route.ts
// Returns KDP sales data aggregated directly from KdpSale rows for a given date range.
// Used by the KDP deep dive page so it always reflects raw uploaded data, not stale Analysis snapshots.
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')  // YYYY-MM-DD
  const end   = searchParams.get('end')    // YYYY-MM-DD

  const rows = await db.kdpSale.findMany({
    where: {
      userId: session.user.id,
      ...(start && end ? { date: { gte: start, lte: end } } : {}),
    },
    orderBy: { date: 'asc' },
  })

  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  const bookMap       = new Map<string, {
    asin:      string
    title:     string
    units:     number
    kenp:      number
    royalties: number
    format?:   string
  }>()

  for (const row of rows) {
    dailyUnitsMap.set(row.date, (dailyUnitsMap.get(row.date) ?? 0) + row.units)
    dailyKENPMap.set(row.date,  (dailyKENPMap.get(row.date) ?? 0) + row.kenp)
    const b = bookMap.get(row.asin)
    if (b) {
      b.units     += row.units
      b.kenp      += row.kenp
      b.royalties += row.royalties
    } else {
      bookMap.set(row.asin, {
        asin:      row.asin,
        title:     row.title,
        units:     row.units,
        kenp:      row.kenp,
        royalties: row.royalties,
        format:    row.format ?? undefined,
      })
    }
  }

  const dailyUnits = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const books = Array.from(bookMap.values())
    .sort((a, b) => b.units - a.units)
    .map(b => ({
      ...b,
      shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '…' : b.title,
    }))

  return NextResponse.json({
    dailyUnits,
    dailyKENP,
    books,
    totalUnits:     books.reduce((s, b) => s + b.units,     0),
    totalKENP:      books.reduce((s, b) => s + b.kenp,      0),
    totalRoyalties: books.reduce((s, b) => s + b.royalties, 0),
  })
}
