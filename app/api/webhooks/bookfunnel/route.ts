// app/api/webhooks/bookfunnel/route.ts
// Receives BookFunnel download events and stores them per-user.
//
// BookFunnel must POST to:
//   https://authordash.io/api/webhooks/bookfunnel?uid=<userId>
// with header:
//   x-bookfunnel-secret: <user's webhook secret from Settings>
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid param' }, { status: 400 })
  }

  // Look up the user and their stored webhook secret
  let user: { id: string; books: unknown; bookfunnelWebhookSecret: string | null } | null = null
  try {
    const rows = await db.$queryRawUnsafe<
      Array<{ id: string; books: unknown; bookfunnelWebhookSecret: string | null }>
    >(
      `SELECT id, books, "bookfunnelWebhookSecret" FROM "User" WHERE id = $1 LIMIT 1`,
      uid,
    )
    user = rows[0] ?? null
  } catch {
    return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Verify the shared secret
  const incomingSecret = req.headers.get('x-bookfunnel-secret')
  if (!user.bookfunnelWebhookSecret || incomingSecret !== user.bookfunnelWebhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse payload
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    email,
    first_name,
    last_name,
    book_title,
    book_id,
    download_date,
    confirmed,
    landing_page,
  } = body as {
    email?: string
    first_name?: string
    last_name?: string
    book_title?: string
    book_id?: string
    download_date?: string
    confirmed?: boolean
    landing_page?: string
  }

  if (!email || !book_title) {
    return NextResponse.json({ error: 'Missing email or book_title' }, { status: 400 })
  }

  await db.bookFunnelDownload.create({
    data: {
      userId:      uid,
      email,
      firstName:   first_name  ?? null,
      lastName:    last_name   ?? null,
      bookTitle:   book_title,
      bookId:      book_id     ?? null,
      downloadedAt: download_date ? new Date(download_date) : new Date(),
      confirmed:   confirmed === true,
      landingPage: landing_page ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}
