// app/api/cron/sync/route.ts
// Nightly sync: KDP, then Meta, then BSR for connected users.
// BookClicker is intentionally NOT here — it is the heaviest source and runs in its
// own 300s function (/api/cron/bookclicker) so this route can never hit 300s from it.
// Triggered by Vercel Cron — protected by the Authorization: Bearer ${CRON_SECRET} header.
export const maxDuration = 300 // syncs drive a real browser and may backfill months
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isCronAuthorized } from '@/lib/cronAuth'
import { runInBatches, logCronAbort, withColdStartRetry } from '@/lib/cronReliability'
import { syncKdpForUser } from '@/lib/browserbase/kdp-sync'
import { syncMetaForUser } from '@/lib/browserbase/meta-sync'
import { fetchBsrForUser } from '@/lib/browserbase/bsr-fetch'

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  // 1. KDP sync — users who have actively connected KDP via Browserbase.
  //    This is the run's first DB hit, so retry it through a Neon cold start.
  const kdpUsers = await withColdStartRetry(
    () => db.user.findMany({ where: { kdpSyncStatus: 'connected' }, select: { id: true } }),
    'cron/sync kdp users',
  )
  console.log(`[cron/sync] KDP: ${kdpUsers.length} connected users`)

  const kdpResults = await runInBatches(
    kdpUsers.map(u => u.id),
    syncKdpForUser,
  )

  for (const r of kdpResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/sync] KDP failed for ${r.userId}:`, r.error)
  }

  // 2. Meta sync — users who have connected Meta Ads via Browserbase
  const metaUsers = await db.user.findMany({
    where: { metaSyncStatus: 'connected' },
    select: { id: true },
  })
  console.log(`[cron/sync] Meta: ${metaUsers.length} connected users`)

  const metaResults = await runInBatches(
    metaUsers.map(u => u.id),
    syncMetaForUser,
  )

  for (const r of metaResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/sync] Meta failed for ${r.userId}:`, r.error)
  }

  // 3. BSR fetch — all users who have at least one book with an ASIN
  const bsrUsers = await db.user.findMany({
    where: { bookCatalog: { some: { asin: { not: null } } } },
    select: { id: true },
  })
  console.log(`[cron/sync] BSR: ${bsrUsers.length} users with books`)

  const bsrResults = await runInBatches(
    bsrUsers.map(u => u.id),
    fetchBsrForUser,
  )

  for (const r of bsrResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/sync] BSR failed for ${r.userId}:`, r.error)
  }

  return NextResponse.json({
    success: true,
    kdp: {
      total: kdpUsers.length,
      ok: kdpResults.filter(r => r.status === 'fulfilled').length,
      failed: kdpResults.filter(r => r.status === 'rejected').length,
    },
    meta: {
      total: metaUsers.length,
      ok: metaResults.filter(r => r.status === 'fulfilled').length,
      failed: metaResults.filter(r => r.status === 'rejected').length,
    },
    bsr: {
      total: bsrUsers.length,
      ok: bsrResults.filter(r => r.status === 'fulfilled').length,
      failed: bsrResults.filter(r => r.status === 'rejected').length,
    },
  })
  } catch (err) {
    // Root visibility: a throw anywhere above would otherwise vanish into expired
    // Vercel logs. Record it so /admin/sync-health shows the abort.
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/sync] aborted:', msg)
    await logCronAbort('cron', err)
    return NextResponse.json({ error: 'Sync aborted', detail: msg.slice(0, 500) }, { status: 500 })
  }
}
