import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAugmentedSession } from '@/lib/getSession'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
