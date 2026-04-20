// app/api/writing-notebook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || undefined

  const records = await db.writingNotebook.findMany({
    where: { userId: session.user.id, bookId: bookId ?? null },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ data: records })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, phase, section, chapterIndex, content } = await req.json()

  if (!phase || !section) {
    return NextResponse.json({ error: 'phase and section required' }, { status: 400 })
  }

  const userId = session.user.id
  const safeBookId = bookId ?? null
  const safeChapterIndex = chapterIndex ?? null

  // Use findFirst + update/create to handle nullable fields in unique constraint
  // PostgreSQL treats NULL != NULL in unique indexes, so upsert with null fields won't match
  const existing = await db.writingNotebook.findFirst({
    where: {
      userId,
      bookId: safeBookId,
      phase,
      section,
      chapterIndex: safeChapterIndex,
    },
  })

  let record
  if (existing) {
    record = await db.writingNotebook.update({
      where: { id: existing.id },
      data: { content },
    })
  } else {
    record = await db.writingNotebook.create({
      data: {
        userId,
        bookId: safeBookId,
        phase,
        section,
        chapterIndex: safeChapterIndex,
        content,
      },
    })
  }

  return NextResponse.json({ data: record })
}
