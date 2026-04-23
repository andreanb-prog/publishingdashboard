// app/api/meta/sync-all/route.ts — Cron: sync all connected Meta accounts
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

export async function GET() {
  console.log('[Meta Sync-All] Starting cron sync...')

  try {
    // Find all users with Meta connected
    const users = await db.user.findMany({
      where: { metaAccessToken: { not: null }, metaAdAccountId: { not: null } },
      select: { id: true, metaAccessToken: true, metaAdAccountId: true, metaTokenExpires: true },
    })

    console.log('[Meta Sync-All] Found', users.length, 'connected users')

    let synced = 0
    let errors = 0

    for (const user of users) {
      // Skip expired tokens
      if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
        console.log('[Meta Sync-All] Token expired for user:', user.id)
        errors++
        continue
      }

      try {
        // Pull last 7 days of data
        const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
        const until = new Date().toISOString().split('T')[0]
        const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc,reach'
        const url = `${GRAPH_URL}/${user.metaAdAccountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=50&access_token=${user.metaAccessToken}`

        const res = await fetch(url)
        const json = await res.json()

        if (json.error) {
          console.error('[Meta Sync-All] API error for user', user.id, ':', json.error.message)
          errors++
          continue
        }

        // Update last sync time
        await db.user.update({ where: { id: user.id }, data: { metaLastSync: new Date() } })

        synced++
        console.log('[Meta Sync-All] Synced user:', user.id, 'campaigns:', json.data?.length || 0)
      } catch (err) {
        console.error('[Meta Sync-All] Error for user', user.id, ':', err)
        errors++
      }
    }

    console.log('[Meta Sync-All] Done. Synced:', synced, 'Errors:', errors)
    return NextResponse.json({ synced, errors, total: users.length })
  } catch (err) {
    console.error('[Meta Sync-All] Fatal error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
