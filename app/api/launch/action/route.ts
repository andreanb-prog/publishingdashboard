// app/api/launch/action/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const {
    actionType,
    taskName,
    phase,
    channel,
    bookTitle,
    launchDate,
    daysToLaunch,
    adTasks,
  } = await req.json()

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
    prompt = `You are a creative strategist for romance fiction ads. Give me a Canva creative brief for the task: "${taskName}".

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
      prompt = `You are a paid ads strategist for romance fiction. Review this task: "${taskName}".

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
      prompt = `You are a paid ads strategist for romance fiction. Review this launch task: "${taskName}".

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
