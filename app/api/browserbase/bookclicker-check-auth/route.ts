export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, browserbaseClient, checkBookclickerLoggedIn } from '@/lib/browserbase'

// POST — polled every 5s by Settings while the BookClicker Live View is open.
// Marks the user connected ONLY once the live session's page is on an authed
// BookClicker route (not merely when the session is RUNNING — that would fire
// before the user has actually logged in). On success it releases the login
// session (persisting cookies into the Context) so the next sync starts logged in.
// Body: { sessionId: string }
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    return NextResponse.json({ error: 'Browserbase is not configured.' }, { status: 503 })
  }

  let sessionId: string | undefined
  try {
    const body = await req.json()
    sessionId = body?.sessionId
  } catch { /* handled below */ }

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // Already connected from a prior poll — short-circuit so we stop polling.
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { bookclickerSyncStatus: true, bookclickerLastSyncAt: true },
  })
  if (current?.bookclickerSyncStatus === 'connected') {
    return NextResponse.json({ status: 'connected', lastSyncAt: current.bookclickerLastSyncAt })
  }

  try {
    const { loggedIn } = await checkBookclickerLoggedIn(cfg, sessionId)
    if (!loggedIn) {
      return NextResponse.json({ status: 'pending' })
    }

    const now = new Date()
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        bookclickerSyncStatus: 'connected',
        bookclickerConnectedAt: now,
        bookclickerLastSyncAt: now,
      },
      select: { bookclickerLastSyncAt: true },
    })

    // Release the login Live View session now that auth succeeded — this frees the
    // Context lock AND persists the BookClicker cookies into the Context so future
    // syncs start already logged in. Leaving it RUNNING would hold the lock and
    // hang the very next data sync.
    try {
      const bb = browserbaseClient(cfg)
      await bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE', projectId: cfg.projectId })
    } catch (releaseErr) {
      console.warn('[bookclicker-check-auth] session release failed:', releaseErr instanceof Error ? releaseErr.message : String(releaseErr))
    }

    return NextResponse.json({ status: 'connected', lastSyncAt: updated.bookclickerLastSyncAt })
  } catch (err) {
    console.error('[bookclicker-check-auth] failed:', err)
    return NextResponse.json({ status: 'pending' })
  }
}
