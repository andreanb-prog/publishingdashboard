export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mailerLiteKey: true },
  })
  const apiKey = user?.mailerLiteKey || null

  if (!apiKey) return NextResponse.json({ groups: [] })

  try {
    const res = await fetch('https://connect.mailerlite.com/api/groups?limit=25', {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return NextResponse.json({ groups: [] })
    const json = await res.json()
    const groups = (json.data ?? []).map((g: { id: unknown; name?: string; active_count?: unknown; active_subscribers_count?: unknown }) => ({
      id: String(g.id),
      name: g.name ?? 'Unnamed Group',
      active_subscribers_count: Number(g.active_count ?? g.active_subscribers_count ?? 0),
    }))
    return NextResponse.json({ groups })
  } catch {
    return NextResponse.json({ groups: [] })
  }
}
