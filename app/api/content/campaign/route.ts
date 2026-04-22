export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const bookId = searchParams.get('bookId')

    const where = bookId
      ? { userId: session.user.id, bookId }
      : { userId: session.user.id }

    const posts = await db.contentPost.findMany({
      where,
      orderBy: { day: 'asc' },
    })

    return NextResponse.json({
      posts: posts.map(p => ({
        ...p,
        scheduledDate: p.scheduledDate.toISOString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('[campaign GET] Unexpected error:', err)
    return NextResponse.json({ posts: [] }, { status: 200 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (e) {
      console.error('[campaign PATCH] Failed to parse request body:', e)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { postId, status, caption, hook } = body as {
      postId?: string
      status?: string
      caption?: string
      hook?: string
    }

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const post = await db.contentPost.findFirst({
      where: { id: postId, userId: session.user.id },
    })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const updated = await db.contentPost.update({
      where: { id: postId },
      data: {
        ...(status !== undefined && { status }),
        ...(caption !== undefined && { caption }),
        ...(hook !== undefined && { hook }),
      },
    })

    return NextResponse.json({
      post: {
        ...updated,
        scheduledDate: updated.scheduledDate.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('[campaign PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
