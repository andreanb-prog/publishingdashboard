// app/api/books/bsr/history/route.ts
// GET /api/books/bsr/history?asin=X&days=7[&format=legacy]
// Returns 7 rows sorted date asc with all derived fields computed server-side.
// Pass format=legacy for the old {bsr, adSpend, subscribers} shape (used by CorrelationGraph).
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

function dateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const asin = searchParams.get('asin')?.trim()
  const days = Math.min(parseInt(searchParams.get('days') ?? '7'), 90)
  const format = searchParams.get('format') ?? 'rows'

  if (!asin) return NextResponse.json({ error: 'no_asin' }, { status: 400 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  since.setUTCHours(0, 0, 0, 0)

  const logs = await db.bsrLog.findMany({
    where: { userId: session.user.id, asin, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  // ── Legacy format (used by old CorrelationGraph / BsrTracker) ────────────────
  if (format === 'legacy') {
    const [adStats, snapshots] = await Promise.all([
      db.metaAdStat.findMany({
        where: { userId: session.user.id, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      db.mailerLiteSnapshot.findMany({
        where: { userId: session.user.id, date: { gte: since } },
        orderBy: { date: 'asc' },
      }),
    ])

    const adSpendByDay = new Map<string, number>()
    for (const stat of adStats) {
      const key = dateKey(new Date(stat.date))
      adSpendByDay.set(key, (adSpendByDay.get(key) ?? 0) + stat.spend)
    }

    let adSpendArr: { date: string; spend: number }[]
    if (adSpendByDay.size === 0) {
      const metaData = await db.metaAdData.findMany({
        where: { userId: session.user.id, date: { gte: since } },
        orderBy: { date: 'asc' },
      })
      const fallback = new Map<string, number>()
      for (const row of metaData) {
        const key = dateKey(new Date(row.date))
        fallback.set(key, (fallback.get(key) ?? 0) + row.spend)
      }
      adSpendArr = Array.from(fallback.entries()).map(([date, spend]) => ({ date, spend }))
    } else {
      adSpendArr = Array.from(adSpendByDay.entries()).map(([date, spend]) => ({ date, spend }))
    }

    return NextResponse.json({
      bsr: logs.map(l => ({ date: dateKey(new Date(l.date)), rank: l.rank })),
      adSpend: adSpendArr,
      subscribers: snapshots.map(s => ({ date: dateKey(new Date(s.date)), count: s.activeCount })),
    })
  }

  // ── New row format ────────────────────────────────────────────────────────────
  const rows = logs.map((log, i) => {
    const prevRank = i > 0 ? (logs[i - 1].rank ?? null) : null
    const rankChange =
      log.rank != null && prevRank != null ? prevRank - log.rank : null // positive = improved
    const cpc =
      log.adSpend && log.clicks && log.clicks > 0 ? log.adSpend / log.clicks : null
    const ctr = null // CTR requires impressions which we don't store — computed from BsrLog clicks/impressions if available
    const roas =
      log.revenue && log.adSpend && log.adSpend > 0 ? log.revenue / log.adSpend : null
    const costPerSub =
      log.adSpend && log.newSubs && log.newSubs > 0 ? log.adSpend / log.newSubs : null

    return {
      id: log.id,
      date: dateKey(new Date(log.date)),
      rank: log.rank,
      rankChange,
      adSpend: log.adSpend,
      adSpendAutoFilled: log.adSpendAutoFilled,
      clicks: log.clicks,
      cpc,
      ctr,
      revenue: log.revenue,
      roas,
      pageReads: log.pageReads,
      orders: log.orders,
      newSubs: log.newSubs,
      newSubsAutoFilled: log.newSubsAutoFilled,
      lpv: log.lpv,
      notes: log.notes,
      costPerSub,
    }
  })

  return NextResponse.json({ rows })
}
