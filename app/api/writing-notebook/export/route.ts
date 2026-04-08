// app/api/writing-notebook/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Document, Paragraph, HeadingLevel, Packer, TextRun } from 'docx'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, type, format, source } = await req.json()
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  // Fetch book title
  const book = await db.book.findFirst({
    where: { id: bookId, userId: session.user.id },
    select: { title: true },
  })
  const bookTitle = book?.title ?? 'Untitled'

  if (type === 'manuscript') {
    // Fetch chapters
    const isFromFinal = source === 'final'
    const records = await db.writingNotebook.findMany({
      where: {
        userId: session.user.id,
        bookId,
        phase: isFromFinal ? 'polish' : 'writing',
        section: isFromFinal ? 'finalDraft' : 'chapter',
      },
      orderBy: { chapterIndex: 'asc' },
    })

    if (format === 'text') {
      const text = records
        .map(r => {
          const heading = `Chapter ${r.chapterIndex ?? ''}${r.chapterTitle ? ' — ' + r.chapterTitle : ''}`
          return `${heading}\n\n${r.content || '(empty)'}\n`
        })
        .join('\n---\n\n')
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Build docx
    const doc = new Document({
      sections: [{
        children: records.flatMap(r => [
          new Paragraph({
            text: `Chapter ${r.chapterIndex ?? ''}${r.chapterTitle ? ' \u2014 ' + r.chapterTitle : ''}`,
            heading: HeadingLevel.HEADING_1,
          }),
          ...(r.content || '')
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string) => new Paragraph({
              children: [new TextRun(line)],
              spacing: { after: 200 },
            })),
          new Paragraph({ text: '' }),
        ]),
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const suffix = isFromFinal ? 'Final' : 'Draft'
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${bookTitle} \u2014 ${suffix}.docx"`,
      },
    })
  }

  if (type === 'notes') {
    const records = await db.writingNotebook.findMany({
      where: {
        userId: session.user.id,
        bookId,
        phase: 'setup',
      },
      orderBy: { section: 'asc' },
    })

    // Also fetch storySoFar
    const storySoFar = await db.writingNotebook.findFirst({
      where: {
        userId: session.user.id,
        bookId,
        phase: 'writing',
        section: 'storySoFar',
      },
    })

    const sectionLabels: Record<string, string> = {
      storyOutline: 'Story Outline',
      characterBible: 'Character Bible',
      styleGuide: 'Style Guide',
      storySoFar: 'Story So Far',
    }

    const allNotes = [...records, ...(storySoFar ? [storySoFar] : [])]

    if (format === 'text') {
      const text = allNotes
        .map(r => `${sectionLabels[r.section] ?? r.section}\n\n${r.content || '(empty)'}`)
        .join('\n\n---\n\n')
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const doc = new Document({
      sections: [{
        children: allNotes.flatMap(r => [
          new Paragraph({
            text: sectionLabels[r.section] ?? r.section,
            heading: HeadingLevel.HEADING_1,
          }),
          ...(r.content || '')
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string) => new Paragraph({
              children: [new TextRun(line)],
              spacing: { after: 200 },
            })),
          new Paragraph({ text: '' }),
        ]),
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${bookTitle} \u2014 Notes.docx"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
