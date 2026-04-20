// app/api/mailerlite/lists/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

async function getApiKey(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mailerLiteKey: true },
  })
  return user?.mailerLiteKey || process.env.MAILERLITE_API_KEY || null
}

// GET — fetch groups from MailerLite API (for the add-list picker)
// Use GET /api/mailerlite/lists/saved to fetch the user's saved lists from the DB
export async function GET(_req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = await getApiKey(session.user.id)
  if (!apiKey) return NextResponse.json({ error: 'No MailerLite API key' }, { status: 400 })

  try {
    // Fetch all groups (MailerLite's term for lists)
    const res = await fetch('https://connect.mailerlite.com/api/groups?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[mailerlite/lists GET] API error:', res.status, text)
      return NextResponse.json({ error: 'MailerLite API error' }, { status: 502 })
    }
    const json = await res.json()
    const groups = (json.data ?? []).map((g: { id: string; name: string; active_count?: number }) => ({
      id: g.id,
      name: g.name,
      activeCount: g.active_count ?? 0,
    }))
    return NextResponse.json({ groups })
  } catch (err) {
    console.error('[mailerlite/lists GET] error:', err)
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
  }
}

// POST — save a new MailerLiteList record for the current user
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { mailerliteId, name } = body as { mailerliteId: string; name: string }

  if (!mailerliteId || !name?.trim()) {
    return NextResponse.json({ error: 'mailerliteId and name are required' }, { status: 400 })
  }

  try {
    const list = await db.mailerLiteList.create({
      data: {
        userId: session.user.id,
        mailerliteId,
        name: name.trim(),
      },
    })
    return NextResponse.json({ success: true, list })
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'P2002') {
      return NextResponse.json({ error: 'This list is already connected' }, { status: 409 })
    }
    console.error('[mailerlite/lists POST] error:', err)
    return NextResponse.json({ error: 'Failed to save list' }, { status: 500 })
  }
}
