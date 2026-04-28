import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content.find(b => b.type === 'text')?.text || ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[meta-analyze]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
