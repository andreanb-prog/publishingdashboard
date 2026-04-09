// app/api/debug/mailerlite/route.ts
// Calls MailerLite API directly and returns the raw response for debugging.
// Remove this file before shipping to production.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.MAILERLITE_API_KEY

  const result: Record<string, unknown> = {
    envKeyExists: !!apiKey,
    envKeyPrefix: apiKey?.slice(0, 8) ?? null,
  }

  if (!apiKey) {
    return NextResponse.json({ ...result, error: 'MAILERLITE_API_KEY not set' }, { status: 400 })
  }

  try {
    const url = 'https://connect.mailerlite.com/api/subscribers/stats'
    console.log('[debug/mailerlite] fetching:', url)
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    const responseText = await res.text()
    let parsedBody: unknown = null
    try { parsedBody = JSON.parse(responseText) } catch {}
    console.log('[debug/mailerlite] stats response:', responseText.slice(0, 200))

    result.status = res.status
    result.ok = res.ok
    result.rawBody = responseText.slice(0, 500)
    result.parsedBody = parsedBody
    result.listSize = (parsedBody as any)?.active ?? (parsedBody as any)?.total ?? null
    result.unsubscribed = (parsedBody as any)?.unsubscribed ?? null

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ ...result, fetchError: e?.message ?? String(e) }, { status: 500 })
  }
}
