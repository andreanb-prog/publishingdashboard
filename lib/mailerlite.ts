// lib/mailerlite.ts
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

const ML_BASE = 'https://connect.mailerlite.com/api'

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Active subscriber count — total lives in meta.total
  const subsRes = await fetch(
    `${ML_BASE}/subscribers?limit=1&filter%5Bstatus%5D=active`,
    { headers }
  )
  const subsData = await subsRes.json()
  console.log('[MailerLite] active subscribers raw:', JSON.stringify(subsData?.meta))
  const listSize = subsData?.meta?.total ?? subsData?.total ?? 0

  // Total unsubscribed count — from filtered subscriber endpoint
  const unsubRes = await fetch(
    `${ML_BASE}/subscribers?limit=1&filter%5Bstatus%5D=unsubscribed`,
    { headers }
  )
  const unsubData = await unsubRes.json()
  console.log('[MailerLite] unsubscribed raw:', JSON.stringify(unsubData?.meta))
  const totalUnsubscribes = unsubData?.meta?.total ?? 0

  // Recent sent campaigns
  const campRes = await fetch(
    `${ML_BASE}/campaigns?limit=10&filter%5Bstatus%5D=sent&sort=-sent_at`,
    { headers }
  )
  const campData = await campRes.json()
  console.log('[MailerLite] campaign sample (first):', JSON.stringify(campData?.data?.[0]))
  const campaigns = campData?.data ?? []

  const parsedCampaigns = campaigns.map((c: any) => {
    // Open/click rates: API returns { float: 0.297, string: "29.7%" } or plain float
    // Multiply by 100 to get percentage points
    const rawOpen  = c.stats?.open_rate?.float  ?? c.stats?.open_rate  ?? 0
    const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0

    // Unsubscribes per campaign: MailerLite v2 field is unsubscribes_count
    const campUnsubs = c.stats?.unsubscribes_count ?? c.stats?.unsubscribed ?? c.stats?.unsubscribe_count ?? 0

    // sent_at may be ISO string or null
    const sentAt = c.sent_at || c.sends_at || c.scheduled_at || ''

    return {
      name:         c.name || 'Untitled',
      sentAt,
      openRate:     Math.round(Number(rawOpen)  * 1000) / 10,
      clickRate:    Math.round(Number(rawClick) * 1000) / 10,
      unsubscribes: campUnsubs,
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

  // Fetch automations
  let automations: MailerLiteAutomation[] = []
  try {
    const autoRes = await fetch(`${ML_BASE}/automations?limit=25`, { headers })
    const autoData = await autoRes.json()
    automations = (autoData?.data ?? []).map((a: any) => {
      const status = a.status === 'active' ? 'active' as const : 'paused' as const
      const subscriberCount = a.stats?.completed_subscribers_count ?? a.stats?.subscribers_count ?? 0
      const rawOpen = a.stats?.open_rate?.float ?? a.stats?.open_rate ?? 0
      const rawClick = a.stats?.click_rate?.float ?? a.stats?.click_rate ?? 0
      const openRate = Math.round(Number(rawOpen) * 1000) / 10
      const clickRate = Math.round(Number(rawClick) * 1000) / 10

      // Health: red if paused or zero activity, amber if click < 1%, green otherwise
      let health: 'green' | 'amber' | 'red' = 'green'
      if (status === 'paused' || subscriberCount === 0) health = 'red'
      else if (clickRate < 1) health = 'amber'

      return { name: a.name || 'Untitled', status, subscriberCount, openRate, clickRate, health }
    })
  } catch { /* automations API may not be available */ }

  return {
    listSize,
    openRate:     avgOpenRate,
    clickRate:    avgClickRate,
    unsubscribes: totalUnsubscribes,
    campaigns:    parsedCampaigns,
    automations,
  }
}
