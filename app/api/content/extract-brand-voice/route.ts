export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'

const SYSTEM_PROMPT = `You are an expert at analyzing author brand guides and extracting the core elements needed for social media content strategy. Extract the following from the brand guide text provided and return as JSON only, no other text:

{
  "readerAvatar": "3-4 sentence vivid description of the ideal reader — who she is, how she reads, what she feels, what she needs",
  "coreFeelings": ["exactly 5 specific emotional experiences the books deliver — not themes or plot points, but feelings a reader would describe to a friend"],
  "voiceProfile": "2-3 sentences describing the author's content voice — tone, style, what makes it distinctly theirs",
  "readerName": "a first name for the reader avatar",
  "confidence": "high | medium | low (how complete the brand guide was)"
}`

async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (fileName.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  if (fileName.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as any
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push(content.items.map((item: any) => item.str ?? '').join(' '))
    }
    return pages.join('\n\n')
  }

  throw new Error('Only .txt and .pdf files are supported')
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text = ''
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    try {
      text = await extractTextFromFile(file)
    } catch (err) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 400 })
    }
  } else {
    const body = await req.json()
    text = body.text ?? ''
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'No text to extract from' }, { status: 400 })
  }

  let raw = ''
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Brand guide:\n\n${text.slice(0, 15000)}` }],
    })
    raw = message.content[0].type === 'text' ? message.content[0].text : ''
  } catch {
    return NextResponse.json({ error: "Couldn't extract enough — try the interview instead." }, { status: 500 })
  }

  let profile
  try {
    profile = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return NextResponse.json({ error: "Couldn't extract enough — try the interview instead." }, { status: 500 })
  }

  if (!profile.readerAvatar || !Array.isArray(profile.coreFeelings) || !profile.voiceProfile) {
    return NextResponse.json({ error: "Couldn't extract enough — try the interview instead." }, { status: 422 })
  }

  // Ensure exactly 5 feelings
  if (profile.coreFeelings.length < 5) {
    const pad = ['feels seen', 'safe to hope', 'breathless with tension', 'warm and known', 'swept away']
    while (profile.coreFeelings.length < 5) {
      profile.coreFeelings.push(pad[profile.coreFeelings.length])
    }
  }
  profile.coreFeelings = profile.coreFeelings.slice(0, 5)

  return NextResponse.json({ profile })
}
