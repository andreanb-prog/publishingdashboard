// app/api/roas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { spend, earnings, notes } = await req.json()
  if (spend === undefined) return NextResponse.json({ error: 'Spend required' }, { status: 400 })

  const roas = earnings > 0 && spend > 0 ? earnings / spend : 0

  const log = await db.roasLog.create({
    data: {
      userId: session.user.id,
      spend: parseFloat(spend),
      earnings: parseFloat(earnings || 0),
      roas: Math.round(roas * 100) / 100,
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, log, roas })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const dateFilter = from && to
    ? { date: { gte: new Date(from), lte: new Date(to) } }
    : {}

  const logs = await db.roasLog.findMany({
    where: { userId: session.user.id, ...dateFilter },
    orderBy: { date: 'desc' },
    take: 21,
  })

  return NextResponse.json({ logs })
}
