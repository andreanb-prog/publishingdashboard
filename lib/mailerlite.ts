// lib/mailerlite.ts
// MailerLite API v3 (connect.mailerlite.com) ONLY.
// Header: Authorization: Bearer {key}
// Active count:      GET /api/subscribers?filter[status]=active&limit=1       → meta.total
// Unsubscribed count: GET /api/subscribers?filter[status]=unsubscribed&limit=1 → meta.total
// DO NOT use: api.mailerlite.com/api/v2, X-MailerLite-ApiKey header, or any v2 endpoint.
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

const ML = 'https://connect.mailerlite.com/api'

async function mlFetch(path: string, apiKey: string): Promise<{ ok: boolean; data: any }> {
  const url = `${ML}${path}`
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json()
      return { ok: true, data }
    }
    console.log(`[MailerLite] ${url} returned ${res.status}`)
    return { ok: false, data: null }
  } catch (e) {
    console.error(`[MailerLite] ${url} failed:`, e)
    return { ok: false, data: null }
  }
}

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  // ── Subscriber counts ──────────────────────────────────────────
  const [activeResult, unsubResult] = await Promise.all([
    mlFetch('/subscribers?filter[status]=active&limit=1', apiKey),
    mlFetch('/subscribers?filter[status]=unsubscribed&limit=1', apiKey),
  ])

  const listSize: number = activeResult.data?.meta?.total ?? 0
  const totalUnsubscribes: number = unsubResult.data?.meta?.total ?? 0

  console.log('[MailerLite] listSize:', listSize, '| unsubscribed:', totalUnsubscribes)

  // ── Campaigns ──────────────────────────────────────────────────
  const campResult = await mlFetch('/campaigns?limit=10&filter[status]=sent&sort=-sent_at', apiKey)
  const campaigns = campResult.ok ? (campResult.data?.data ?? []) : []

  const parsedCampaigns = (Array.isArray(campaigns) ? campaigns : []).map((c: any) => {
    const rawOpen = c.stats?.open_rate?.float ?? c.stats?.open_rate ?? 0
    const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0
    const openRate = Math.round(Number(rawOpen) * 1000) / 10
    const clickRate = Math.round(Number(rawClick) * 1000) / 10
    const campUnsubs = c.stats?.unsubscribes_count ?? c.stats?.unsubscribed ?? 0
    const sentAt = c.sent_at || c.sends_at || c.scheduled_at || ''

    return {
      name: c.name || c.subject || 'Untitled',
      sentAt,
      openRate,
      clickRate,
      unsubscribes: campUnsubs,
    }
  })

  const recentCampaigns = parsedCampaigns.slice(0, 5)
  const avgOpenRate =
    recentCampaigns.length > 0
      ? Math.round(
          (recentCampaigns.reduce((s: number, c: any) => s + c.openRate, 0) / recentCampaigns.length) * 10
        ) / 10
      : 0
  const avgClickRate =
    recentCampaigns.length > 0
      ? Math.round(
          (recentCampaigns.reduce((s: number, c: any) => s + c.clickRate, 0) / recentCampaigns.length) * 10
        ) / 10
      : 0

  // ── Automations ────────────────────────────────────────────────
  let automations: MailerLiteAutomation[] = []
  try {
    const autoResult = await mlFetch('/automations?limit=25', apiKey)
    if (autoResult.ok) {
      const autoList = autoResult.data?.data ?? []
      automations = (Array.isArray(autoList) ? autoList : []).map((a: any) => {
        const status = a.enabled ? ('active' as const) : ('paused' as const)
        const subscriberCount = a.stats?.total ?? a.stats?.completed_subscribers_count ?? 0
        const rawOpen = a.stats?.open_rate?.float ?? a.stats?.open_rate ?? 0
        const rawClick = a.stats?.click_rate?.float ?? a.stats?.click_rate ?? 0
        const openRate = Math.round(Number(rawOpen) * 1000) / 10
        const clickRate = Math.round(Number(rawClick) * 1000) / 10

        let health: 'green' | 'amber' | 'red' = 'green'
        if (status === 'paused' || subscriberCount === 0) health = 'red'
        else if (clickRate < 1) health = 'amber'

        return { name: a.name || 'Untitled', status, subscriberCount, openRate, clickRate, health }
      })
    }
  } catch {
    /* automations endpoint may not be available on all plans */
  }

  console.log('[MailerLite] === FINAL ===')
  console.log('[MailerLite]   listSize:', listSize)
  console.log('[MailerLite]   unsubscribed:', totalUnsubscribes)
  console.log('[MailerLite]   avgOpenRate:', avgOpenRate)
  console.log('[MailerLite]   campaigns:', parsedCampaigns.length)
  console.log('[MailerLite]   automations:', automations.length)

  return {
    listSize,
    openRate: avgOpenRate,
    clickRate: avgClickRate,
    unsubscribes: totalUnsubscribes,
    campaigns: parsedCampaigns,
    automations,
  }
}
