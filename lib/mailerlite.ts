// lib/mailerlite.ts
// MailerLite API v3 (connect.mailerlite.com) ONLY.
// Header: Authorization: Bearer {key}
// DO NOT use: api.mailerlite.com/api/v2, X-MailerLite-ApiKey header, or any v2 endpoint.
//
// SUBSCRIBER COUNTS: We fetch all groups and use the largest one (by active_count).
// This works for any user's account regardless of group names or IDs.
// Falls back to the /subscribers endpoint if the user has no groups.
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

const ML = 'https://connect.mailerlite.com/api'

async function mlFetch(path: string, apiKey: string): Promise<{ ok: boolean; data: any }> {
  const url = `${ML}${path}`
  try {
    const res = await fetch(url, {
      cache: 'no-store',
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

// ── Group stats helper — finds the largest group dynamically ──────────────────
// Uses GET /groups to list all groups, then picks the one with the most
// active subscribers. Falls back to the /subscribers endpoint if no groups exist.
export async function getMailerLiteStats(apiKey: string): Promise<{
  listSize: number; unsubscribed: number
  openRate: number; clickRate: number
  sentCount: number; bouncedCount: number
}> {
  // Fetch all groups and pick the largest
  const groupsResult = await mlFetch('/groups?limit=100', apiKey)
  const groupList: any[] = groupsResult.ok ? (groupsResult.data?.data ?? []) : []

  if (groupList.length > 0) {
    // Sort by active_count descending — largest group is the primary list
    const primary = [...groupList].sort(
      (a, b) => Number(b.active_count ?? 0) - Number(a.active_count ?? 0)
    )[0]

    const listSize     = Number(primary.active_count ?? primary.active_subscribers ?? 0)
    const unsubscribed = Number(primary.unsubscribed_count ?? primary.unsubscribed ?? 0)
    const rawOpen      = primary.open_rate?.float  ?? primary.open_rate  ?? 0
    const rawClick     = primary.click_rate?.float ?? primary.click_rate ?? 0
    const openRate     = Math.round(Number(rawOpen)  * 1000) / 10
    const clickRate    = Math.round(Number(rawClick) * 1000) / 10
    const sentCount    = primary.sent_count    ?? 0
    const bouncedCount = primary.bounced_count ?? 0

    console.log('[MailerLite] group stats (top group):', primary.name, { listSize, unsubscribed, openRate, clickRate })
    return { listSize, unsubscribed, openRate, clickRate, sentCount, bouncedCount }
  }

  // No groups — fall back to subscriber endpoint counts
  console.log('[MailerLite] no groups found, falling back to subscriber endpoint')
  const [activeRes, unsubRes] = await Promise.all([
    mlFetch('/subscribers?filter[status]=active&limit=1', apiKey),
    mlFetch('/subscribers?filter[status]=unsubscribed&limit=1', apiKey),
  ])
  const listSize     = activeRes.data?.meta?.total ?? 0
  const unsubscribed = unsubRes.data?.meta?.total  ?? 0

  console.log('[MailerLite] subscriber fallback:', { listSize, unsubscribed })
  return { listSize, unsubscribed, openRate: 0, clickRate: 0, sentCount: 0, bouncedCount: 0 }
}

export async function fetchMailerLiteStats(apiKey: string): Promise<MailerLiteData> {
  // ── Group stats (list-level open/click rates, counts) ──────────
  const { listSize, unsubscribed: totalUnsubscribes, openRate, clickRate, sentCount, bouncedCount } = await getMailerLiteStats(apiKey)
  console.log('[MailerLite] listSize:', listSize, '| unsubscribed:', totalUnsubscribes, '| openRate:', openRate, '| clickRate:', clickRate)

  // ── Campaigns ──────────────────────────────────────────────────
  const campResult = await mlFetch('/campaigns?limit=100&filter[status]=sent&sort=-sent_at', apiKey)
  console.log('[MailerLite] campaigns response ok:', campResult.ok, '| raw count:', campResult.data?.data?.length ?? 0)
  const campaigns = campResult.ok ? (campResult.data?.data ?? []) : []

  const parsedCampaigns = (Array.isArray(campaigns) ? campaigns : []).map((c: any) => {
    const rawOpen = c.stats?.open_rate?.float ?? c.stats?.open_rate ?? 0
    const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0
    const campOpenRate = Math.round(Number(rawOpen) * 1000) / 10
    const campClickRate = Math.round(Number(rawClick) * 1000) / 10
    const campUnsubs = c.stats?.unsubscribes_count ?? c.stats?.unsubscribed ?? 0
    const sentAt = c.finished_at || c.sent_at || c.sends_at || c.scheduled_at || ''

    return {
      name: c.name || c.subject || 'Untitled',
      sentAt,
      openRate: campOpenRate,
      clickRate: campClickRate,
      unsubscribes: campUnsubs,
    }
  })

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
  console.log('[MailerLite]   openRate:', openRate, '| clickRate:', clickRate)
  console.log('[MailerLite]   sentCount:', sentCount, '| bouncedCount:', bouncedCount)
  console.log('[MailerLite]   campaigns:', parsedCampaigns.length)
  console.log('[MailerLite]   automations:', automations.length)

  return {
    listSize,
    openRate,
    clickRate,
    unsubscribes: totalUnsubscribes,
    campaigns: parsedCampaigns,
    automations,
    sentCount,
    bouncedCount,
  }
}
