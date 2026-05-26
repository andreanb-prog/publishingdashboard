// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { book, asin, rank, category } = await req.json()
  if (!book || !rank) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const log = await db.rankLog.create({
    data: {
      userId: session.user.id,
      book,
      asin: asin || '',
      rank: parseInt(rank),
      category: category ?? null,
    },
  })

  return NextResponse.json({ success: true, log })
}

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const dateFilter = from && to
    ? { date: { gte: new Date(from), lte: new Date(to) } }
    : {}

  // Read from BsrLog — that's where the BSR cron writes rank data.
  // Filter out LM (lead magnet) rows and any rows with no rank.
  const bsrLogs = await db.bsrLog.findMany({
    where: {
      userId: session.user.id,
      rank: { not: null },
      NOT: { asin: 'LM' },
      ...dateFilter,
    },
    orderBy: { date: 'asc' },
    take: 200,
  })

  const logs = bsrLogs.map(l => ({
    id:   l.id,
    book: l.bookTitle ?? l.asin,
    asin: l.asin,
    rank: l.rank as number,
    date: l.date.toISOString(),
  }))

  return NextResponse.json({ logs })
}
