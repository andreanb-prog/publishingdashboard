import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const images = await db.storyPostImage.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, url: true, label: true, pillarTag: true, createdAt: true },
  })

  return NextResponse.json({ images })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const url = typeof body?.url === 'string' ? body.url.trim() : null
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const image = await db.storyPostImage.create({
    data: {
      projectId: params.id,
      url,
      label: null,
      pillarTag: null,
    },
    select: { id: true, url: true, label: true, pillarTag: true, createdAt: true },
  })

  return NextResponse.json({ image })
}
