import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { scheduledAt, postedAt, reach, saves, clicks } = body

  const updated = await db.storyPostPost.update({
    where: { id: params.postId },
    data: {
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      ...(postedAt !== undefined ? { postedAt: postedAt ? new Date(postedAt) : null } : {}),
      ...(reach !== undefined ? { reach } : {}),
      ...(saves !== undefined ? { saves } : {}),
      ...(clicks !== undefined ? { clicks } : {}),
    },
  })

  return NextResponse.json({ post: updated })
}
