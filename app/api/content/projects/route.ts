import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await db.storyPostProject.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { posts: true } } },
  })

  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const project = await db.storyPostProject.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
    },
    include: { _count: { select: { posts: true } } },
  })

  return NextResponse.json({ project }, { status: 201 })
}
