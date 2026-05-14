import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: { pillarTag?: string | null; label?: string } = {}
  if ('pillarTag' in body) data.pillarTag = body.pillarTag ?? null
  if ('label' in body) data.label = body.label

  const image = await db.storyPostImage.updateMany({
    where: { id: params.imageId, projectId: params.id },
    data,
  })

  return NextResponse.json({ ok: true, count: image.count })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.storyPostImage.deleteMany({
    where: { id: params.imageId, projectId: params.id },
  })

  return NextResponse.json({ ok: true })
}
