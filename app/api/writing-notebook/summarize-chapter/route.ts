// app/api/writing-notebook/summarize-chapter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, chapterIndex, chapterTitle, chapterContent } = await req.json()

  if (!bookId || chapterIndex == null || !chapterContent) {
    return NextResponse.json({ error: 'bookId, chapterIndex, and chapterContent required' }, { status: 400 })
  }

  const userId = session.user.id

  // Generate summary using app-level key (not user BYOK)
  let summary: string
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Read this chapter and extract exactly three things:
1. The opening hook — the first compelling moment or line. One sentence.
2. The middle — what happens in the body of the chapter. 1-2 sentences. Be specific.
3. The closing hook — the final line or cliffhanger. One sentence.

Return ONLY this format, no preamble, no labels:
Opens: [one sentence]
[1-2 sentences for the middle]
Ends: [one sentence]

CHAPTER:
${chapterContent.slice(0, 6000)}`,
      }],
    })

    summary = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  } catch {
    return NextResponse.json({ error: 'summarization_failed' }, { status: 500 })
  }

  if (!summary) {
    return NextResponse.json({ error: 'empty_summary' }, { status: 500 })
  }

  // Build chapter summary block
  const chapterNum = chapterIndex + 1
  const heading = `**Chapter ${chapterNum}${chapterTitle ? ' \u2014 ' + chapterTitle : ''}**`
  const block = `${heading}\n${summary}`

  // Fetch existing Story So Far
  const existing = await db.writingNotebook.findFirst({
    where: { userId, bookId, phase: 'writing', section: 'storySoFar', chapterIndex: null },
  })

  let storySoFar = existing?.content ?? ''

  // Check if this chapter already has a block — replace or append
  const chapterPattern = new RegExp(`\\*\\*Chapter ${chapterNum}(\\b| ).*?\\*\\*\\n[\\s\\S]*?(?=\\n\\*\\*Chapter \\d|$)`)
  if (chapterPattern.test(storySoFar)) {
    storySoFar = storySoFar.replace(chapterPattern, block)
  } else {
    // Append in chapter number order
    // Find the right insertion point
    const blocks = storySoFar.split(/(?=\*\*Chapter \d)/).filter(b => b.trim())
    const newBlocks: string[] = []
    let inserted = false

    for (const b of blocks) {
      const match = b.match(/\*\*Chapter (\d+)/)
      const num = match ? parseInt(match[1], 10) : 0
      if (!inserted && chapterNum < num) {
        newBlocks.push(block)
        inserted = true
      }
      newBlocks.push(b.trim())
    }
    if (!inserted) newBlocks.push(block)

    storySoFar = newBlocks.join('\n\n')
  }

  storySoFar = storySoFar.trim()

  // Save updated Story So Far
  if (existing) {
    await db.writingNotebook.update({
      where: { id: existing.id },
      data: { content: storySoFar },
    })
  } else {
    await db.writingNotebook.create({
      data: { userId, bookId, phase: 'writing', section: 'storySoFar', content: storySoFar },
    })
  }

  return NextResponse.json({ success: true, summary, storySoFar })
}
