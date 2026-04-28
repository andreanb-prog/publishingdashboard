import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (message.content.find((b: any) => b.type === 'text') as any)?.text || ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('meta-analyze route error:', err)
    return NextResponse.json({ text: '', error: String(err) }, { status: 500 })
  }
}
