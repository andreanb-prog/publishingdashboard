export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mailerLiteKey: true },
  })
  const apiKey = user?.mailerLiteKey ?? null
  if (!apiKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })

  try {
    const res = await fetch(
      `https://connect.mailerlite.com/api/groups/${params.id}`,
      {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) return NextResponse.json({ error: 'not_found' }, { status: res.status })
    const json = await res.json()
    const g = json.data ?? json
    const rawOpen = (g.open_rate as any)?.float ?? g.open_rate ?? 0
    const rawClick = (g.click_rate as any)?.float ?? g.click_rate ?? 0
    return NextResponse.json({
      id: String(g.id),
      name: g.name ?? 'Unnamed Group',
      listSize: Number(g.active_count ?? g.active_subscribers_count ?? 0),
      openRate: Math.round(Number(rawOpen) * 1000) / 10,
      clickRate: Math.round(Number(rawClick) * 1000) / 10,
      unsubscribes: Number(g.unsubscribed_count ?? 0),
      sentCount: Number(g.sent_count ?? 0),
    })
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }
}
