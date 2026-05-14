import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      _count: { select: { posts: true, quotes: true, reviews: true, images: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const allowed = [
    'name', 'hasLaunch', 'launchDate', 'launchBookId',
    'frequency', 'bookPageUrl', 'beaconsUrl', 'authorCentral', 'website',
    'avatar', 'aesthetic', 'pillars',
  ] as const

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) {
      if (key === 'launchDate') {
        data[key] = body[key] ? new Date(body[key]) : null
      } else {
        data[key] = body[key]
      }
    }
  }

  const project = await db.storyPostProject.update({
    where: { id: params.id },
    data,
    include: {
      _count: { select: { posts: true, quotes: true, reviews: true, images: true } },
    },
  })

  return NextResponse.json({ project })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.storyPostProject.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
