import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.anthropicApiKey) {
    return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 403 })
  }

  let apiKey: string
  try {
    apiKey = decrypt(user.anthropicApiKey)
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_key' }), { status: 400 })
  }

  const { messages, systemPrompt } = await req.json()

  const anthropic = new Anthropic({ apiKey })

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err: unknown) {
          const error = err as { status?: number }
          if (error.status === 401) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'invalid_key' })}\n\n`))
          } else if (error.status === 429) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'rate_limited' })}\n\n`))
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`))
          }
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: unknown) {
    const error = err as { status?: number }
    if (error.status === 401) {
      return new Response(JSON.stringify({ error: 'invalid_key' }), { status: 401 })
    }
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    }
    return new Response(JSON.stringify({ error: 'api_error' }), { status: 500 })
  }
}
