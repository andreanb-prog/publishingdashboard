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
  })

  return NextResponse.json({ records })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, phase, section, chapterIndex, content } = await req.json()

  if (!phase || !section || typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

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
    create: {
      userId: session.user.id,
      bookId: bookId ?? null,
      phase,
      section,
      chapterIndex: chapterIndex ?? null,
      content,
    },
    update: { content },
  })

  return NextResponse.json({ record })
}
