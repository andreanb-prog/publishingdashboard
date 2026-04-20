// app/api/creative/generate-brief/route.ts
import { NextRequest } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
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
  manuscriptSummary: string | null
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
  if (book.manuscriptSummary) {
    lines.push(`- Manuscript analysis: ${book.manuscriptSummary}`)
  } else if (book.manuscriptText) {
    lines.push(`- Key manuscript context: ${book.manuscriptText.slice(0, 2000).trim()}`)
  }
  return lines.length > 0 ? `Book context:\n${lines.join('\n')}\n\n` : ''
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
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
        characterNotes: true, moodNotes: true, manuscriptSummary: true, manuscriptText: true,
      },
    })
    if (book) bibleContext = buildBibleContext(book)
  }

  const hasBible = bibleContext.length > 0
  const hookInstruction = hasBible
    ? 'For the hook, pull from a real moment of tension, desire, or conflict in the manuscript context — make it feel specific and emotionally charged.'
    : 'For the hook, generate a punchy emotional line based on the angle, phase, and format — no generic phrases.'

  const prompt = `${bibleContext}You are a creative strategist for romance fiction ads. Generate an ad creative brief AND a hook line for:
Book: ${bookTitle || 'this book'}
Phase: ${phase || 'unspecified'}
Angle: ${angle || 'unspecified'}
Format: ${format || 'unspecified'}
${hookText ? `Existing hook text (improve or replace): ${hookText}` : ''}

Return ONLY valid JSON in this exact shape, no markdown, no extra text:
{"brief":"...","hook":"..."}

brief: the full creative brief — include the one job this ad must do, the emotion to lead with, what to show visually, and the call to action. Keep it under 150 words.
hook: one short punchy hook line under 15 words. ${hookInstruction} Examples: "She said yes. He had three hours to disappear." or "He was off-limits. She couldn't stop thinking about him."`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  let brief = ''
  let hook = ''
  try {
    const parsed = JSON.parse(raw)
    brief = parsed.brief ?? ''
    hook = parsed.hook ?? ''
  } catch {
    // Fallback: treat entire response as brief if JSON parse fails
    brief = raw
    hook = ''
  }

  return Response.json({ brief, hook })
}
