import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

function isNavFile(name: string): boolean {
  const base = name.split('/').pop() ?? ''
  return /^(toc|nav|ncx|content\.opf|package\.opf)/i.test(base)
}

async function parseEpub(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)

  const allNames = Object.keys(zip.files).filter(name => !zip.files[name].dir)

  // All HTML/XHTML files, nav/toc files sorted last
  let contentFiles = allNames
    .filter(name => /\.(html|xhtml|htm)$/i.test(name))
    .sort((a, b) => {
      const aNav = isNavFile(a) ? 1 : 0
      const bNav = isNavFile(b) ? 1 : 0
      if (aNav !== bNav) return aNav - bNav
      return a.localeCompare(b)
    })

  // If fewer than 3 HTML files, also include .xml files
  if (contentFiles.length < 3) {
    const xmlFiles = allNames
      .filter(name => /\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b))
    contentFiles = [...contentFiles, ...xmlFiles]
  }

  // Final fallback: use ALL files in the zip
  if (contentFiles.length < 3) {
    contentFiles = allNames.sort((a, b) => a.localeCompare(b))
  }

  console.log(`[parseEpub] zip has ${allNames.length} files, selected ${contentFiles.length}:`, contentFiles.slice(0, 10))

  const chunks: string[] = []
  for (const name of contentFiles) {
    try {
      const html = await zip.files[name].async('string')
      chunks.push(stripHtml(html))
    } catch (err) {
      console.warn(`[parseEpub] skipping ${name}:`, err)
    }
  }

  return chunks.join('\n\n')
}

interface ExtractedQuote {
  text: string
  context: string
}

const PRINT_PDF_ERROR =
  'This PDF appears to be a print-formatted or scanned file. Please export your manuscript directly from Vellum, Atticus, or Word as a PDF (not a print PDF) and try again. Or upload the .docx version instead.'

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
  } catch (err) {
    console.error('[extract] formData parse error:', err)
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
      if (manuscriptText.trim().length < 500) {
        console.error('[extract] PDF returned insufficient text:', manuscriptText.length, 'chars — file:', file.name)
        return NextResponse.json({ error: PRINT_PDF_ERROR }, { status: 422 })
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
  } catch (err) {
    console.error('[extract] parse error for', ext, 'file:', err)
    if (ext === 'pdf') {
      return NextResponse.json({ error: PRINT_PDF_ERROR }, { status: 422 })
    }
    if (ext === 'docx') {
      return NextResponse.json(
        { error: 'Could not read this Word file. Try saving as .docx (not .doc) and uploading again.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Could not parse file.' }, { status: 422 })
  }

  const manuscriptExcerpt = manuscriptText.slice(0, 20000)

  if (!manuscriptExcerpt.trim()) {
    return NextResponse.json(
      { error: 'File appears empty — try a different format.' },
      { status: 400 }
    )
  }

  let rawQuotes: ExtractedQuote[] = []

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
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

Return ONLY a JSON array of objects. No preamble, no explanation, no markdown fences.
Each object must have "text" (the quote) and "context" (one sentence describing the scene or emotional moment this quote is from).
Example: [{"text": "quote one", "context": "From the scene where they first meet at the bar"}, {"text": "quote two", "context": "The morning after he leaves without saying goodbye"}]

Manuscript excerpt:
${manuscriptExcerpt}`,
        },
      ],
    })

    const responseText = message.content?.[0]?.type === 'text' ? message.content[0].text.trim() : '[]'
    const parsed = JSON.parse(responseText)
    if (Array.isArray(parsed)) {
      rawQuotes = parsed.filter(
        (q): q is ExtractedQuote => q && typeof q === 'object' && typeof q.text === 'string'
      )
    }
  } catch (err) {
    console.error('[extract] Claude extraction error:', err)
    return NextResponse.json({ error: 'extraction_failed' }, { status: 500 })
  }

  await db.storyPostQuote.deleteMany({
    where: { projectId: params.id, source: 'manuscript' },
  })

  const created = await db.storyPostQuote.createManyAndReturn({
    data: rawQuotes.slice(0, 30).map((q) => ({
      projectId: params.id,
      text: q.text.trim(),
      context: typeof q.context === 'string' ? q.context.trim() : null,
      selected: true,
      source: 'manuscript',
    })),
    select: { id: true, text: true, context: true, selected: true, source: true },
  })

  return NextResponse.json({ quotes: created })
}
