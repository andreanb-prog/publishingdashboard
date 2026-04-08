// app/api/writing-notebook/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import mammoth from 'mammoth'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bookId = formData.get('bookId') as string | null

  if (!file || !bookId) {
    return NextResponse.json({ error: 'file and bookId required' }, { status: 400 })
  }

  // Validate file type
  if (!file.name.endsWith('.docx')) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 })
  }

  // Read file buffer and parse with mammoth
  let text: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 400 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'parse_failed', message: 'Document appears empty' }, { status: 400 })
  }

  // Truncate to fit context window
  const truncated = text.slice(0, 12000)

  // Extract content with Claude (app-level key, not user BYOK)
  let parsed: {
    storyOutline?: string
    characterBible?: string
    styleGuide?: {
      niche?: string; pov?: string; tense?: string
      totalWordCount?: string; chapterWordCount?: string
      tropes?: string; personalStylePreferences?: string
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `This is an FPA Claude Writing Workbook document.
Extract the content and return ONLY a valid JSON object.
No preamble. No markdown. No backticks. Just the JSON.

Required fields:
{
  "storyOutline": "full story outline, premise, chapter breakdown",
  "characterBible": "all character descriptions and details",
  "styleGuide": {
    "niche": "genre and sub-genre",
    "pov": "point of view (e.g. First Person Dual)",
    "tense": "Present or Past",
    "totalWordCount": "total word count target",
    "chapterWordCount": "chapter word count target",
    "tropes": "comma-separated list of tropes",
    "personalStylePreferences": "any personal style notes"
  }
}

Rules:
- Extract content from the Story Outline, Character Bible, and Writing/Style Guide sections
- If a field is not found in the document, return an empty string ""
- storyOutline and characterBible should include ALL relevant content
- Return ONLY valid JSON, nothing else

DOCUMENT:
${truncated}`,
      }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 })
  }

  const userId = session.user.id

  // Helper: upsert a setup section (chapterIndex = null)
  async function saveSection(section: string, content: string) {
    const existing = await db.writingNotebook.findFirst({
      where: { userId, bookId, phase: 'setup', section, chapterIndex: null },
    })
    if (existing) {
      await db.writingNotebook.update({ where: { id: existing.id }, data: { content } })
    } else {
      await db.writingNotebook.create({
        data: { userId, bookId, phase: 'setup', section, content },
      })
    }
  }

  if (parsed.storyOutline) await saveSection('storyOutline', parsed.storyOutline)
  if (parsed.characterBible) await saveSection('characterBible', parsed.characterBible)
  if (parsed.styleGuide) await saveSection('styleGuide', JSON.stringify(parsed.styleGuide))

  return NextResponse.json({
    success: true,
    filled: {
      storyOutline: !!parsed.storyOutline,
      characterBible: !!parsed.characterBible,
      styleGuide: !!(parsed.styleGuide?.niche || parsed.styleGuide?.tropes),
    },
  })
}
