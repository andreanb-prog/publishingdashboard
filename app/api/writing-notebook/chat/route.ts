// app/api/writing-notebook/chat/route.ts — GET history + DELETE clear + POST streaming
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || null

  const messages = await db.writingNotebookChat.findMany({
    where: { userId: session.user.id, bookId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ data: messages.reverse() })
}

export async function DELETE(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookId = req.nextUrl.searchParams.get('bookId') || null

  await db.writingNotebookChat.deleteMany({
    where: { userId: session.user.id, bookId },
  })

  return NextResponse.json({ success: true })
}

function buildSystemPrompt(
  bookTitle: string,
  workbookData: Record<string, string>,
  styleGuide: any,
  user: { writingKillList: string | null },
  activePhase: string,
) {
  const niche = styleGuide?.niche || 'not specified'
  const pov = styleGuide?.pov || 'not specified'
  const tense = styleGuide?.tense || 'not specified'
  const totalWordCount = styleGuide?.totalWordCount || 'not specified'
  const chapterWordCount = styleGuide?.chapterWordCount || 'the length specified in your style guide'
  const tropes = styleGuide?.tropes || 'not specified'
  const personalStylePreferences = styleGuide?.personalStylePreferences || ''

  const globalKills: { word: string }[] = user.writingKillList
    ? JSON.parse(user.writingKillList) : []
  const bookKills: { word: string }[] = styleGuide?.killList ?? []
  const allKillWords = Array.from(new Set([...globalKills, ...bookKills].map(k => k.word)))

  const killListBlock = allKillWords.length > 0 ? `
AUTHOR'S PERSONAL KILL LIST — never use these, ever:
${allKillWords.join(', ')}
Treat this as absolute.
` : ''

  const antiSlopEnabled = styleGuide?.aiRules?.antiSlopEnabled ?? true
  const writingFormulaEnabled = styleGuide?.aiRules?.writingFormulaEnabled ?? true

  const writingFormulaBlock = writingFormulaEnabled ? `
WRITING FORMULA:
- Hook readers in the first paragraph — start in the middle of the action
- Introduce key tropes or genre signals within the first 500 words
- Every chapter ends with a cliffhanger, question, or hook
- Short sentences and paragraphs (1-3 sentences max)
- Show don't tell
- Minimize dialogue tags
- Balance dialogue, action, and internal thought
- Match the tone and content level set in Writing Style above
` : ''

  // Tier A — always injected
  const tierA = `
CHICAGO STYLE PUNCTUATION — follow strictly:
- Commas and periods always INSIDE quotation marks: "Like this," she said.
- Always use Oxford comma: red, white, and blue
- Em dashes NO spaces: He walked in—she froze.
- Em dash for interruption: "I just wanted to—"
- Ellipsis WITH spaces: "I don't know . . ."
- Never ellipsis for interruption — use em dash
- Dialogue tag comma + lowercase: "Come in," she whispered.
- No tag = period: "Come in." She opened the door.
- Single quotes inside double: "She said 'never' and meant it."
- En dash for ranges: pages 10–20
- Hyphen for compounds: well-known, self-aware

NEVER use these mechanical AI transitions regardless of any other settings:
Moreover, Furthermore, Additionally, That said,
It was clear that, Needless to say, It goes without saying,
Bold Word: Colon explanation structure

TIME AND DATE RULES:
- NEVER use calendar date/month/day as atmospheric filler
- Calendar anchors are PLOT FACTS — only when story requires it
- For atmosphere use time of day: just past midnight, late afternoon, the gray hour before dawn
- If calendar anchor needed, flag it: [TIMELINE ANCHOR: Friday, early November]
- Seasons ok as loose atmosphere — avoid specific months unless plot-required
- Never invent a day of the week unless outline specifies it
`

  const antiSlopBlock = antiSlopEnabled ? `
ANTI-SLOP RULES — follow strictly, no exceptions:

BANNED WORDS — never use:
delve, unpack, tapestry, navigate (emotions), testament, nuanced,
profound, visceral, palpable, synergy, holistic,
"electricity"/"butterflies" as attraction metaphors,
"breath caught in her throat", "heart raced" as filler,
"Something about him/her", "more than she cared to admit",
"against her better judgment" as default,
"little did she know" unless deliberate foreshadowing,
"It was the kind of [X] that..." as default opener

BANNED OPENERS:
Moreover, Furthermore, Additionally, That said,
It was clear that, Needless to say, It goes without saying,
"In that moment" as default opener

BANNED ENDINGS:
- Generic emotional summary applicable to any story
- Closing line that feels universal without character names
- "She had a feeling things were about to change" vagueness

BANNED MECHANICS:
- Adverb + weak verb — cut adverb, find stronger verb
- "Not fear. Something else." used reflexively — earn it or cut
- "Not this. Not now." staccato as default — earn it or cut
- Telling emotions: "she felt confused" — show it
- Over-explaining reactions — trust the reader

REQUIRED:
- Specific detail beats general impression every time
- Ground every scene in the character's body
- Every ending specific to THIS story, THESE characters
- Every dialogue line reveals character AND advances scene
- Never explain the metaphor. Never tell the reader how to feel.
` : ''

  const outline = (workbookData['setup:storyOutline'] || '').slice(0, 2000)
  const charBible = (workbookData['setup:characterBible'] || '').slice(0, 1500)
  const storySoFar = (workbookData['writing:storySoFar'] || '').slice(0, 1500)

  return `You are a fiction writing assistant helping the author write ${bookTitle || 'their book'}.

STORY SPECIFICATIONS:
- Genre: ${niche}
- POV: ${pov}
- Tense: ${tense}
- Target: ${totalWordCount} words total, ${chapterWordCount} per chapter
- Tropes: ${tropes}

STORY OUTLINE:
${outline || 'Not yet provided.'}

CHARACTER BIBLE:
${charBible || 'Not yet provided.'}

WRITING STYLE:
${personalStylePreferences || 'Not yet specified.'}

STORY SO FAR:
${storySoFar || 'Not yet started.'}
${writingFormulaBlock}${tierA}${antiSlopBlock}${killListBlock}
CURRENT PHASE: ${activePhase}

When writing a chapter, respond with ONLY the chapter prose — no preamble, no notes, no "Here is Chapter X:". Just the story, ready to use.
Target ${chapterWordCount} per chapter.
Always end with a hook or cliffhanger.`
}

export async function POST(req: NextRequest) {
  try {
    console.log('[chat] POST hit, env key exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('[chat] step 1: getting session')
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.log('[chat] step 2: parsing body')
    const { bookId, bookTitle, message, activePhase, workbookData, styleGuide } = await req.json()
    console.log('[chat] step 3: fetching user, bookId:', bookId)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { anthropicApiKey: true, writingKillList: true },
    })
    console.log('[chat] step 4: got user, has key:', !!user?.anthropicApiKey)

    let apiKey: string
    if (user?.anthropicApiKey) {
      try {
        apiKey = decrypt(user.anthropicApiKey)
      } catch {
        return NextResponse.json({ error: 'invalid_key' }, { status: 403 })
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      console.log('[writing-notebook/chat] No user key — falling back to ANTHROPIC_API_KEY env var')
      apiKey = process.env.ANTHROPIC_API_KEY
    } else {
      return NextResponse.json({ error: 'no_api_key' }, { status: 403 })
    }

    // Get last 20 messages for context
    const history = await db.writingNotebookChat.findMany({
      where: { userId: session.user.id, bookId: bookId ?? null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    const messages: { role: 'user' | 'assistant'; content: string }[] = history
      .reverse()
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Append the new user message
    messages.push({ role: 'user', content: message })

    // Load Book.storyContent as fallback for storySoFar
    let enrichedWorkbookData = { ...(workbookData || {}) }
    if (bookId && !enrichedWorkbookData['writing:storySoFar']) {
      const book = await db.book.findUnique({
        where: { id: bookId },
        select: { storyContent: true },
      })
      if (book?.storyContent) {
        enrichedWorkbookData['writing:storySoFar'] = book.storyContent
      }
    }

    console.log('[chat] building system prompt')
    const systemPrompt = buildSystemPrompt(
      bookTitle || 'their book',
      enrichedWorkbookData,
      styleGuide || {},
      { writingKillList: user?.writingKillList ?? null },
      activePhase || 'Writing',
    )

    console.log('[chat] creating anthropic client')
    const anthropic = new Anthropic({ apiKey })

    console.log('[chat] starting stream')
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err: any) {
          console.error('[chat] STREAM ERROR:', err?.message)
          console.error('[chat] STREAM ERROR status:', err?.status)
          console.error('[chat] STREAM ERROR stack:', err?.stack?.slice(0, 500))
          controller.enqueue(encoder.encode(`\n\n[ERROR:stream_failed] ${err?.message || 'unknown'}`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (outerErr: any) {
    console.error('[chat] OUTER ERROR:', outerErr?.message)
    console.error('[chat] OUTER ERROR stack:', outerErr?.stack?.slice(0, 500))
    return new Response(JSON.stringify({ error: outerErr?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
