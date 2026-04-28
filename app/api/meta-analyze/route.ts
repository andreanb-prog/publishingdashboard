import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = message.content.find(b => b.type === 'text')?.text || ''
  return NextResponse.json({ text })
}
