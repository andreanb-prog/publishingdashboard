// app/api/writing-notebook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || undefined

  const records = await db.writingNotebook.findMany({
    where: { userId: session.user.id, bookId: bookId ?? null },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ data: records })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, phase, section, chapterIndex, content } = await req.json()

  const record = await db.writingNotebook.upsert({
    where: {
      userId_bookId_phase_section_chapterIndex: {
        userId: session.user.id,
        bookId: bookId ?? null,
        phase,
        section,
        chapterIndex: chapterIndex ?? null,
      },
    },
    update: { content },
    create: {
      userId: session.user.id,
      bookId: bookId ?? null,
      phase,
      section,
      chapterIndex: chapterIndex ?? null,
      content,
    },
  })

  return NextResponse.json({ data: record })
}
