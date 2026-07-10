// lib/mailerlite.ts
// MailerLite API v3 (connect.mailerlite.com) ONLY.
// Header: Authorization: Bearer {key}
// DO NOT use: api.mailerlite.com/api/v2, X-MailerLite-ApiKey header, or any v2 endpoint.
//
// SUBSCRIBER COUNTS: GET /subscribers?limit=0 → { total } (active by default)
// GET /subscribers?limit=0&filter[status]=unsubscribed → { total } for unsubs.
// /subscribers/stats has rates/engagement, NOT counts.
import type { MailerLiteData, MailerLiteAutomation } from '@/types'
import { db } from '@/lib/db'

const ML = 'https://connect.mailerlite.com/api'

async function mlFetch(path: string, apiKey: string): Promise<{ ok: boolean; data: any }> {
  const url = `${ML}${path}`
  console.log('[mailerlite] fetching url:', url)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    console.log('[mailerlite] response status:', res.status, 'for', path)
    if (res.ok) {
      const data = await res.json()
      return { ok: true, data }
    }
    const responseText = await res.text()
    console.log('[mailerlite] response body:', responseText.slice(0, 300))
    return { ok: false, data: null }
  } catch (e) {
    console.error(`[MailerLite] ${url} failed:`, e)
    return { ok: false, data: null }
  }
}

// ── Primary group preference ────────────────────────────────────────────────
// Authors run multiple MailerLite groups (main list, BookSweeps cold subs, ARC
// team…). The account-level /subscribers total sums ALL of them, which inflates
// the headline "list size" (Gina: 22,438 shown vs ~13.5k real main list).
// The user's chosen primary group is stored in User.columnPrefs under a
// reserved key — no schema migration needed. Null = account-level (old behavior).
const ML_PRIMARY_GROUP_PREF = '__mlPrimaryGroup'

export async function getMlPrimaryGroupId(userId: string): Promise<string | undefined> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { columnPrefs: true },
    })
    const prefs = (user?.columnPrefs as Record<string, string[]> | null) ?? {}
    const v = prefs[ML_PRIMARY_GROUP_PREF]
    return Array.isArray(v) && v[0] ? v[0] : undefined
  } catch {
    return undefined
  }
}

export { ML_PRIMARY_GROUP_PREF }

// ── Subscriber counts (simple, bulletproof) ─────────────────────────────────
// /subscribers/stats does NOT have counts — it has rates/engagement.
// /subscribers?limit=0 returns { total } for active subs (default filter).
// /subscribers?limit=0&filter[status]=unsubscribed returns unsub count.
export async function getMailerLiteStats(apiKey: string, groupId?: string) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
  }
  const opts = { headers, cache: 'no-store' as const }
  const groupFilter = groupId ? `&filter[group_id]=${encodeURIComponent(groupId)}` : ''

  const [activeRes, unsubRes] = await Promise.all([
    // Explicitly filter to ACTIVE — the default /subscribers response can include
    // unconfirmed/junk/bounced, which inflated the list-size count (Gina saw 22k
    // when her active list was ~15k).
    fetch(`https://connect.mailerlite.com/api/subscribers?limit=0&filter[status]=active${groupFilter}`, opts),
    fetch(`https://connect.mailerlite.com/api/subscribers?limit=0&filter[status]=unsubscribed${groupFilter}`, opts),
  ])

  console.log('[mailerlite] active status:', activeRes.status, '| unsub status:', unsubRes.status)
  const activeJson = await activeRes.json()
  const unsubJson = await unsubRes.json()
  console.log('[mailerlite] active body:', JSON.stringify(activeJson).slice(0, 200))
  console.log('[mailerlite] unsub body:', JSON.stringify(unsubJson).slice(0, 200))

  return {
    listSize: activeJson.total ?? 0,
    unsubscribes: unsubJson.total ?? 0,
  }
}

export async function fetchMailerLiteStats(apiKey: string, groupId?: string): Promise<MailerLiteData> {
  // ── Subscriber counts (simple endpoint) ────────────────────────
  const { listSize, unsubscribes: totalUnsubscribes } = await getMailerLiteStats(apiKey, groupId)
  console.log('[MailerLite] listSize:', listSize, '| unsubscribed:', totalUnsubscribes)

  // ── Group stats (open/click rates) ────────────────────────────
  const groupsResult = await mlFetch('/groups?limit=100', apiKey)
  let openRate = 0, clickRate = 0, sentCount = 0, bouncedCount = 0
  const groupList: any[] = groupsResult.ok ? (groupsResult.data?.data ?? []) : []
  if (groupList.length > 0) {
    const target = groupId ? groupList.find((g: any) => String(g.id) === groupId) : null
    const primary = target ?? [...groupList].sort(
      (a, b) => Number(b.active_count ?? 0) - Number(a.active_count ?? 0)
    )[0]
    const rawOpen  = primary.open_rate?.float  ?? primary.open_rate  ?? 0
    const rawClick = primary.click_rate?.float ?? primary.click_rate ?? 0
    openRate     = Math.round(Number(rawOpen)  * 1000) / 10
    clickRate    = Math.round(Number(rawClick) * 1000) / 10
    sentCount    = primary.sent_count    ?? 0
    bouncedCount = primary.bounced_count ?? 0
  }
  console.log('[MailerLite] openRate:', openRate, '| clickRate:', clickRate)

  // ── Campaigns ──────────────────────────────────────────────────
  // Note: campaign filtering by group_id requires MailerLite paid plan;
  // the filter may be silently ignored on free plans — all campaigns shown in that case
  const campPath = groupId
    ? `/campaigns?limit=100&filter[status]=sent&sort=-sent_at&filter[group_id]=${encodeURIComponent(groupId)}`
    : `/campaigns?limit=100&filter[status]=sent&sort=-sent_at`
  const campResult = await mlFetch(campPath, apiKey)
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

        return { id: a.id, name: a.name || 'Untitled', status, subscriberCount, openRate, clickRate, health }
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

// Returns null (not 0) on failure so callers can distinguish "empty list" from
// "fetch failed" and avoid overwriting good data with a transient-outage zero.
async function getSubscriberCount(
  apiKey: string,
  status: 'active' | 'unsubscribed',
  groupId: string,
): Promise<number | null> {
  const url = `${ML}/subscribers?limit=0&filter[status]=${status}&filter[group_id]=${groupId}`
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!res.ok) return null
    const json = await res.json()
    return json.total ?? 0
  } catch {
    return null
  }
}

/** Updates mailerLiteList records and writes aggregated email data into the
 *  active analysis record for the current month. Safe to call fire-and-forget. */
export async function syncMailerLiteToAnalysis(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mailerLiteKey: true, mailerLiteLists: true },
  })

  const apiKey = user?.mailerLiteKey
  if (!apiKey) return

  const lists = user?.mailerLiteLists ?? []

  // Update per-list counts and aggregate totals
  let totalActive = 0
  let totalUnsub = 0
  let anyFailed = false
  if (lists.length > 0) {
    const results = await Promise.allSettled(
      lists.map(async (list) => {
        const [activeCount, unsubCount] = await Promise.all([
          getSubscriberCount(apiKey, 'active', list.mailerliteId),
          getSubscriberCount(apiKey, 'unsubscribed', list.mailerliteId),
        ])
        // A failed fetch returns null — skip this list's DB update rather than
        // writing a 0 that would clobber the last known-good count.
        if (activeCount === null || unsubCount === null) {
          return { failed: true as const }
        }
        await db.mailerLiteList.update({
          where: { id: list.id },
          data: { activeCount, unsubCount, lastSyncedAt: new Date() },
        })
        return { failed: false as const, activeCount, unsubCount }
      }),
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && !r.value.failed) {
        totalActive += r.value.activeCount
        totalUnsub  += r.value.unsubCount
      } else {
        anyFailed = true
      }
    }
  }

  // Get open/click rates from the groups endpoint
  let openRate: number | null = null
  let clickRate: number | null = null
  try {
    const groupsRes = await fetch(`${ML}/groups?limit=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (groupsRes.ok) {
      const groupsJson = await groupsRes.json()
      const groupList: any[] = groupsJson.data ?? []
      if (groupList.length > 0) {
        const primary = [...groupList].sort(
          (a, b) => Number(b.active_count ?? 0) - Number(a.active_count ?? 0),
        )[0]
        const rawOpen  = primary.open_rate?.float  ?? primary.open_rate  ?? 0
        const rawClick = primary.click_rate?.float ?? primary.click_rate ?? 0
        openRate  = Math.round(Number(rawOpen)  * 1000) / 10
        clickRate = Math.round(Number(rawClick) * 1000) / 10
      }
    }
  } catch {
    // rates unavailable — continue without them
  }

  // If any list count failed to fetch, the aggregate would undercount the real
  // list — skip the analysis write entirely rather than persist a bad total.
  if (anyFailed) {
    console.warn('[syncMailerLiteToAnalysis] a subscriber-count fetch failed — skipping analysis write to avoid clobbering good data')
    return
  }

  // Write to the current month's analysis record
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const emailData = {
    listSize: totalActive,
    unsubscribes: totalUnsub,
    openRate,
    clickRate,
    lastSyncedAt: now.toISOString(),
  }

  const existing = await db.analysis.findFirst({
    where: { userId, month },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    const existingData = (existing.data as Record<string, unknown>) ?? {}
    await db.analysis.update({
      where: { id: existing.id },
      data: { data: { ...existingData, email: emailData } as object },
    })
    console.log(`[syncMailerLiteToAnalysis] wrote email data to analysis ${existing.id} (${month})`)
  } else {
    console.log(`[syncMailerLiteToAnalysis] no analysis record for ${month}, skipping`)
  }
}
