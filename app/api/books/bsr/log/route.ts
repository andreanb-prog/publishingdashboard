// app/api/books/bsr/log/route.ts
// POST /api/books/bsr/log — upsert a BsrLog entry (one per user+asin per day)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { asin, bookTitle, rank } = await req.json()
  if (!asin || !rank) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const rankNum = parseInt(rank)
  if (isNaN(rankNum) || rankNum < 1) return NextResponse.json({ error: 'Invalid rank' }, { status: 400 })

  // Upsert: check if an entry already exists for today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const existing = await db.bsrLog.findFirst({
    where: {
      userId: session.user.id,
      asin,
      fetchedAt: { gte: todayStart, lte: todayEnd },
    },
  })

  let log
  if (existing) {
    log = await db.bsrLog.update({
      where: { id: existing.id },
      data: { rank: rankNum, bookTitle: bookTitle ?? existing.bookTitle },
    })
  } else {
    log = await db.bsrLog.create({
      data: {
        userId: session.user.id,
        asin,
        bookTitle: bookTitle ?? null,
        rank: rankNum,
      },
    })
  }

  return NextResponse.json({ success: true, log })
}
