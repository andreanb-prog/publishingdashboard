// app/api/mailerlite/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchMailerLiteStats } from '@/lib/mailerlite'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use the requesting user's own saved key only — no env var fallback
  let apiKey = req.headers.get('x-mailerlite-key') || null

  if (!apiKey) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { mailerLiteKey: true },
    })
    apiKey = user?.mailerLiteKey || null
  }

  if (!apiKey) return NextResponse.json({ error: 'No MailerLite API key' }, { status: 400 })

  try {
    const data = await fetchMailerLiteStats(apiKey)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('MailerLite error:', error)
    return NextResponse.json({ error: 'Failed to fetch MailerLite data' }, { status: 500 })
  }
}
