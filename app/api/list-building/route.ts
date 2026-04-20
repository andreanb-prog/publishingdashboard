// app/api/list-building/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignName, spend, subscribers, startDate, endDate, notes } = await req.json()
  if (!campaignName || spend === undefined || subscribers === undefined || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const log = await db.listBuildingLog.create({
    data: {
      userId: session.user.id,
      campaignName,
      spend: parseFloat(spend),
      subscribers: parseInt(subscribers),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, log })
}

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await db.listBuildingLog.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: 'desc' },
    take: 50,
  })

  return NextResponse.json({ logs })
}

export async function DELETE(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await db.listBuildingLog.deleteMany({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
