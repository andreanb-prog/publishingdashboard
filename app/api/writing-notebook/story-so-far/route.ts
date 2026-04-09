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
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a story continuity assistant. Given these chapters, write a concise Story So Far summary (max 200 words) capturing key plot points, character introductions, and where the story currently stands. Write in present tense. Use character names.\n\n${chapterText}`,
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
