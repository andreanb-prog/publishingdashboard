import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { Document, Paragraph, HeadingLevel, Packer, TextRun } from 'docx'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, type, format, source } = await req.json()
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  // Get book title
  const book = await db.book.findFirst({ where: { id: bookId, userId: session.user.id } })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  const bookTitle = book.title

  if (type === 'manuscript') {
    // Determine phase and section based on source
    const phase = source === 'final' ? 'polish' : 'writing'

    // Fetch chapter meta to get titles and count
    const metaRecord = await db.writingNotebook.findFirst({
      where: { userId: session.user.id, bookId, phase, section: 'chapterMeta' },
    })
    let meta = { count: 0, titles: [] as string[] }
    if (metaRecord?.content) {
      try { meta = JSON.parse(metaRecord.content) } catch {}
    }

    // Fetch all chapter records
    const records = await db.writingNotebook.findMany({
      where: { userId: session.user.id, bookId, phase, section: 'chapter' },
      orderBy: { chapterIndex: 'asc' },
    })

    const chapters = Array.from({ length: meta.count }, (_, i) => {
      const record = records.find(r => r.chapterIndex === i)
      return {
        index: i + 1,
        title: meta.titles[i] || `Chapter ${i + 1}`,
        content: record?.content || '',
      }
    }).filter(ch => ch.content.trim())

    if (format === 'text') {
      const text = chapters
        .map(ch => `CHAPTER ${ch.index} — ${ch.title.toUpperCase()}\n\n${ch.content}`)
        .join('\n\n---\n\n')
      return NextResponse.json({ text })
    }

    // Build docx
    const doc = new Document({
      sections: [{
        children: chapters.flatMap(ch => [
          new Paragraph({
            text: ch.title,
            heading: HeadingLevel.HEADING_1,
          }),
          ...ch.content
            .split('\n')
            .filter(line => line.trim())
            .map(line => new Paragraph({ children: [new TextRun(line)] })),
          new Paragraph({ text: '' }),
        ]),
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const suffix = source === 'final' ? 'Final' : 'Draft'
    const filename = `${bookTitle} — ${suffix}.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  if (type === 'notes') {
    // Fetch outline, character bible, story so far, style guide
    const sections = ['storyOutline', 'characterBible', 'storySoFar', 'styleGuide']
    const records = await db.writingNotebook.findMany({
      where: {
        userId: session.user.id,
        bookId,
        phase: { in: ['setup', 'writing'] },
        section: { in: sections },
      },
    })

    const getContent = (phase: string, section: string) =>
      records.find(r => r.phase === phase && r.section === section)?.content || ''

    const outline = getContent('setup', 'storyOutline')
    const characters = getContent('setup', 'characterBible')
    const storySoFar = getContent('writing', 'storySoFar')
    const styleRaw = getContent('setup', 'styleGuide')

    let styleText = ''
    if (styleRaw) {
      try {
        const sg = JSON.parse(styleRaw)
        const parts: string[] = []
        if (sg.niche) parts.push(`Niche: ${sg.niche}`)
        if (sg.pov) parts.push(`POV: ${sg.pov}`)
        if (sg.tense) parts.push(`Tense: ${sg.tense}`)
        if (sg.totalWordCount) parts.push(`Total Word Count Target: ${sg.totalWordCount}`)
        if (sg.chapterWordCount) parts.push(`Chapter Word Count Target: ${sg.chapterWordCount}`)
        if (sg.tropes) parts.push(`Tropes: ${sg.tropes}`)
        if (sg.personalStylePreferences) parts.push(`Style Preferences:\n${sg.personalStylePreferences}`)
        styleText = parts.join('\n')
      } catch {}
    }

    const noteSections = [
      { title: 'Story Outline', content: outline },
      { title: 'Character Bible', content: characters },
      { title: 'Story So Far', content: storySoFar },
      { title: 'Writing & Style Guide', content: styleText },
    ].filter(s => s.content.trim())

    if (format === 'text') {
      const text = noteSections
        .map(s => `${s.title.toUpperCase()}\n\n${s.content}`)
        .join('\n\n---\n\n')
      return NextResponse.json({ text })
    }

    const doc = new Document({
      sections: [{
        children: noteSections.flatMap(s => [
          new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }),
          ...s.content
            .split('\n')
            .filter(line => line.trim())
            .map(line => new Paragraph({ children: [new TextRun(line)] })),
          new Paragraph({ text: '' }),
        ]),
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = `${bookTitle} — Notes.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
