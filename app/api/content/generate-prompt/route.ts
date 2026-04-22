export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId, hook, pillar, phase, midjourneyStyleString } = await req.json()
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

  const post = await db.contentPost.findFirst({
    where: { id: postId, userId: session.user.id },
  })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

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
  const styleStr = typeof midjourneyStyleString === 'string' ? midjourneyStyleString.trim() : ''
  const midjourneyPrompt = styleStr ? `${raw} ${styleStr}` : raw

  await db.contentPost.update({
    where: { id: postId },
    data: { midjourneyPrompt },
  })

  return NextResponse.json({ midjourneyPrompt })
}
