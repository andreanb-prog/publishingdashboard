// app/api/launch/action/route.ts
import { NextRequest } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { anthropic } from '@/lib/anthropic'
import { db } from '@/lib/db'

function buildBibleContext(book: {
  genre: string | null
  subgenre: string | null
  tropes: string[]
  customTropes: string[]
  blurb: string | null
  hookLines: string[]
  compTitles: string[]
  targetReader: string | null
  characterNotes: string | null
  moodNotes: string | null
  manuscriptSummary: string | null
  manuscriptText: string | null
}): string {
  const allTropes = [...(book.tropes ?? []), ...(book.customTropes ?? [])].join(', ')
  const lines: string[] = []
  if (book.genre) lines.push(`- Genre: ${book.genre}${book.subgenre ? ` / ${book.subgenre}` : ''}`)
  if (allTropes) lines.push(`- Tropes: ${allTropes}`)
  if (book.blurb) lines.push(`- Blurb: ${book.blurb}`)
  if ((book.hookLines ?? []).length > 0) lines.push(`- Hook lines: ${book.hookLines.join(' | ')}`)
  if ((book.compTitles ?? []).length > 0) lines.push(`- Comp titles: ${book.compTitles.join(', ')}`)
  if (book.targetReader) lines.push(`- Target reader: ${book.targetReader}`)
  if (book.characterNotes) lines.push(`- Characters: ${book.characterNotes}`)
  if (book.moodNotes) lines.push(`- Mood: ${book.moodNotes}`)
  if (book.manuscriptSummary) {
    lines.push(`- Manuscript analysis: ${book.manuscriptSummary}`)
  } else if (book.manuscriptText) {
    lines.push(`- Key manuscript context: ${book.manuscriptText.slice(0, 2000).trim()}`)
  }
  return lines.length > 0 ? `Book context:\n${lines.join('\n')}\n\n` : ''
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const {
    actionType,
    taskName,
    phase,
    channel,
    bookTitle,
    bookId,
    launchDate,
    daysToLaunch,
    adTasks,
  } = await req.json()

  let bibleContext = ''
  if (bookId) {
    const book = await db.book.findFirst({
      where: { id: bookId, userId: session.user.id },
      select: {
        genre: true, subgenre: true, tropes: true, customTropes: true,
        blurb: true, hookLines: true, compTitles: true, targetReader: true,
        characterNotes: true, moodNotes: true, manuscriptSummary: true, manuscriptText: true,
      },
    })
    if (book) bibleContext = buildBibleContext(book)
  }

  const title = bookTitle ?? 'my book'
  const launchFormatted = launchDate
    ? new Date(launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'upcoming'
  const daysLabel =
    daysToLaunch > 0
      ? `${daysToLaunch} days to launch`
      : daysToLaunch === 0
      ? 'launch day'
      : `${Math.abs(daysToLaunch)} days post-launch`

  let prompt: string

  if (actionType === 'brief') {
    prompt = `${bibleContext}You are a creative strategist for romance fiction ads. Give me a Canva creative brief for the task: "${taskName}".

Book: ${title}
Phase: ${phase}
Channel: ${channel}
Launch: ${launchFormatted} (${daysLabel})

Include:
- What this creative must accomplish
- Emotion to lead with
- Visual direction (what to show, mood, color palette)
- Text overlay suggestions
- Sizes needed (Meta feed 1080×1080, stories 1080×1920)
- Call to action

Keep it practical and specific. Under 200 words.`
  } else if (actionType === 'review') {
    const adLines =
      Array.isArray(adTasks) && adTasks.length > 0
        ? adTasks.map((t: { name: string; status: string }) => `${t.name} (${t.status.replace(/_/g, ' ')})`).join(', ')
        : null

    if (adLines) {
      prompt = `${bibleContext}You are a paid ads strategist for romance fiction. Review this task: "${taskName}".

Book: ${title}
Phase: ${phase}
Launch: ${launchFormatted} (${daysLabel})
Current ad tasks: ${adLines}

Tell me:
1. Which tasks to prioritize right now
2. What to watch out for in this phase
3. One specific action to take today

Be direct. Under 150 words.`
    } else {
      prompt = `${bibleContext}You are a paid ads strategist for romance fiction. Review this launch task: "${taskName}".

Book: ${title}
Phase: ${phase}
Channel: ${channel}
Launch: ${launchFormatted} (${daysLabel})

Tell me:
1. What this task requires to do it well
2. Common mistakes to avoid
3. One specific action to take today

Be direct. Under 150 words.`
    }
  } else {
    return new Response('Unknown action type', { status: 400 })
  }

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
