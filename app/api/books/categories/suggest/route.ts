// app/api/books/categories/suggest/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookTitle, tropes, description, currentCategories } = await req.json()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `You are an Amazon KDP category expert for indie fiction authors.

Current categories:
${(currentCategories ?? [])
  .map((c: { rank: number; rawPath: string }) => `- #${c.rank.toLocaleString()} in ${c.rawPath}`)
  .join('\n')}

Book details:
- Title: ${bookTitle}
- Genre/Tropes: ${tropes || 'Romance'}
- Description: ${description?.slice(0, 500) || 'Not provided'}

Suggest 3 SPECIFIC Amazon Kindle categories that would give this book
better visibility. Focus on niches where the book could rank in the
top 1000 and that match the content.

Return ONLY a JSON array, no preamble:
[
  {
    "category": "Kindle Store > Kindle eBooks > Romance > Romantic Comedy",
    "reason": "one sentence why this is better",
    "competition": "low|medium|high"
  }
]`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim())
  return Response.json({ success: true, suggestions })
}
