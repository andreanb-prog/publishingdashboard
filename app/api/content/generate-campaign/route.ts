export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, readerAvatar, coreFeelings, voiceProfile, visualBrief } = await req.json()
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 })

  const book = await db.book.findFirst({
    where: { id: bookId, userId: session.user.id },
    select: {
      title: true, blurb: true, tropes: true, genre: true, seriesName: true, characterNotes: true, subgenre: true,
    },
  })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const systemPrompt = `You are a social media strategist specializing in indie fiction publishing. You understand what drives virality on Pinterest and Instagram in the book community — emotional resonance over promotion, reader identity content, atmospheric visuals, and the 5:1 rule (five non-promotional posts for every one that mentions the book). You know book community culture on Pinterest and Instagram, TikTok intimately. You write like a human, not a marketer. You never use corporate language. You know that the best performing content never leads with the book — it makes the reader feel seen first. You are an expert in the psychological arc of a 30-day campaign — awareness before connection, connection before engagement, engagement before conversion. Every post you generate should feel native to the platform and resonant enough to stop a scroll.`

  const userPrompt = `Generate a 30-day social media campaign for this book.

Book: ${book.title}
Genre: ${book.genre ?? ''}${book.subgenre ? ` / ${book.subgenre}` : ''}
Series: ${book.seriesName ?? 'Standalone'}
Tropes: ${book.tropes?.join(', ') ?? ''}
Blurb: ${book.blurb ?? ''}
Characters: ${book.characterNotes ?? ''}

Reader Avatar: ${readerAvatar ?? ''}
Core Feelings: ${Array.isArray(coreFeelings) ? coreFeelings.join(', ') : coreFeelings ?? ''}
Voice Profile: ${voiceProfile ?? ''}
Visual Brief: ${typeof visualBrief === 'object' ? JSON.stringify(visualBrief) : visualBrief ?? ''}

Return a JSON array of exactly 30 post objects. Each object must have ONLY these fields:
{
  "day": number (1-30),
  "week": number (1-4),
  "phase": "awareness" | "connection" | "engagement" | "conversion",
  "pillar": "Emotional Experience" | "Reader Identity" | "World Mood Board" | "Book Mention",
  "platform": "pinterest" | "instagram",
  "hook": string (scroll-stopping first line, max 15 words),
  "caption": string (full caption, 50-150 words, no hashtags)
}

Distribution rules:
- Pillars: 9 "Emotional Experience", 9 "Reader Identity", 9 "World Mood Board", 3 "Book Mention"
- Weekly arc: Week 1 (days 1-7) = awareness, Week 2 (days 8-14) = connection, Week 3 (days 15-21) = engagement, Week 4 (days 22-30) = conversion
- Alternate platforms: roughly 50/50 pinterest and instagram
- Book Mention posts only in weeks 3-4
- Never lead with the book title in non-Book-Mention posts
- Make the reader feel seen before you mention the book

Return ONLY a raw JSON array. No markdown fences, no backticks, no explanation. Start with [ and end with ].`

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let rawPosts: Record<string, unknown>[]
  try {
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array found in response')
    rawPosts = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(rawPosts)) throw new Error('Not an array')
  } catch (e) {
    console.error('[generate-campaign] parse error', e, 'raw:', raw.slice(0, 500))
    return NextResponse.json({ error: 'Failed to parse campaign from Claude' }, { status: 500 })
  }

  // Delete any existing campaign posts for this book+user
  await db.contentPost.deleteMany({ where: { userId: session.user.id, bookId } })

  const posts = await db.contentPost.createMany({
    data: rawPosts.map((p) => ({
      userId: session.user.id,
      bookId,
      campaignId,
      day: Number(p.day) || 1,
      week: Number(p.week) || 1,
      phase: String(p.phase ?? 'awareness'),
      pillar: String(p.pillar ?? 'Emotional Experience'),
      hook: String(p.hook ?? ''),
      caption: String(p.caption ?? ''),
      imagePrompt: String(p.imagePrompt ?? ''),
      midjourneyPrompt: String(p.midjourneyPrompt ?? ''),
      freepikPrompt: String(p.freepikPrompt ?? ''),
      platform: String(p.platform ?? 'instagram'),
      scheduledDate: addDays(today, Number(p.day ?? 1)),
      status: 'draft',
    })),
  })

  const created = await db.contentPost.findMany({
    where: { userId: session.user.id, campaignId },
    orderBy: { day: 'asc' },
  })

  return NextResponse.json({ posts: created, campaignId, count: posts.count })
}
