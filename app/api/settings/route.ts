// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchMailerLiteStats } from '@/lib/mailerlite'

function mask(key: string | null | undefined): string {
  if (!key || key.length < 8) return ''
  return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4)
}

// GET — return masked keys so the UI can show "key saved" state
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { apiKey: true, mailerLiteKey: true },
  })

  return NextResponse.json({
    claudeKey: user?.apiKey ? mask(user.apiKey) : null,
    mailerLiteKey: user?.mailerLiteKey ? mask(user.mailerLiteKey) : null,
  })
}

// POST — either save keys or test a MailerLite key
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Test a MailerLite key without saving it
  if (body.action === 'test-mailerlite') {
    const key = body.key?.trim()
    if (!key) return NextResponse.json({ error: 'No key provided' }, { status: 400 })
    try {
      const stats = await fetchMailerLiteStats(key)
      return NextResponse.json({ success: true, listSize: stats.listSize })
    } catch {
      return NextResponse.json({ error: 'Could not connect — check your API key' }, { status: 400 })
    }
  }

  // Save keys
  const update: { apiKey?: string; mailerLiteKey?: string } = {}
  if (typeof body.claudeKey === 'string' && body.claudeKey.trim()) {
    update.apiKey = body.claudeKey.trim()
  }
  if (typeof body.mailerLiteKey === 'string' && body.mailerLiteKey.trim()) {
    update.mailerLiteKey = body.mailerLiteKey.trim()
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
  }

  await db.user.update({ where: { id: session.user.id }, data: update })
  return NextResponse.json({ success: true })
}
