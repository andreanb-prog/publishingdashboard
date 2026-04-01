// app/api/mailerlite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchMailerLiteStats } from '@/lib/mailerlite'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = req.headers.get('x-mailerlite-key') || process.env.MAILERLITE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No MailerLite API key' }, { status: 400 })

  try {
    const data = await fetchMailerLiteStats(apiKey)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('MailerLite error:', error)
    return NextResponse.json({ error: 'Failed to fetch MailerLite data' }, { status: 500 })
  }
}
