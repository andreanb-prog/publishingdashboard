import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NAV_RE = /^(toc|nav|ncx|content\.opf|package\.opf)/i
const CONTENT_EXT = /\.(html|xhtml|htm)$/i

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function parseEpub(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)

  const contentFiles = Object.keys(zip.files).filter(name => {
    const base = name.split('/').pop() ?? ''
    return CONTENT_EXT.test(name) && !NAV_RE.test(base)
  })

  const chunks: string[] = []
  for (const name of contentFiles) {
    const html = await zip.files[name].async('string')
    chunks.push(stripHtml(html))
  }

  return chunks.join('\n\n')
}

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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large. Export just the manuscript text without images.' },
      { status: 400 }
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const buffer = Buffer.from(await file.arrayBuffer())

  let manuscriptText = ''

  try {
    if (ext === 'pdf') {
      const pdfParse = (await import('pdf-parse')) as unknown as (buf: Buffer) => Promise<{ text: string }>
      const result = await pdfParse(buffer)
      manuscriptText = result?.text ?? ''
      if (!manuscriptText.trim()) {
        return NextResponse.json(
          { error: 'This PDF appears to be scanned. Try exporting your manuscript as a DOCX from Word or Vellum instead.' },
          { status: 422 }
        )
      }
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      manuscriptText = result?.value ?? ''
      if (!manuscriptText.trim()) {
        return NextResponse.json(
          { error: 'Could not read this Word file. Try saving as .docx (not .doc) and uploading again.' },
          { status: 422 }
        )
      }
    } else if (ext === 'epub') {
      manuscriptText = await parseEpub(buffer)
    } else {
      manuscriptText = buffer.toString('utf-8')
    }
  } catch {
    if (ext === 'pdf') {
      return NextResponse.json(
        { error: 'This PDF appears to be scanned. Try exporting your manuscript as a DOCX from Word or Vellum instead.' },
        { status: 422 }
      )
    }
    if (ext === 'docx') {
      return NextResponse.json(
        { error: 'Could not read this Word file. Try saving as .docx (not .doc) and uploading again.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Could not parse file.' }, { status: 422 })
  }

  const manuscriptExcerpt = manuscriptText.slice(0, 14000)

  if (!manuscriptExcerpt.trim()) {
    return NextResponse.json(
      { error: 'File appears empty — try a different format.' },
      { status: 400 }
    )
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
