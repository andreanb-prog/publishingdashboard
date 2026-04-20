import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// GET — fetch last 50 chat messages for a book
export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || null

  const messages = await db.writingNotebookChat.findMany({
    where: { userId: session.user.id, bookId },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true, role: true, content: true, createdAt: true },
  })

  return NextResponse.json({ messages })
}

// POST — save a single chat message
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role, content, bookId } = await req.json()
  if (!role || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Save message
  await db.writingNotebookChat.create({
    data: {
      userId: session.user.id,
      bookId: bookId || null,
      role,
      content,
    },
  })

  // Cap at 50 messages per book — delete oldest if over
  const count = await db.writingNotebookChat.count({
    where: { userId: session.user.id, bookId: bookId || null },
  })

  if (count > 50) {
    const oldest = await db.writingNotebookChat.findMany({
      where: { userId: session.user.id, bookId: bookId || null },
      orderBy: { createdAt: 'asc' },
      take: count - 50,
      select: { id: true },
    })
    await db.writingNotebookChat.deleteMany({
      where: { id: { in: oldest.map(m => m.id) } },
    })
  }

  return NextResponse.json({ success: true })
}

// DELETE — clear all chat messages for a book
export async function DELETE(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || null

  await db.writingNotebookChat.deleteMany({
    where: { userId: session.user.id, bookId },
  })

  return NextResponse.json({ success: true })
}
