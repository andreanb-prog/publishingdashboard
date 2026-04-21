// app/api/mailerlite/campaigns/route.ts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const ML = 'https://connect.mailerlite.com/api'
const UNSUB_SPIKE_THRESHOLD = 0.6 // percent

export interface LiveCampaign {
  id: string
  name: string
  subject: string
  sentAt: string
  sent: number
  openRate: number
  clickRate: number
  unsubscribes: number
  unsubscribeRate: number
  clickToOpenRate: number
  isSpike: boolean
}

export interface FlaggedCampaign {
  name: string
  subject: string
  unsubscribeRate: number
  sentAt: string
}

export async function GET(req: NextRequest) {
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

  try {
    const res = await fetch(
      `${ML}/campaigns?filter[status]=sent&limit=10&sort=-sent_at`,
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
    const raw: any[] = json.data ?? []

    const campaigns: LiveCampaign[] = raw.map((c: any) => {
      const rawOpen  = c.stats?.open_rate?.float  ?? c.stats?.open_rate  ?? 0
      const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0
      const openRate   = Math.round(Number(rawOpen)  * 1000) / 10
      const clickRate  = Math.round(Number(rawClick) * 1000) / 10
      const unsubscribes = c.stats?.unsubscribes_count ?? c.stats?.unsubscribed ?? 0
      const sent = c.stats?.sent_count ?? c.stats?.emails_sent ?? c.emails_count ?? 0
      const sentAt  = c.finished_at || c.sent_at || c.sends_at || c.scheduled_at || ''
      const subject = c.emails?.[0]?.subject ?? c.subject ?? c.name ?? 'Untitled'
      const name    = c.name ?? c.subject ?? 'Untitled'

      const unsubscribeRate  = sent > 0 ? Math.round((unsubscribes / sent) * 10000) / 100 : 0
      const clickToOpenRate  = openRate > 0 ? Math.round((clickRate / openRate) * 1000) / 10 : 0

      return {
        id: String(c.id ?? ''),
        name,
        subject,
        sentAt,
        sent,
        openRate,
        clickRate,
        unsubscribes,
        unsubscribeRate,
        clickToOpenRate,
        isSpike: unsubscribeRate > UNSUB_SPIKE_THRESHOLD,
      }
    })

    // Flagged = worst spike among campaigns that crossed the threshold
    const spiked = campaigns
      .filter(c => c.isSpike)
      .sort((a, b) => b.unsubscribeRate - a.unsubscribeRate)

    const flaggedCampaign: FlaggedCampaign | null = spiked.length > 0
      ? {
          name: spiked[0].name,
          subject: spiked[0].subject,
          unsubscribeRate: spiked[0].unsubscribeRate,
          sentAt: spiked[0].sentAt,
        }
      : null

    return NextResponse.json({ campaigns, flaggedCampaign })
  } catch (error) {
    console.error('[MailerLite campaigns]', error)
    return NextResponse.json({ error: 'Failed to fetch campaign data' }, { status: 500 })
  }
}
