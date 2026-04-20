// app/api/creative/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creative = await db.creative.findUnique({ where: { id: params.id } })
  if (!creative || creative.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const allowed = [
    'name', 'variant', 'phase', 'angle', 'format', 'sizes', 'status',
    'thumbnailUrl', 'brief', 'hookText', 'captionCopy', 'headlineCopy',
    'targeting', 'ctr', 'cpc', 'spend', 'impressions', 'clicks',
    'costPerResult', 'adAccountId', 'metaAdId', 'notes', 'bookId',
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const updated = await db.creative.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json({ creative: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creative = await db.creative.findUnique({ where: { id: params.id } })
  if (!creative || creative.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.creative.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
