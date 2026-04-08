// app/api/writing-notebook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET — fetch all writing notebook records for a book
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId')
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  const records = await db.writingNotebook.findMany({
    where: { userId: session.user.id, bookId },
    orderBy: [{ phase: 'asc' }, { section: 'asc' }, { chapterIndex: 'asc' }],
  })

  return NextResponse.json({ records })
}

// POST — upsert a writing notebook record
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookId, phase, section, chapterIndex, chapterTitle, content } = body

  if (!bookId || !phase || !section) {
    return NextResponse.json({ error: 'bookId, phase, and section required' }, { status: 400 })
  }

  const wordCount = content
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0

  const record = await db.writingNotebook.upsert({
    where: {
      userId_bookId_phase_section_chapterIndex: {
        userId: session.user.id,
        bookId,
        phase,
        section,
        chapterIndex: chapterIndex ?? null,
      },
    },
    update: {
      content: content ?? '',
      chapterTitle: chapterTitle ?? null,
      wordCount,
    },
    create: {
      userId: session.user.id,
      bookId,
      phase,
      section,
      chapterIndex: chapterIndex ?? null,
      chapterTitle: chapterTitle ?? null,
      content: content ?? '',
      wordCount,
    },
  })

  return NextResponse.json({ record })
}
