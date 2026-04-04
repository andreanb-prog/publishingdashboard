// app/api/ads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ad = await db.ad.findUnique({
    where: { id: params.id },
    include: { adSet: { include: { campaign: { select: { userId: true } } } } },
  })
  if (!ad || ad.adSet.campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const allowed = ['status', 'ctr', 'cpc', 'spend', 'metaAdId', 'creativeId', 'generatedName']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const updated = await db.ad.update({ where: { id: params.id }, data })
  return NextResponse.json({ ad: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ad = await db.ad.findUnique({
    where: { id: params.id },
    include: { adSet: { include: { campaign: { select: { userId: true } } } } },
  })
  if (!ad || ad.adSet.campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.ad.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
