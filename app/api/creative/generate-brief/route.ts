// app/api/creative/generate-brief/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { bookTitle, phase, angle, format, hookText } = await req.json()

  const prompt = `You are a creative strategist for romance fiction ads. Write a concise ad creative brief for:
Book: ${bookTitle || 'this book'}
Phase: ${phase || 'unspecified'}
Angle: ${angle || 'unspecified'}
Format: ${format || 'unspecified'}
Hook text: ${hookText || 'none provided'}

Include: the one job this ad must do, the emotion to lead with, what to show visually, and the call to action. Keep it under 150 words.`

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
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
