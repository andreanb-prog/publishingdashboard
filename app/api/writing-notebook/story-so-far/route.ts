// app/api/writing-notebook/story-so-far/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, chapters } = await req.json()
  if (!bookId || !chapters?.length)
    return Response.json({ error: 'bookId and chapters required' }, { status: 400 })

  // Verify book belongs to user
  const book = await db.book.findFirst({
    where: { id: bookId, userId: session.user.id },
  })
  if (!book)
    return Response.json({ error: 'Book not found' }, { status: 404 })

  // Build chapter text for prompt
  const chapterText = chapters
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
    .map((c: { title: string; content: string; order: number }) =>
      `Chapter ${c.order + 1}${c.title ? ` — ${c.title}` : ''}\n${c.content}`
    )
    .join('\n\n---\n\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `You are a story continuity assistant. Given these chapters, produce a Story So Far document. For each chapter, generate exactly this format:

Chapter [Number]
Opening hook: "[Quote the opening line or two verbatim]"
Summary: [Key events, character developments, plot progression — 100 words max]
Closing cliffhanger: "[Quote the closing line or two verbatim]"

No preamble. No conclusion. Just the chapter entries.

${chapterText}`,
      },
    ],
  })

  const summary =
    response.content[0].type === 'text' ? response.content[0].text : ''

  return Response.json({ success: true, summary })
}
