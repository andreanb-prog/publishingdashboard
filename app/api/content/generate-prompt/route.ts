export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

interface VisualBrief {
  lightQuality?: string
  colorPalette?: string
  setting?: string
  mood?: string
  coupleEnergy?: string
  summary?: string
  midjourneyStyleString?: string
}

function buildSystemPrompt(
  genre: string,
  visualBrief: VisualBrief | null,
  feelings: string[],
  tropes: string[],
): string {
  const hasVisualBrief = visualBrief && (visualBrief.summary || visualBrief.mood || visualBrief.lightQuality)

  const visualWorldSection = hasVisualBrief
    ? `AUTHOR'S VISUAL WORLD (from Pinterest analysis):
- Light quality: ${visualBrief.lightQuality || 'not specified'}
- Color palette: ${visualBrief.colorPalette || 'not specified'}
- Setting: ${visualBrief.setting || 'not specified'}
- Mood: ${visualBrief.mood || 'not specified'}
- Energy: ${visualBrief.coupleEnergy || 'not specified'}
- Summary: ${visualBrief.summary || 'not specified'}`
    : `No visual brief provided. Default to warm, romantic, emotionally resonant imagery suitable for a romance novel author's Instagram. Avoid dark, gothic, or cold aesthetics.`

  const emotionalSection = feelings.length > 0
    ? `\n\nAUTHOR'S EMOTIONAL CORE: ${feelings.join(', ')}`
    : ''

  const tropesSection = tropes.length > 0
    ? `\nBOOK TROPES: ${tropes.join(', ')}`
    : ''

  return `You are a visual creative director for a ${genre || 'romance'} fiction author.

${visualWorldSection}${emotionalSection}${tropesSection}

PLATFORM REQUIREMENTS (always apply — technical requirements, not aesthetic choices):
- Photo-realistic, not illustrated, cartoon, or anime
- Instagram portrait ratio — do not include --ar, --v, or --style in your output
- Never include text, logos, or book covers in the image
- Never stock photo feel, never AI-looking, never commercial/ad aesthetic
- Figures: backs to camera, faces turned away, or hands/details only — never direct eye contact, never posed

PILLAR SHOT TYPES (structure only — apply the author's aesthetic to each):
- Emotional Experience: a person or figure that evokes the feeling in the hook. Human presence, emotional resonance.
- Reader Identity: an intimate detail shot — something the reader would own or touch. Close-up, personal scale.
- World Mood Board: a wide establishing shot of a place or environment. No people. Pure atmosphere and setting.
- Book Mention: same as World Mood Board but with a subtle reading or book element present as a detail.

AESTHETIC FIDELITY:
Generate prompts that are TRUE TO THIS AUTHOR'S VISUAL WORLD — not a generic romance aesthetic.
If their brief is dark and atmospheric, lean into that. If warm and golden, lean into that.
The visual brief above is the source of truth for all aesthetic decisions.

NEGATIVE PARAMS:
End every prompt with --no params that reflect what would look WRONG for this specific author's aesthetic.
Always include in --no: text overlays, logos, book covers, illustrated look, stock photo feel, direct eye contact, posed photography
Add aesthetic-appropriate negatives based on their visual brief:
- For warm/golden aesthetics: also add cold tones, gothic, dark backgrounds, moody lighting, cinematic darkness
- For dark/atmospheric aesthetics: also add pastel tones, bright cheerful colors, commercial warmth, stock photo smile`
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    postId,
    hook,
    pillar,
    phase,
    midjourneyStyleString,
    visualBrief: bodyVisualBrief,
    genre: bodyGenre,
    tropes: bodyTropes,
    feelings: bodyFeelings,
  } = body

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

  const visualBrief = (bodyVisualBrief as VisualBrief | null) ?? null
  const genre = typeof bodyGenre === 'string' ? bodyGenre : ''
  const tropes = Array.isArray(bodyTropes) ? bodyTropes.filter((t): t is string => typeof t === 'string') : []
  const feelings = Array.isArray(bodyFeelings) ? bodyFeelings.filter((f): f is string => typeof f === 'string') : []

  console.log('[generate-prompt] bookId:', bookId)
  console.log('[generate-prompt] genre:', genre || 'not provided')
  console.log('[generate-prompt] visualBrief.mood:', visualBrief?.mood || 'not provided')
  console.log('[generate-prompt] styleString:', styleString?.slice(0, 80) || 'EMPTY — FALLBACK USED')

  const systemPrompt = buildSystemPrompt(genre, visualBrief, feelings, tropes)

  const userPromptText = `Generate one Midjourney image prompt for this social media post.

Pillar: ${pillar}
Phase: ${phase}
Post hook: ${hook}

Generate a descriptive image prompt that:
1. Matches the shot type for this pillar (see PILLAR SHOT TYPES in your instructions)
2. Is true to this author's visual world (see visual brief in your instructions)
3. Adds 2-3 specific visual details that connect to the emotional theme of the hook
4. Ends with --no params appropriate for this author's aesthetic

Do not include --ar, --v, or --style parameters — those will be appended separately.

Return ONLY the descriptive image content followed by the --no params. No explanation. No markdown.`

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userPromptText,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  const STYLE_PARAMS = '--ar 4:5 --style raw --v 6'

  const midjourneyPrompt = styleString
    ? `${raw}, ${styleString} ${STYLE_PARAMS}`
    : `${raw} ${STYLE_PARAMS}`

  await db.contentPost.update({
    where: { id: postId },
    data: { midjourneyPrompt },
  })

  return NextResponse.json({ midjourneyPrompt })
}
