import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

async function verifyProject(projectId: string, userId: string) {
  return db.storyPostProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await verifyProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reviews = await db.storyPostReview.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, text: true, reviewer: true, bookTitle: true, createdAt: true },
  })

  return NextResponse.json({ reviews })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await verifyProject(params.id, session.user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const review = await db.storyPostReview.create({
    data: {
      projectId: params.id,
      text,
      reviewer: body?.reviewer?.trim() || null,
      bookTitle: body?.bookTitle?.trim() || null,
    },
    select: { id: true, text: true, reviewer: true, bookTitle: true, createdAt: true },
  })

  return NextResponse.json({ review })
}
