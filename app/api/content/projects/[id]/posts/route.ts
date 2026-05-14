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
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const posts = await db.storyPostPost.findMany({
    where: { projectId: params.id },
    orderBy: { dayNumber: 'asc' },
  })

  return NextResponse.json({ posts, count: posts.length })
}
