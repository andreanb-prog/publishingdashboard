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
  console.log('[MailerLite] subscribers response status:', subsRes.status, subsRes.statusText)
  const subsData = await subsRes.json()
  console.log('[MailerLite] subscribers FULL response keys:', Object.keys(subsData))
  console.log('[MailerLite] subscribers meta:', JSON.stringify(subsData?.meta))
  console.log('[MailerLite] subscribers total (top-level):', subsData?.total)
  console.log('[MailerLite] subscribers data length:', subsData?.data?.length)
  console.log('[MailerLite] subscribers FULL body (first 2000 chars):', JSON.stringify(subsData).slice(0, 2000))
  const listSize = subsData?.meta?.total ?? subsData?.total ?? 0
  console.log('[MailerLite] => resolved listSize:', listSize)

  // Total unsubscribed count — from filtered subscriber endpoint
  const unsubRes = await fetch(
    `${ML_BASE}/subscribers?limit=1&filter%5Bstatus%5D=unsubscribed`,
    { headers }
  )
  console.log('[MailerLite] unsubscribes response status:', unsubRes.status, unsubRes.statusText)
  const unsubData = await unsubRes.json()
  console.log('[MailerLite] unsubscribes FULL response keys:', Object.keys(unsubData))
  console.log('[MailerLite] unsubscribes meta:', JSON.stringify(unsubData?.meta))
  console.log('[MailerLite] unsubscribes total (top-level):', unsubData?.total)
  console.log('[MailerLite] unsubscribes data length:', unsubData?.data?.length)
  console.log('[MailerLite] unsubscribes FULL body (first 2000 chars):', JSON.stringify(unsubData).slice(0, 2000))
  const totalUnsubscribes = unsubData?.meta?.total ?? unsubData?.total ?? 0
  console.log('[MailerLite] => resolved totalUnsubscribes:', totalUnsubscribes)

  // Recent sent campaigns
  const campRes = await fetch(
    `${ML_BASE}/campaigns?limit=10&filter%5Bstatus%5D=sent&sort=-sent_at`,
    { headers }
  )
  console.log('[MailerLite] campaigns response status:', campRes.status, campRes.statusText)
  const campData = await campRes.json()
  console.log('[MailerLite] campaigns FULL response keys:', Object.keys(campData))
  console.log('[MailerLite] campaigns data length:', campData?.data?.length)
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
    console.log('[MailerLite] automations response status:', autoRes.status, autoRes.statusText)
    const autoData = await autoRes.json()
    console.log('[MailerLite] automations FULL response keys:', Object.keys(autoData))
    console.log('[MailerLite] automations data length:', autoData?.data?.length)
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

  console.log('[MailerLite] === FINAL RETURN VALUES ===')
  console.log('[MailerLite]   listSize:', listSize)
  console.log('[MailerLite]   avgOpenRate:', avgOpenRate)
  console.log('[MailerLite]   avgClickRate:', avgClickRate)
  console.log('[MailerLite]   totalUnsubscribes:', totalUnsubscribes)
  console.log('[MailerLite]   campaigns count:', parsedCampaigns.length)
  console.log('[MailerLite]   automations count:', automations.length)

  return {
    listSize,
    openRate:     avgOpenRate,
    clickRate:    avgClickRate,
    unsubscribes: totalUnsubscribes,
    campaigns:    parsedCampaigns,
    automations,
  }
}
