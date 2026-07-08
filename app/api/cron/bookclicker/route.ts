// app/api/cron/bookclicker/route.ts
// BookClicker sync for connected users, in its own 300s function.
// Split out of /api/cron/sync because BookClicker is the heaviest source (3-list send
// scans + 4 launch-center walks + dashboard chunks per user), and sharing one 300s
// budget with KDP/Meta/BSR caused the combined function to time out at 300s.
// Triggered by Vercel Cron — protected by the Authorization: Bearer ${CRON_SECRET} header.
export const maxDuration = 300 // BookClicker drives a real browser across many pages per user
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isCronAuthorized } from '@/lib/cronAuth'
import { runInBatches, logCronAbort, withColdStartRetry } from '@/lib/cronReliability'
import { syncBookclickerForUser } from '@/lib/browserbase/bookclicker-sync'

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  // First DB hit of the run — retry through a Neon cold start.
  const bcUsers = await withColdStartRetry(
    () => db.user.findMany({ where: { bookclickerSyncStatus: 'connected' }, select: { id: true } }),
    'cron/bookclicker users',
  )
  console.log(`[cron/bookclicker] ${bcUsers.length} connected users`)

  const bcResults = await runInBatches(
    bcUsers.map(u => u.id),
    syncBookclickerForUser,
  )

  for (const r of bcResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/bookclicker] failed for ${r.userId}:`, r.error)
  }

  return NextResponse.json({
    success: true,
    bookclicker: {
      total: bcUsers.length,
      ok: bcResults.filter(r => r.status === 'fulfilled').length,
      failed: bcResults.filter(r => r.status === 'rejected').length,
    },
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/bookclicker] aborted:', msg)
    await logCronAbort('cron', err)
    return NextResponse.json({ error: 'BookClicker sync aborted', detail: msg.slice(0, 500) }, { status: 500 })
  }
}
