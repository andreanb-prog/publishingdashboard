// lib/mailerlite.ts
// MailerLite API v3 (connect.mailerlite.com) ONLY.
// Header: Authorization: Bearer {key}
// DO NOT use: api.mailerlite.com/api/v2, X-MailerLite-ApiKey header, or any v2 endpoint.
//
// SUBSCRIBER COUNTS: The v3 subscribers endpoint uses cursor pagination and does NOT
// return meta.total reliably. Instead, use GET /api/groups which returns active_count
// and unsubscribed_count per group without pagination issues.
//
// Primary reader list: "Elle Wilder Readers" (group ID 181882019479815771)
//   active_count: ~1565, unsubscribed_count: ~234
// We use this group for list size and unsubscribe counts to avoid double-counting
// subscribers who belong to multiple groups.
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

const ML = 'https://connect.mailerlite.com/api'
// Primary reader group — used for accurate subscriber counts
const PRIMARY_GROUP_ID = '181882019479815771'

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

// ── Group stats helper — fetches the primary reader group directly ────────────
// Uses GET /groups/{id} which returns active_count, unsubscribed_count,
// open_rate (object with .float), click_rate (object with .float),
// sent_count, and bounced_count without pagination issues.
export async function getMailerLiteStats(apiKey: string): Promise<{
  listSize: number; unsubscribed: number
  openRate: number; clickRate: number
  sentCount: number; bouncedCount: number
}> {
  const result = await mlFetch(`/groups/${PRIMARY_GROUP_ID}`, apiKey)
  // v3 single-resource response wraps in { data: {...} }
  // Handle both object and array (paginated) response shapes
  const raw = result.data?.data ?? result.data ?? {}
  const g   = Array.isArray(raw) ? (raw[0] ?? {}) : raw

  // active_count may be returned as a string by some API versions — cast to Number
  const listSize     = Number(g.active_count ?? g.active_subscribers ?? 0)
  const unsubscribed = Number(g.unsubscribed_count ?? g.unsubscribed ?? 0)
  const rawOpen      = g.open_rate?.float  ?? g.open_rate  ?? 0
  const rawClick     = g.click_rate?.float ?? g.click_rate ?? 0
  const openRate     = Math.round(Number(rawOpen)  * 1000) / 10
  const clickRate    = Math.round(Number(rawClick) * 1000) / 10
  const sentCount    = g.sent_count    ?? 0
  const bouncedCount = g.bounced_count ?? 0

  console.log('[MailerLite] group stats:', { listSize, unsubscribed, openRate, clickRate, sentCount, bouncedCount })
  return { listSize, unsubscribed, openRate, clickRate, sentCount, bouncedCount }
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
