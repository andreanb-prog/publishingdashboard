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
  let book
  try {
    book = await db.book.findFirst({
      where: { id: bookId, userId: session.user.id },
    })
  } catch (err) {
    console.error('[story-so-far] Prisma error fetching book:', err)
    return Response.json({ success: false, summary: '' }, { status: 200 })
  }

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

  let summary = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `For each chapter provided, generate a Story So Far entry using this structure:\n\n**Chapter [Number]**\nOpening hook: "[Quote the opening line or two of the chapter verbatim]"\nSummary: [Summarize the key events, character developments, and plot progression in approximately 100 words]\nClosing cliffhanger: "[Quote the closing line or two of the chapter verbatim]"\n\nKeep each chapter summary tight — 100 words max for the summary section. The opening hook and closing cliffhanger should be direct quotes from the chapter text. Do not add any preamble, introduction, or conclusion outside the chapter entries.\n\n${chapterText}`,
        },
      ],
    })
    summary = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('[story-so-far] Anthropic error:', err)
    return Response.json({ success: false, summary: '' }, { status: 200 })
  }

  // Save to Book.storyContent — wrapped separately so a missing column doesn't crash the whole route
  try {
    await db.book.update({
      where: { id: bookId },
      data: {
        storyContent: summary,
        storyContentUpdatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[story-so-far] Prisma error saving storyContent (column may not exist yet):', err)
    // Return the summary anyway so the UI still works
  }

  return Response.json({ success: true, summary })
}
