export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST — the Fetch extension reads the user's Meta Ads campaign numbers IN THEIR
// OWN BROWSER (their IP, their session) and posts just the numbers here. No
// cookies, no server-side Facebook login — so nothing can trip Facebook's
// account-hijack lock. This is the lockout-safe replacement for the Browserbase
// Meta sync.
// Auth: per-user extensionKey (Bearer).
// Body: { campaigns: [{ name, spend, impressions, clicks, ctr, cpc, results }], monthKey?: "YYYY-MM" }
interface IncomingCampaign {
  name:        string
  spend?:      number
  impressions?: number
  clicks?:     number
  ctr?:        number
  cpc?:        number
  results?:    number
  reach?:      number
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const key = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!key) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { extensionKey: key },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let campaigns: IncomingCampaign[] | undefined
  let monthKey = currentMonthKey()
  try {
    const body = await req.json()
    campaigns = Array.isArray(body?.campaigns) ? body.campaigns : undefined
    if (typeof body?.monthKey === 'string' && /^\d{4}-\d{2}$/.test(body.monthKey)) monthKey = body.monthKey
  } catch { /* handled below */ }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ error: 'No campaign data received.' }, { status: 400 })
  }

  const monthDate = new Date(`${monthKey}-01T00:00:00.000Z`)
  let rows = 0
  for (const c of campaigns) {
    if (!c.name) continue
    const spend = Number(c.spend) || 0
    const results = Number(c.results) || 0
    await db.metaAdData.upsert({
      where: {
        userId_campaignName_source_monthKey: {
          userId: user.id, campaignName: c.name, source: 'fetch', monthKey,
        },
      },
      update: {
        date: monthDate,
        spend, impressions: Number(c.impressions) || 0, clicks: Number(c.clicks) || 0,
        ctr: Number(c.ctr) || 0, cpc: Number(c.cpc) || 0, results, reach: Number(c.reach) || null,
        costPerResult: results > 0 ? spend / results : null,
      },
      create: {
        userId: user.id, campaignName: c.name, source: 'fetch', monthKey,
        date: monthDate,
        spend, impressions: Number(c.impressions) || 0, clicks: Number(c.clicks) || 0,
        ctr: Number(c.ctr) || 0, cpc: Number(c.cpc) || 0, results, reach: Number(c.reach) || null,
        costPerResult: results > 0 ? spend / results : null,
      },
    })
    rows++
  }

  // Mark connected + fresh via the Fetch in-browser path. metaSyncStatus stays
  // OUT of 'connected' on purpose is NOT needed here — this path never triggers
  // the Browserbase cron. We record the sync time for the UI.
  await db.user.update({
    where: { id: user.id },
    data: { metaLastSync: new Date(), metaConnectMethod: 'fetch_inbrowser' },
  }).catch(() => undefined)

  return NextResponse.json({ ok: true, rows })
}
