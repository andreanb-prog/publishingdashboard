// app/api/adsets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adSet = await db.adSet.findUnique({
    where: { id: params.id },
    include: { campaign: { select: { userId: true } } },
  })
  if (!adSet || adSet.campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const allowed = ['name', 'targeting', 'audience', 'dailyBudget', 'status']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const updated = await db.adSet.update({ where: { id: params.id }, data })
  return NextResponse.json({ adSet: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adSet = await db.adSet.findUnique({
    where: { id: params.id },
    include: { campaign: { select: { userId: true } } },
  })
  if (!adSet || adSet.campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.adSet.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
