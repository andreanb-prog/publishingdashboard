// app/api/creative/generate-brief/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic } from '@/lib/anthropic'
import { db } from '@/lib/db'

function buildBibleContext(book: {
  genre: string | null
  subgenre: string | null
  tropes: string[]
  customTropes: string[]
  blurb: string | null
  hookLines: string[]
  compTitles: string[]
  targetReader: string | null
  characterNotes: string | null
  moodNotes: string | null
  manuscriptText: string | null
}): string {
  const allTropes = [...(book.tropes ?? []), ...(book.customTropes ?? [])].join(', ')
  const lines: string[] = []
  if (book.genre) lines.push(`- Genre: ${book.genre}${book.subgenre ? ` / ${book.subgenre}` : ''}`)
  if (allTropes) lines.push(`- Tropes: ${allTropes}`)
  if (book.blurb) lines.push(`- Blurb: ${book.blurb}`)
  if ((book.hookLines ?? []).length > 0) lines.push(`- Hook lines: ${book.hookLines.join(' | ')}`)
  if ((book.compTitles ?? []).length > 0) lines.push(`- Comp titles: ${book.compTitles.join(', ')}`)
  if (book.targetReader) lines.push(`- Target reader: ${book.targetReader}`)
  if (book.characterNotes) lines.push(`- Characters: ${book.characterNotes}`)
  if (book.moodNotes) lines.push(`- Mood: ${book.moodNotes}`)
  if (book.manuscriptText) {
    const excerpt = book.manuscriptText.slice(0, 2000).trim()
    lines.push(`- Key manuscript context: ${excerpt}`)
  }
  return lines.length > 0 ? `Book context:\n${lines.join('\n')}\n\n` : ''
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { bookTitle, bookId, phase, angle, format, hookText } = await req.json()

  let bibleContext = ''
  if (bookId) {
    const book = await db.book.findFirst({
      where: { id: bookId, userId: session.user.id },
      select: {
        genre: true, subgenre: true, tropes: true, customTropes: true,
        blurb: true, hookLines: true, compTitles: true, targetReader: true,
        characterNotes: true, moodNotes: true, manuscriptText: true,
      },
    })
    if (book) bibleContext = buildBibleContext(book)
  }

  const prompt = `${bibleContext}You are a creative strategist for romance fiction ads. Write a concise ad creative brief for:
Book: ${bookTitle || 'this book'}
Phase: ${phase || 'unspecified'}
Angle: ${angle || 'unspecified'}
Format: ${format || 'unspecified'}
Hook text: ${hookText || 'none provided'}

Include: the one job this ad must do, the emotion to lead with, what to show visually, and the call to action. Keep it under 150 words.`

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
