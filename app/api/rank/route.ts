// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const book = searchParams.get('book')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const dateFilter = from && to
    ? { date: { gte: new Date(from), lte: new Date(to) } }
    : {}

  const logs = await db.rankLog.findMany({
    where: { userId: session.user.id, ...dateFilter, ...(book ? { book } : {}) },
    orderBy: { date: 'desc' },
    take: 60,
  })

  return NextResponse.json({ logs })
}
