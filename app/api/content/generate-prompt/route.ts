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

  const pillarTemplate: Record<string, string> = {
    'Emotional Experience': 'lone woman in open landscape, back to camera, warm golden backlight, linen or cream clothing',
    'Reader Identity': 'intimate detail shot — hands holding a book, wine glass on wooden railing, bare feet on warm wood',
    'World Mood Board': 'wide establishing landscape shot at golden hour — vineyard rows, rolling hills, lakeside dock, wildflower meadow, rustic farmhouse exterior',
    'Book Mention': 'woman reading in warm light, soft golden hour, cozy intimate setting, book as a detail not a focal point',
  }

  const baseTemplate = pillarTemplate[pillar] ?? pillarTemplate['Emotional Experience']

  const userPromptText = `Generate one Midjourney image prompt for this social media post.

Pillar: ${pillar}
Phase: ${phase}
Post hook: ${hook}

Start from this visual template: ${baseTemplate}

Then add 2-3 specific visual details that connect to the emotional theme of the hook. Keep it warm, grounded, and hopeful.

The style string will be appended separately — do not include --ar, --v, or --style parameters.
Do not include --no parameters — those will be appended separately.

Return ONLY the descriptive image content (subject, light, mood, style). No parameters. No explanation. No markdown.`

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    system: `You are a visual creative director specializing in romance fiction author branding. You generate Midjourney image prompts that are warm, grounded, and romantic — never dark, moody, or cinematic.

VISUAL RULES — these apply to every single prompt you generate, no exceptions:
- Light: always warm — golden hour, soft morning light, dappled sunlight. Never overcast, dramatic, or cold.
- Mood: hopeful, intimate, grounded. Never melancholic, broken, fragmented, or introspective-dark.
- Color: warm earth tones — cream, amber, honey, terracotta, dusty sage. Never muted gray, cold blue, or desaturated.
- Figures: backs to camera, faces turned away, or hands/details only. Never direct eye contact, never posed.
- Settings: open landscapes, vineyards, lakesides, rustic interiors, rolling meadows, farmhouse exteriors. Never urban grit, abandoned spaces, dramatic architecture, or small towns/streets.
- NEVER include: broken objects, mirrors, dramatic shadows, cold lighting, moody atmosphere, fragmented imagery, emotional vulnerability as darkness.

PILLAR VISUAL TEMPLATES — use these as your starting point:
- Emotional Experience: lone woman in open landscape, back to camera, warm golden backlight, linen or cream clothing
- Reader Identity: intimate detail shot — hands holding a book, wine glass on a railing, bare feet on warm wood, steaming mug on a porch
- World Mood Board: wide establishing shot — vineyard rows at golden hour, lakeside dock at sunrise, rolling meadow with wildflowers, rustic farmhouse porch at dusk, orchard in soft morning light. NEVER small towns, streets, architecture, or anything that could read gothic or dark academic.
- Book Mention: same warm aesthetic, subtle book or reading element, never a book cover close-up

NEGATIVE PROMPTS — always end every prompt with:
--no dark backgrounds, moody lighting, cold tones, broken objects, mirrors, dramatic shadows, cinematic darkness, stock photo feel, urban grit, abandoned spaces, sad expressions, gothic, dark academic, Victorian architecture, church steeples, foggy streets, purple sky, stormy atmosphere, bare trees, autumn decay, silhouettes`,
    messages: [{
      role: 'user',
      content: userPromptText,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  const NEGATIVE_PARAMS = '--no dark backgrounds, moody lighting, cold tones, broken objects, mirrors, dramatic shadows, cinematic darkness, stock photo feel, urban grit, abandoned spaces, sad expressions, gothic, dark academic, Victorian architecture, church steeples, foggy streets, purple sky, stormy atmosphere, bare trees, autumn decay, silhouettes'
  const STYLE_PARAMS = '--ar 4:5 --style raw --v 6'

  const midjourneyPrompt = styleString
    ? `${raw}, ${styleString} ${NEGATIVE_PARAMS} ${STYLE_PARAMS}`
    : `${raw} ${NEGATIVE_PARAMS} ${STYLE_PARAMS}`

  await db.contentPost.update({
    where: { id: postId },
    data: { midjourneyPrompt },
  })

  return NextResponse.json({ midjourneyPrompt })
}
