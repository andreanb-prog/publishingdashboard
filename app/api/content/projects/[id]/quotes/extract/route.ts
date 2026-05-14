import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await db.storyPostProject.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const manuscriptExcerpt = typeof body?.manuscriptExcerpt === 'string'
    ? body.manuscriptExcerpt.slice(0, 14000)
    : ''

  if (!manuscriptExcerpt) {
    return NextResponse.json({ error: 'manuscriptExcerpt required' }, { status: 400 })
  }

  let rawQuotes: string[] = []

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      system: 'You are a romance book editor with a perfect eye for quotable lines. You know what makes readers stop scrolling, screenshot, and send to a friend.',
      messages: [
        {
          role: 'user',
          content: `Extract exactly 30 of the most quotable lines from this manuscript. Prioritize:
- Lines about longing, wanting, the almost-moment
- Emotionally devastating lines
- Sharp or witty one-liners
- Lines so specific they feel universal
- Sentences so beautiful they hurt a little
- Lines readers will recognize as deeply true

Do NOT extract plot summary lines, dialogue tags, or scene-setting description.

Return ONLY a JSON array of strings. No preamble, no explanation, no markdown fences.
Example: ["quote one", "quote two"]

Manuscript excerpt:
${manuscriptExcerpt}`,
        },
      ],
    })

    const responseText = message.content?.[0]?.type === 'text' ? message.content[0].text.trim() : '[]'
    rawQuotes = JSON.parse(responseText)
    if (!Array.isArray(rawQuotes)) rawQuotes = []
  } catch {
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 })
  }

  // Delete any previously extracted manuscript quotes before saving fresh batch
  await db.storyPostQuote.deleteMany({
    where: { projectId: params.id, source: 'manuscript' },
  })

  const created = await db.storyPostQuote.createManyAndReturn({
    data: rawQuotes.slice(0, 30).map((text: unknown) => ({
      projectId: params.id,
      text: typeof text === 'string' ? text.trim() : String(text),
      selected: true,
      source: 'manuscript',
    })),
    select: { id: true, text: true, selected: true, source: true },
  })

  return NextResponse.json({ quotes: created })
}
