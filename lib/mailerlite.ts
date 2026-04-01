// lib/mailerlite.ts
import type { MailerLiteData, MailerLiteAutomation } from '@/types'

// Two different MailerLite APIs exist:
// - Classic v2: api.mailerlite.com/api/v2 with X-MailerLite-ApiKey header
// - New API: connect.mailerlite.com/api with Bearer token
// We try both to handle whichever key format the user has.

const ML_CLASSIC = 'https://api.mailerlite.com/api/v2'
const ML_NEW = 'https://connect.mailerlite.com/api'

async function tryFetch(url: string, headers: Record<string, string>): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(url, { headers })
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
  // Classic v2 headers
  const classicHeaders = {
    'X-MailerLite-ApiKey': apiKey,
    'Content-Type': 'application/json',
  }

  // New API headers
  const newHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // ── Subscriber count ───────────────────────────────────────────
  let listSize = 0
  let totalUnsubscribes = 0
  let usingClassic = false

  // Try classic v2 API first — /stats gives total directly
  console.log('[MailerLite] Trying classic v2 API...')
  const statsResult = await tryFetch(`${ML_CLASSIC}/stats`, classicHeaders)
  if (statsResult.ok && statsResult.data) {
    console.log('[MailerLite] Classic v2 /stats response:', JSON.stringify(statsResult.data))
    // Classic stats returns: { subscribed: 2167, unsubscribed: 45, campaigns: 12, ... }
    listSize = statsResult.data.subscribed ?? statsResult.data.active ?? statsResult.data.total ?? 0
    totalUnsubscribes = statsResult.data.unsubscribed ?? 0
    usingClassic = true
    console.log('[MailerLite] Classic v2 => listSize:', listSize, 'unsubs:', totalUnsubscribes)
  }

  // If classic didn't work, try classic subscribers endpoint
  if (listSize === 0) {
    const subResult = await tryFetch(`${ML_CLASSIC}/subscribers?limit=1&status=active`, classicHeaders)
    if (subResult.ok && subResult.data) {
      console.log('[MailerLite] Classic v2 /subscribers response keys:', Object.keys(subResult.data))
      listSize = subResult.data.total ?? subResult.data.meta?.total ?? 0
      usingClassic = listSize > 0
      console.log('[MailerLite] Classic v2 subscribers => listSize:', listSize)
    }
  }

  // If classic didn't work, try new API
  if (listSize === 0) {
    console.log('[MailerLite] Classic failed, trying new API...')
    const newSubResult = await tryFetch(`${ML_NEW}/subscribers?filter[status]=active&limit=1`, newHeaders)
    if (newSubResult.ok && newSubResult.data) {
      console.log('[MailerLite] New API /subscribers meta:', JSON.stringify(newSubResult.data?.meta))
      listSize = newSubResult.data?.meta?.total ?? newSubResult.data?.total ?? 0
      console.log('[MailerLite] New API => listSize:', listSize)
    }
  }

  // Last resort: new API without filter
  if (listSize === 0) {
    const fallback = await tryFetch(`${ML_NEW}/subscribers?limit=1`, newHeaders)
    if (fallback.ok && fallback.data) {
      console.log('[MailerLite] Fallback full body (1000ch):', JSON.stringify(fallback.data).slice(0, 1000))
      listSize = fallback.data?.meta?.total ?? fallback.data?.total ?? 0
    }
  }

  console.log('[MailerLite] FINAL listSize:', listSize)

  // ── Unsubscribes (if not already from classic /stats) ──────────
  if (totalUnsubscribes === 0 && !usingClassic) {
    const unsubResult = usingClassic
      ? await tryFetch(`${ML_CLASSIC}/subscribers?status=unsubscribed&limit=1`, classicHeaders)
      : await tryFetch(`${ML_NEW}/subscribers?filter[status]=unsubscribed&limit=0`, newHeaders)
    if (unsubResult.ok && unsubResult.data) {
      totalUnsubscribes = unsubResult.data.total ?? unsubResult.data?.meta?.total ?? 0
    }
  }
  console.log('[MailerLite] FINAL totalUnsubscribes:', totalUnsubscribes)

  // ── Campaigns ──────────────────────────────────────────────────
  const headers = usingClassic ? classicHeaders : newHeaders
  const campUrl = usingClassic
    ? `${ML_CLASSIC}/campaigns?limit=10&status=sent`
    : `${ML_NEW}/campaigns?limit=10&filter[status]=sent&sort=-sent_at`

  const campResult = await tryFetch(campUrl, headers)
  const campaigns = campResult.ok ? (campResult.data?.data ?? campResult.data ?? []) : []
  console.log('[MailerLite] campaigns count:', Array.isArray(campaigns) ? campaigns.length : 0)

  const parsedCampaigns = (Array.isArray(campaigns) ? campaigns : []).map((c: any) => {
    // Classic v2: open_rate is already a percentage (29.7)
    // New API: open_rate is { float: 0.297, string: "29.7%" }
    let openRate = 0
    let clickRate = 0

    if (usingClassic) {
      // Classic returns plain numbers as percentages
      openRate = Number(c.opened?.rate ?? c.open_rate ?? c.stats?.open_rate ?? 0)
      clickRate = Number(c.clicked?.rate ?? c.click_rate ?? c.stats?.click_rate ?? 0)
      // Classic sometimes returns as decimal (0.297), sometimes as percentage (29.7)
      if (openRate > 0 && openRate < 1) openRate = Math.round(openRate * 1000) / 10
      if (clickRate > 0 && clickRate < 1) clickRate = Math.round(clickRate * 1000) / 10
    } else {
      const rawOpen = c.stats?.open_rate?.float ?? c.stats?.open_rate ?? 0
      const rawClick = c.stats?.click_rate?.float ?? c.stats?.click_rate ?? 0
      openRate = Math.round(Number(rawOpen) * 1000) / 10
      clickRate = Math.round(Number(rawClick) * 1000) / 10
    }

    const campUnsubs = c.stats?.unsubscribes_count ?? c.stats?.unsubscribed ?? c.stats?.unsubscribe_count ?? c.unsubscribed?.count ?? 0
    const sentAt = c.sent_at || c.sends_at || c.scheduled_at || c.date_send || ''

    return {
      name: c.name || c.subject || 'Untitled',
      sentAt,
      openRate,
      clickRate,
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

  // ── Automations ────────────────────────────────────────────────
  let automations: MailerLiteAutomation[] = []
  try {
    const autoUrl = usingClassic ? `${ML_CLASSIC}/groups` : `${ML_NEW}/automations?limit=25`
    const autoResult = await tryFetch(autoUrl, headers)
    if (autoResult.ok) {
      const autoList = autoResult.data?.data ?? autoResult.data ?? []
      automations = (Array.isArray(autoList) ? autoList : []).map((a: any) => {
        const status = (a.status === 'active' || a.active) ? 'active' as const : 'paused' as const
        const subscriberCount = a.stats?.completed_subscribers_count ?? a.stats?.subscribers_count ?? a.total ?? a.active_count ?? 0
        const rawOpen = a.stats?.open_rate?.float ?? a.stats?.open_rate ?? 0
        const rawClick = a.stats?.click_rate?.float ?? a.stats?.click_rate ?? 0
        const openRate = usingClassic
          ? (Number(rawOpen) > 0 && Number(rawOpen) < 1 ? Math.round(Number(rawOpen) * 1000) / 10 : Number(rawOpen))
          : Math.round(Number(rawOpen) * 1000) / 10
        const clickRate = usingClassic
          ? (Number(rawClick) > 0 && Number(rawClick) < 1 ? Math.round(Number(rawClick) * 1000) / 10 : Number(rawClick))
          : Math.round(Number(rawClick) * 1000) / 10

        let health: 'green' | 'amber' | 'red' = 'green'
        if (status === 'paused' || subscriberCount === 0) health = 'red'
        else if (clickRate < 1) health = 'amber'

        return { name: a.name || 'Untitled', status, subscriberCount, openRate, clickRate, health }
      })
    }
  } catch { /* automations may not be available */ }

  console.log('[MailerLite] === FINAL RETURN ===')
  console.log('[MailerLite]   API:', usingClassic ? 'Classic v2' : 'New API')
  console.log('[MailerLite]   listSize:', listSize)
  console.log('[MailerLite]   avgOpenRate:', avgOpenRate)
  console.log('[MailerLite]   totalUnsubscribes:', totalUnsubscribes)
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
