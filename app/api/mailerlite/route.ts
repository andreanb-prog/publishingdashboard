// app/api/mailerlite/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { fetchMailerLiteStats } from '@/lib/mailerlite'

export async function GET(req: NextRequest) {
  console.log('[mailerlite] handler called')
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let apiKey = req.headers.get('x-mailerlite-key') || null

  if (!apiKey) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { mailerLiteKey: true },
    })
    apiKey = user?.mailerLiteKey || null
  }

  if (!apiKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })

  console.log('[MailerLite route] using user DB key')

  const groupId = req.nextUrl.searchParams.get('groupId') || undefined

  try {
    const data = await fetchMailerLiteStats(apiKey, groupId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('MailerLite error:', error)
    return NextResponse.json({ error: 'Failed to fetch MailerLite data' }, { status: 500 })
  }
}
