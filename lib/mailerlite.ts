// lib/mailerlite.ts
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

const ML_BASE = 'https://connect.mailerlite.com/api'

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // ── Active subscriber count ─────────────────────────────────────
  // Try multiple approaches to get the count reliably
  let listSize = 0

  // Approach 1: /subscribers with filter[status]=active
  try {
    const subsRes = await fetch(
      `${ML_BASE}/subscribers?filter[status]=active&limit=0`,
      { headers }
    )
    console.log('[MailerLite] subscribers (filtered) status:', subsRes.status)
    if (subsRes.ok) {
      const subsData = await subsRes.json()
      console.log('[MailerLite] subscribers meta:', JSON.stringify(subsData?.meta))
      console.log('[MailerLite] subscribers total:', subsData?.total)
      listSize = subsData?.meta?.total ?? subsData?.total ?? 0
    }
  } catch (e) {
    console.error('[MailerLite] subscribers filtered call failed:', e)
  }

  // Approach 2: If still 0, try /subscribers without filter (all subscribers)
  if (listSize === 0) {
    try {
      const allSubsRes = await fetch(`${ML_BASE}/subscribers?limit=0`, { headers })
      console.log('[MailerLite] subscribers (all) status:', allSubsRes.status)
      if (allSubsRes.ok) {
        const allSubsData = await allSubsRes.json()
        console.log('[MailerLite] subscribers (all) meta:', JSON.stringify(allSubsData?.meta))
        console.log('[MailerLite] subscribers (all) total:', allSubsData?.total)
        listSize = allSubsData?.meta?.total ?? allSubsData?.total ?? 0
      }
    } catch (e) {
      console.error('[MailerLite] subscribers all call failed:', e)
    }
  }

  // Approach 3: If still 0, try fetching 1 subscriber just to get the meta.total
  if (listSize === 0) {
    try {
      const oneSubRes = await fetch(`${ML_BASE}/subscribers?limit=1`, { headers })
      console.log('[MailerLite] subscribers (limit=1) status:', oneSubRes.status)
      if (oneSubRes.ok) {
        const oneSubData = await oneSubRes.json()
        console.log('[MailerLite] subscribers (limit=1) full body (2000ch):', JSON.stringify(oneSubData).slice(0, 2000))
        listSize = oneSubData?.meta?.total ?? oneSubData?.total ?? 0
      }
    } catch (e) {
      console.error('[MailerLite] subscribers limit=1 call failed:', e)
    }
  }
  console.log('[MailerLite] => resolved listSize:', listSize)

  // ── Unsubscribed count ─────────────────────────────────────────
  let totalUnsubscribes = 0
  try {
    const unsubRes = await fetch(
      `${ML_BASE}/subscribers?filter[status]=unsubscribed&limit=0`,
      { headers }
    )
    console.log('[MailerLite] unsubscribes status:', unsubRes.status)
    if (unsubRes.ok) {
      const unsubData = await unsubRes.json()
      console.log('[MailerLite] unsubscribes meta:', JSON.stringify(unsubData?.meta))
      totalUnsubscribes = unsubData?.meta?.total ?? unsubData?.total ?? 0
    }
  } catch (e) {
    console.error('[MailerLite] unsubscribes call failed:', e)
  }
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
