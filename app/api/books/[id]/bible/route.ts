// app/api/books/[id]/bible/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const book = await db.book.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      genre: true,
      subgenre: true,
      tropes: true,
      customTropes: true,
      blurb: true,
      hookLines: true,
      characterNotes: true,
      moodNotes: true,
      compTitles: true,
      targetReader: true,
      manuscriptUploadedAt: true,
      bibleUpdatedAt: true,
      // manuscript text intentionally omitted from GET — too large
    },
  })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ book })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.book.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.genre !== undefined) data.genre = body.genre || null
  if (body.subgenre !== undefined) data.subgenre = body.subgenre || null
  if (body.tropes !== undefined) data.tropes = Array.isArray(body.tropes) ? body.tropes : []
  if (body.customTropes !== undefined) data.customTropes = Array.isArray(body.customTropes) ? body.customTropes : []
  if (body.blurb !== undefined) data.blurb = body.blurb || null
  if (body.hookLines !== undefined) data.hookLines = Array.isArray(body.hookLines) ? body.hookLines : []
  if (body.characterNotes !== undefined) data.characterNotes = body.characterNotes || null
  if (body.moodNotes !== undefined) data.moodNotes = body.moodNotes || null
  if (body.compTitles !== undefined) data.compTitles = Array.isArray(body.compTitles) ? body.compTitles : []
  if (body.targetReader !== undefined) data.targetReader = body.targetReader || null

  const book = await db.book.update({ where: { id: params.id }, data })
  return NextResponse.json({ book })
}
