// app/api/writing-notebook/chat/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

const WRITING_SYSTEM_PROMPT = `You are a skilled fiction writing assistant and story coach for indie authors. You help with:
- Story structure and plot development (three-act structure, character arcs, pacing)
- Scene writing — vivid prose, dialogue, tension, emotional beats
- Character development — motivation, voice, backstory, relationships
- World-building and setting descriptions
- Editing suggestions — tightening prose, cutting filler, strengthening verbs
- Brainstorming — plot twists, conflict escalation, scene transitions
- Writing in the author's voice and style

Rules:
1. When writing prose, match the author's voice from their existing chapters. If no chapters exist yet, write in a natural, engaging style appropriate to their genre.
2. When asked to write a chapter, produce complete, polished prose — not an outline or summary.
3. Use specific, concrete details. Avoid generic descriptions.
4. Show, don't tell. Use action, dialogue, and sensory detail over exposition.
5. Keep dialogue natural and character-specific. Each character should sound distinct.
6. Never use these overused words/phrases: "delicate," "searing," "electric," "couldn't help but," "let out a breath," "swallowed hard," "something shifted," "pierced through."
7. Avoid purple prose. Strong, clean sentences beat flowery descriptions.
8. When giving feedback, be specific and actionable. Quote the exact passage and suggest a concrete alternative.
9. Never lecture about writing theory unless asked. Just do the work.
10. If the author provides a story outline or "story so far," use it as your source of truth for continuity.

Format:
- When writing prose/chapters, output the prose directly with no meta-commentary.
- When giving feedback or brainstorming, use clear sections with brief headers.
- Keep responses focused. Don't pad with unnecessary encouragement.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { bookId, messages, phase, section } = await req.json()

  // Fetch book context
  let bookContext = ''
  if (bookId) {
    const book = await db.book.findFirst({
      where: { id: bookId, userId: session.user.id },
      select: {
        title: true, genre: true, subgenre: true, tropes: true,
        blurb: true, characterNotes: true, moodNotes: true,
        manuscriptSummary: true, targetReader: true,
      },
    })
    if (book) {
      const parts = [`Book: "${book.title}"`]
      if (book.genre) parts.push(`Genre: ${book.genre}${book.subgenre ? ' / ' + book.subgenre : ''}`)
      if (book.tropes?.length) parts.push(`Tropes: ${book.tropes.join(', ')}`)
      if (book.targetReader) parts.push(`Target reader: ${book.targetReader}`)
      if (book.blurb) parts.push(`Blurb: ${book.blurb}`)
      if (book.characterNotes) parts.push(`Characters: ${book.characterNotes}`)
      if (book.moodNotes) parts.push(`Mood/tone: ${book.moodNotes}`)
      if (book.manuscriptSummary) parts.push(`Manuscript summary: ${book.manuscriptSummary}`)
      bookContext = parts.join('\n')
    }

    // Fetch writing notebook records for context
    const notebookRecords = await db.writingNotebook.findMany({
      where: { userId: session.user.id, bookId },
      orderBy: [{ phase: 'asc' }, { chapterIndex: 'asc' }],
      select: { phase: true, section: true, chapterIndex: true, chapterTitle: true, content: true },
    })

    const outline = notebookRecords.find(r => r.section === 'storyOutline')
    const storySoFar = notebookRecords.find(r => r.section === 'storySoFar')
    const chapters = notebookRecords
      .filter(r => r.section === 'chapter' && r.content)
      .sort((a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0))

    if (outline?.content) bookContext += `\n\nStory Outline:\n${outline.content}`
    if (storySoFar?.content) bookContext += `\n\nStory So Far:\n${storySoFar.content}`
    if (chapters.length) {
      const chapterSummary = chapters
        .map(c => `Ch ${c.chapterIndex}${c.chapterTitle ? ' — ' + c.chapterTitle : ''}: ${(c.content || '').slice(0, 200)}...`)
        .join('\n')
      bookContext += `\n\nExisting chapters (previews):\n${chapterSummary}`
    }
  }

  const systemPrompt = bookContext
    ? `${WRITING_SYSTEM_PROMPT}\n\n--- BOOK CONTEXT ---\n${bookContext}\n\nCurrent phase: ${phase || 'writing'}, section: ${section || 'general'}`
    : WRITING_SYSTEM_PROMPT

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
