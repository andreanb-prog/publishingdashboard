export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postIds } = await req.json()
  if (!Array.isArray(postIds) || postIds.length === 0) {
    return NextResponse.json({ error: 'postIds array required' }, { status: 400 })
  }

  const connection = await db.tailwindConnection.findUnique({
    where: { userId: session.user.id },
  })
  if (!connection) {
    return NextResponse.json({ error: 'Tailwind not connected' }, { status: 400 })
  }

  const apiKey = connection.encryptedApiKey
  const accountId = connection.accountId

  if (!accountId) {
    return NextResponse.json({ error: 'Tailwind account ID not set' }, { status: 400 })
  }

  const posts = await db.contentPost.findMany({
    where: { id: { in: postIds }, userId: session.user.id },
  })

  const results: { postId: string; success: boolean; error?: string; tailwindId?: string }[] = []

  for (const post of posts) {
    try {
      // Create post in Tailwind
      const createRes = await fetch(`https://api.tailwindapp.com/1.1/account/${accountId}/post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `${post.hook}\n\n${post.caption}`,
          scheduled_at: post.scheduledDate.toISOString(),
          media_urls: [],
        }),
      })

      if (!createRes.ok) {
        const err = await createRes.text()
        results.push({ postId: post.id, success: false, error: err.slice(0, 200) })
        continue
      }

      const created = await createRes.json() as { resource_response?: { data?: { id?: string } } }
      const tailwindId = created?.resource_response?.data?.id

      await db.contentPost.update({
        where: { id: post.id },
        data: { status: 'scheduled' },
      })

      results.push({ postId: post.id, success: true, tailwindId })
    } catch (e) {
      results.push({ postId: post.id, success: false, error: String(e) })
    }
  }

  return NextResponse.json({ results })
}
