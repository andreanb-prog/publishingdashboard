// app/api/kdp/sales/route.ts
// Returns KDP sales data for a given date range, deduped via the shared resolver.
// Extension MTD rows are the authoritative monthly total; CSV rows supply daily chart shape.
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { resolveKdpRows, aggregateKdp } from '@/lib/kdpDataPriority'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')  // YYYY-MM-DD
  const end   = searchParams.get('end')    // YYYY-MM-DD

  // Fetch ALL rows for the user — we resolve first, then date-scope inside aggregateKdp.
  // Fetching all rows is necessary because an extension MTD row's `.date` field (the sync
  // date) can fall outside the requested range even when its monthKey overlaps it.
  const allRows = await db.kdpSale.findMany({
    where:   { userId: session.user.id },
    orderBy: { date: 'asc' },
  })

  const resolved = resolveKdpRows(allRows)
  const agg      = aggregateKdp(resolved, start && end ? { start, end } : undefined)

  // Build per-day series arrays from dailySeries (CSV rows only — extension rows have no daily shape)
  const dailyUnitsMap = new Map<string, number>()
  const dailyKENPMap  = new Map<string, number>()
  for (const s of agg.dailySeries) {
    dailyUnitsMap.set(s.date, (dailyUnitsMap.get(s.date) ?? 0) + s.units)
    dailyKENPMap.set(s.date,  (dailyKENPMap.get(s.date)  ?? 0) + s.kenp)
  }

  const dailyUnits = Array.from(dailyUnitsMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const dailyKENP = Array.from(dailyKENPMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Build format lookup from all rows (format not carried through aggregateKdp)
  const formatByAsin = new Map<string, string | undefined>()
  for (const row of allRows) {
    if (!formatByAsin.has(row.asin)) formatByAsin.set(row.asin, row.format ?? undefined)
  }

  const books = Object.values(agg.byBook)
    .sort((a, b) => b.units - a.units)
    .map(b => ({
      ...b,
      format:     formatByAsin.get(b.asin),
      shortTitle: b.title.length > 35 ? b.title.substring(0, 35) + '…' : b.title,
    }))

  // Per-format royalty splits (KU / eBook / Paperback / Hardcover / Audiobook)
  // parsed from KDP's Prior-Month royalty report by the browserbase sync and
  // stored as JSON on each month's ALL_BOOKS row. Read-only pass — same
  // month-overlap rule aggregateKdp uses for browserbase rows, and no effect
  // on the blended totals above.
  const formatBreakdowns = allRows
    .filter(r => {
      if (r.asin !== 'ALL_BOOKS' || r.source !== 'browserbase') return false
      if (!r.monthKey || r.formatBreakdown == null) return false
      if (!start || !end) return true
      const monthStart = `${r.monthKey}-01`
      const monthEnd   = `${r.monthKey}-31` // intentional overshoot — always >= real last day
      return start <= monthEnd && end >= monthStart
    })
    .sort((a, b) => (a.monthKey ?? '').localeCompare(b.monthKey ?? ''))
    .map(r => ({
      monthKey:  r.monthKey as string,
      royalties: r.royalties, // blended month total the split reconciles to
      breakdown: r.formatBreakdown,
    }))

  return NextResponse.json({
    dailyUnits,
    dailyKENP,
    books,
    totalUnits:              agg.units,
    totalKENP:               agg.kenp,
    totalRoyalties:          agg.royalties,
    estRevenue:              agg.estRevenue,
    hasMonthGranularData:    agg.hasMonthGranularData,
    formatBreakdowns,
  })
}
