// lib/mailerlite.ts
import type { MailerLiteData } from '@/types'

const ML_BASE = 'https://connect.mailerlite.com/api'

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Fetch subscriber count — total lives in meta.total, not root
  const subsRes = await fetch(`${ML_BASE}/subscribers?limit=1&filter[status]=active`, { headers })
  const subsData = await subsRes.json()
  const listSize = subsData?.meta?.total ?? subsData?.total ?? 0

  // Fetch recent campaigns (last 10)
  const campRes = await fetch(`${ML_BASE}/campaigns?limit=10&filter[status]=sent&sort=-sent_at`, { headers })
  const campData = await campRes.json()
  const campaigns = campData?.data || []

  const parsedCampaigns = campaigns.map((c: any) => ({
    name: c.name || 'Untitled',
    sentAt: c.sent_at || '',
    openRate: c.stats?.open_rate?.float ? Math.round(c.stats.open_rate.float * 1000) / 10 : 0,
    clickRate: c.stats?.click_rate?.float ? Math.round(c.stats.click_rate.float * 1000) / 10 : 0,
    unsubscribes: c.stats?.unsubscribed || 0,
  }))

  // Calculate averages from recent campaigns
  const recentCampaigns = parsedCampaigns.slice(0, 5)
  const avgOpenRate = recentCampaigns.length > 0
    ? Math.round(recentCampaigns.reduce((s: number, c: any) => s + c.openRate, 0) / recentCampaigns.length * 10) / 10
    : 0
  const avgClickRate = recentCampaigns.length > 0
    ? Math.round(recentCampaigns.reduce((s: number, c: any) => s + c.clickRate, 0) / recentCampaigns.length * 10) / 10
    : 0
  const totalUnsubs = parsedCampaigns.reduce((s: number, c: any) => s + c.unsubscribes, 0)

  return {
    listSize,
    openRate: avgOpenRate,
    clickRate: avgClickRate,
    unsubscribes: totalUnsubs,
    campaigns: parsedCampaigns,
  }
}
