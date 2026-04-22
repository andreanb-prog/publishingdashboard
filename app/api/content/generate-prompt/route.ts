export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { postId, hook, pillar, phase, midjourneyStyleString } = body
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

  const post = await db.contentPost.findFirst({
    where: { id: postId, userId: session.user.id },
  })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const bookId = post.bookId
  let profile: { midjourneyStyle: string | null } | null = null
  let styleString = typeof midjourneyStyleString === 'string' ? midjourneyStyleString.trim() : ''
  if (!styleString) {
    profile = await db.contentProfile.findFirst({
      where: { userId: session.user.id, bookId },
      select: { midjourneyStyle: true },
    })
    styleString = profile?.midjourneyStyle?.trim() ?? ''
  }

  console.log('[generate-prompt] bookId:', bookId)
  console.log('[generate-prompt] styleString from body:', body.midjourneyStyleString?.slice(0, 80) || 'EMPTY')
  console.log('[generate-prompt] styleString from DB:', profile?.midjourneyStyle?.slice(0, 80) || 'NOT FOUND')
  console.log('[generate-prompt] final styleString:', styleString?.slice(0, 80) || 'EMPTY — FALLBACK USED')

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    system: 'You are a visual creative director for fiction authors. Generate a single Midjourney image prompt for a social media post.',
    messages: [{
      role: 'user',
      content: `Generate one Midjourney image prompt for this post. Hook: ${hook}. Pillar: ${pillar}. Phase: ${phase}. Return ONLY the prompt text, no explanation, no markdown.`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const midjourneyPrompt = styleString ? `${raw} ${styleString}` : raw

  await db.contentPost.update({
    where: { id: postId },
    data: { midjourneyPrompt },
  })

  return NextResponse.json({ midjourneyPrompt })
}
