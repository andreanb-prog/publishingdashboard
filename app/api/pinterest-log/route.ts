// app/api/pinterest-log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekEnding, impressions, saves, clicks, pinCount, notes } = await req.json()

  const imp = parseInt(impressions || 0)
  const sv = parseInt(saves || 0)
  const saveRate = imp > 0 ? Math.round((sv / imp) * 1000) / 10 : 0

  const log = await db.pinterestLog.create({
    data: {
      userId: session.user.id,
      weekEnding: weekEnding ? new Date(weekEnding) : new Date(),
      impressions: imp,
      saves: sv,
      clicks: parseInt(clicks || 0),
      pinCount: parseInt(pinCount || 0),
      saveRate,
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, log })
}

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await db.pinterestLog.findMany({
    where: { userId: session.user.id },
    orderBy: { weekEnding: 'desc' },
    take: 20,
  })

  return NextResponse.json({ logs })
}
