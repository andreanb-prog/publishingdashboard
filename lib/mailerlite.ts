// lib/mailerlite.ts
import type { MailerLiteData } from '@/types'

const ML_BASE = 'https://connect.mailerlite.com/api'

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Fetch active subscriber count — total lives in meta.total
  const subsRes = await fetch(
    `${ML_BASE}/subscribers?limit=1&filter%5Bstatus%5D=active`,
    { headers }
  )
  const subsData = await subsRes.json()
  console.log('[MailerLite] subscribers response meta:', JSON.stringify(subsData?.meta ?? subsData?.total))
  const listSize = subsData?.meta?.total ?? subsData?.total ?? 0

  // Fetch recent sent campaigns
  const campRes = await fetch(
    `${ML_BASE}/campaigns?limit=10&filter%5Bstatus%5D=sent&sort=-sent_at`,
    { headers }
  )
  const campData = await campRes.json()
  console.log('[MailerLite] campaign sample (first):', JSON.stringify(campData?.data?.[0]))
  const campaigns = campData?.data ?? []

  const parsedCampaigns = campaigns.map((c: any) => {
    // Open/click rates: API may return float (0.297) or nested {float: 0.297}
    // Multiply by 100 to get percentage
    const rawOpen  = c.stats?.open_rate?.float  ?? c.stats?.open_rate  ?? 0
    const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0

    return {
      name:         c.name || 'Untitled',
      sentAt:       c.sent_at || c.sends_at || c.scheduled_at || '',
      openRate:     Math.round(Number(rawOpen)  * 1000) / 10,
      clickRate:    Math.round(Number(rawClick) * 1000) / 10,
      unsubscribes: c.stats?.unsubscribed ?? c.stats?.unsubscribe_count ?? 0,
    }
  })

  // Average from 5 most recent campaigns
  const recentCampaigns = parsedCampaigns.slice(0, 5)
  const avgOpenRate = recentCampaigns.length > 0
    ? Math.round(recentCampaigns.reduce((s: number, c: any) => s + c.openRate, 0) / recentCampaigns.length * 10) / 10
    : 0
  const avgClickRate = recentCampaigns.length > 0
    ? Math.round(recentCampaigns.reduce((s: number, c: any) => s + c.clickRate, 0) / recentCampaigns.length * 10) / 10
    : 0
  const totalUnsubs = parsedCampaigns.reduce((s: number, c: any) => s + (c.unsubscribes || 0), 0)

  return {
    listSize,
    openRate:     avgOpenRate,
    clickRate:    avgClickRate,
    unsubscribes: totalUnsubs,
    campaigns:    parsedCampaigns,
  }
}
