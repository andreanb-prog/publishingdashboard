// app/api/writing-notebook/chat/message/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, content, bookId } = await req.json()

  if (!role || !content) {
    return NextResponse.json({ error: 'Missing role or content' }, { status: 400 })
  }

  // Save message
  const msg = await db.writingNotebookChat.create({
    data: {
      userId: session.user.id,
      bookId: bookId ?? null,
      role,
      content,
    },
  })

  // Cap at 50 messages per book — delete oldest
  const count = await db.writingNotebookChat.count({
    where: { userId: session.user.id, bookId: bookId ?? null },
  })

  if (count > 50) {
    const oldest = await db.writingNotebookChat.findMany({
      where: { userId: session.user.id, bookId: bookId ?? null },
      orderBy: { createdAt: 'asc' },
      take: count - 50,
      select: { id: true },
    })
    await db.writingNotebookChat.deleteMany({
      where: { id: { in: oldest.map(m => m.id) } },
    })
  }

  return NextResponse.json({ data: msg })
}
