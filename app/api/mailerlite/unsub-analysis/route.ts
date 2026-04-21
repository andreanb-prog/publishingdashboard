// app/api/mailerlite/unsub-analysis/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const ML = 'https://connect.mailerlite.com/api'

export interface UnsubAnalysis {
  type: 'list_clean' | 'genuine_churn' | 'mixed' | 'normal'
  totalUnsubs: number
  peakDate?: string
  peakPct?: number
  organicUnsubs?: number
  organicRate?: number
}

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mailerLiteKey: true },
  })
  const apiKey = user?.mailerLiteKey || null
  if (!apiKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })

  const listSize = parseInt(req.nextUrl.searchParams.get('listSize') ?? '0', 10) || 0

  try {
    const res = await fetch(
      `${ML}/subscribers?filter[status]=unsubscribed&limit=500&sort[]=-unsubscribed_at`,
      {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'MailerLite API error' }, { status: 502 })
    }

    const json = await res.json()
    const subscribers: any[] = json.data ?? []
    const totalUnsubs: number = json.total ?? subscribers.length

    if (subscribers.length === 0) {
      return NextResponse.json({ analysis: { type: 'normal', totalUnsubs: 0 } })
    }

    // Group by date (YYYY-MM-DD)
    const dateCounts: Record<string, number> = {}
    for (const sub of subscribers) {
      const rawDate = (sub.unsubscribed_at || sub.updated_at || '') as string
      if (!rawDate) continue
      const dateKey = rawDate.slice(0, 10)
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
    }

    const dates = Object.keys(dateCounts).sort()
    const n = subscribers.length

    // Find max 48-hour window
    let maxWindowCount = 0
    let maxWindowDate = ''
    for (let i = 0; i < dates.length; i++) {
      const startMs = new Date(dates[i] + 'T00:00:00Z').getTime()
      const endMs = startMs + 48 * 60 * 60 * 1000
      let count = 0
      for (let j = i; j < dates.length; j++) {
        const dayMs = new Date(dates[j] + 'T00:00:00Z').getTime()
        if (dayMs < endMs) count += dateCounts[dates[j]]
        else break
      }
      if (count > maxWindowCount) {
        maxWindowCount = count
        maxWindowDate = dates[i]
      }
    }

    const peakPct = Math.round((maxWindowCount / n) * 100)
    const peakDate = maxWindowDate
      ? new Date(maxWindowDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : ''

    // List clean: 80%+ of the sample occurred in a single 48-hour window
    if (peakPct >= 80) {
      return NextResponse.json({
        analysis: { type: 'list_clean', totalUnsubs, peakDate, peakPct } satisfies UnsubAnalysis,
      })
    }

    const unsubRate = listSize > 0 ? totalUnsubs / listSize : 0
    const organicUnsubs = n - maxWindowCount

    // Mixed: notable spike + elevated overall churn rate
    if (peakPct >= 50 && unsubRate > 0.005) {
      const organicRate = listSize > 0
        ? Math.round((organicUnsubs / listSize) * 1000) / 10
        : 0
      return NextResponse.json({
        analysis: { type: 'mixed', totalUnsubs, peakDate, peakPct, organicUnsubs, organicRate } satisfies UnsubAnalysis,
      })
    }

    // Genuine churn: elevated rate, no obvious spike
    if (unsubRate > 0.005) {
      return NextResponse.json({
        analysis: {
          type: 'genuine_churn',
          totalUnsubs,
          organicRate: Math.round(unsubRate * 1000) / 10,
        } satisfies UnsubAnalysis,
      })
    }

    return NextResponse.json({ analysis: { type: 'normal', totalUnsubs } satisfies UnsubAnalysis })
  } catch (error) {
    console.error('[MailerLite unsub-analysis]', error)
    return NextResponse.json({ error: 'Failed to fetch unsub data' }, { status: 500 })
  }
}
