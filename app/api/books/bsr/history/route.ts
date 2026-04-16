// app/api/books/bsr/history/route.ts
// GET /api/books/bsr/history?asin=XXXXXXXX&days=7
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
  const days = parseInt(searchParams.get('days') ?? '7')

  if (!asin) return NextResponse.json({ error: 'no_asin' }, { status: 400 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  since.setHours(0, 0, 0, 0)

  const [bsrLogs, adStats, snapshots] = await Promise.all([
    db.bsrLog.findMany({
      where: { userId: session.user.id, asin, fetchedAt: { gte: since } },
      orderBy: { fetchedAt: 'asc' },
    }),
    db.metaAdStat.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    db.mailerLiteSnapshot.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
  ])

  // Aggregate MetaAdStat by day (sum spend per day)
  const adSpendByDay = new Map<string, number>()
  for (const stat of adStats) {
    const key = dateKey(new Date(stat.date))
    adSpendByDay.set(key, (adSpendByDay.get(key) ?? 0) + stat.spend)
  }

  // Use MetaAdData as fallback for ad spend if MetaAdStat is empty
  let adSpendArr: { date: string; spend: number }[]
  if (adSpendByDay.size === 0) {
    const metaData = await db.metaAdData.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    })
    const fallbackByDay = new Map<string, number>()
    for (const row of metaData) {
      const key = dateKey(new Date(row.date))
      fallbackByDay.set(key, (fallbackByDay.get(key) ?? 0) + row.spend)
    }
    adSpendArr = Array.from(fallbackByDay.entries()).map(([date, spend]) => ({ date, spend }))
  } else {
    adSpendArr = Array.from(adSpendByDay.entries()).map(([date, spend]) => ({ date, spend }))
  }

  return NextResponse.json({
    bsr: bsrLogs.map(l => ({ date: dateKey(new Date(l.fetchedAt)), rank: l.rank })),
    adSpend: adSpendArr,
    subscribers: snapshots.map(s => ({ date: dateKey(new Date(s.date)), count: s.activeCount })),
  })
}
