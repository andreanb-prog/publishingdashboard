export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

const QUESTIONS = [
  "What's your reader's name, and what does her life look like?",
  "What does she reach for when she needs to escape?",
  "What line from your book would she screenshot and send to a friend?",
  "Are you warm and open, dry and witty — or somewhere in between?",
  "What do you believe about love?",
]

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, answers, visualBrief, midjourneyStyle } = await req.json()
  if (!bookId || !answers?.length) {
    return NextResponse.json({ error: 'bookId and answers required' }, { status: 400 })
  }

  const qa = QUESTIONS.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? ''}`).join('\n\n')

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `You are a brand voice specialist for indie fiction authors. Based on the author's interview answers, generate a reader profile and brand voice. Return JSON with:
- readerAvatar: string (3-4 sentences describing the ideal reader — her name, life, desires, reading habits)
- coreFeelings: string[] (exactly 5 core feelings/emotions the book delivers — short phrases like "safe to hope", "seen in my longing", "breathless with tension")
- voiceProfile: string (2-3 sentences describing the author's brand voice — how it sounds, what it prioritizes, what it avoids)

Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [
      {
        role: 'user',
        content: `Author interview:\n\n${qa}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let profile
  try {
    profile = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse profile from Claude' }, { status: 500 })
  }

  // Upsert ContentProfile (one per userId+bookId)
  const existing = await db.contentProfile.findFirst({
    where: { userId: session.user.id, bookId },
  })

  const data = {
    userId: session.user.id,
    bookId,
    readerAvatar: profile.readerAvatar ?? '',
    coreFeelings: profile.coreFeelings ?? [],
    voiceProfile: profile.voiceProfile ?? '',
    visualBrief: (visualBrief ?? {}) as object,
    midjourneyStyle: midjourneyStyle ?? '',
  }

  if (existing) {
    await db.contentProfile.update({ where: { id: existing.id }, data })
  } else {
    await db.contentProfile.create({ data })
  }

  return NextResponse.json({ profile })
}
