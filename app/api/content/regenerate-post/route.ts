export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId, bookId, phase, pillar, platform, day, readerAvatar, voiceProfile, coreFeelings } = await req.json()
  if (!postId || !bookId) return NextResponse.json({ error: 'postId and bookId required' }, { status: 400 })

  const book = await db.book.findFirst({
    where: { id: bookId, userId: session.user.id },
    select: { title: true, blurb: true, tropes: true, genre: true, subgenre: true, seriesName: true, characterNotes: true },
  })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const systemPrompt = `You are a social media strategist specializing in indie fiction publishing. You understand what drives virality on Pinterest and Instagram in the book community — emotional resonance over promotion, reader identity content, atmospheric visuals, and the 5:1 rule (five non-promotional posts for every one that mentions the book). You write like a human, not a marketer. You know that the best performing content never leads with the book — it makes the reader feel seen first.`

  const userPrompt = `Regenerate a single social media post for this book.

Book: ${book.title}
Genre: ${book.genre ?? ''}${book.subgenre ? ` / ${book.subgenre}` : ''}
Tropes: ${book.tropes?.join(', ') ?? ''}
Blurb: ${book.blurb ?? ''}

Reader Avatar: ${readerAvatar ?? ''}
Core Feelings: ${Array.isArray(coreFeelings) ? coreFeelings.join(', ') : coreFeelings ?? ''}
Voice Profile: ${voiceProfile ?? ''}

Post details:
- Day: ${day}
- Phase: ${phase}
- Pillar: ${pillar}
- Platform: ${platform}

Return ONLY a JSON object: { "hook": string, "caption": string }
- hook: scroll-stopping first line, max 15 words
- caption: full caption, 50-150 words, no hashtags
No markdown fences, no explanation.`

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  let hook = ''
  let caption = ''
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON object found')
    const parsed = JSON.parse(raw.slice(start, end + 1))
    hook = String(parsed.hook ?? '')
    caption = String(parsed.caption ?? '')
  } catch (e) {
    console.error('[regenerate-post] parse error', e)
    return NextResponse.json({ error: 'Failed to parse response from Claude' }, { status: 500 })
  }

  await db.contentPost.update({
    where: { id: postId },
    data: { hook, caption, midjourneyPrompt: '' },
  })

  return NextResponse.json({ hook, caption })
}
