// app/api/mailerlite/sync/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

async function getSubscriberCount(
  apiKey: string,
  status: 'active' | 'unsubscribed',
  groupId: string,
): Promise<number> {
  const url = `https://connect.mailerlite.com/api/subscribers?limit=0&filter[status]=${status}&filter[group_id]=${groupId}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return 0
  const json = await res.json()
  return json.total ?? 0
}

export async function POST(_req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mailerLiteKey: true, mailerLiteLists: true },
  })

  const apiKey = user?.mailerLiteKey || null
  if (!apiKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })

  const lists = user?.mailerLiteLists ?? []
  if (lists.length === 0) return NextResponse.json({ success: true, updated: 0 })

  const results = await Promise.allSettled(
    lists.map(async (list) => {
      const [activeCount, unsubCount] = await Promise.all([
        getSubscriberCount(apiKey, 'active', list.mailerliteId),
        getSubscriberCount(apiKey, 'unsubscribed', list.mailerliteId),
      ])
      await db.mailerLiteList.update({
        where: { id: list.id },
        data: { activeCount, unsubCount, lastSyncedAt: new Date() },
      })
      return { id: list.id, activeCount, unsubCount }
    }),
  )

  const updated = results.filter(r => r.status === 'fulfilled').length
  const updatedLists = results
    .filter((r): r is PromiseFulfilledResult<{ id: string; activeCount: number; unsubCount: number }> => r.status === 'fulfilled')
    .map(r => r.value)

  return NextResponse.json({ success: true, updated, lists: updatedLists })
}
