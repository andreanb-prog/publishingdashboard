export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, browserbaseClient } from '@/lib/browserbase'

// POST — polled every 5s by Settings while the KDP Live View panel is open.
// Retrieves the existing session status; if RUNNING, marks the user as connected.
// Body: { sessionId: string }
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: 'Browserbase is not configured.' },
      { status: 503 },
    )
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
    select: { kdpSyncStatus: true, kdpLastSyncAt: true },
  })
  if (current?.kdpSyncStatus === 'connected') {
    return NextResponse.json({ status: 'connected', lastSyncAt: current.kdpLastSyncAt })
  }

  try {
    const bb = browserbaseClient(cfg)
    const bbSession = await bb.sessions.retrieve(sessionId)

    if (bbSession.status !== 'RUNNING') {
      return NextResponse.json({ status: 'pending' })
    }

    const now = new Date()
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        kdpSyncStatus: 'connected',
        kdpConnectedAt: now,
        kdpLastSyncAt: now,
      },
      select: { kdpLastSyncAt: true },
    })

    // Release the login Live View session now that auth succeeded. This is the
    // critical fix: leaving it RUNNING holds a lock on the persistent Context for
    // ~5 minutes, which makes the very next data sync HANG waiting for that lock
    // (the function then gets killed before it can even log an error). Releasing
    // it frees the lock AND persists the Amazon cookies into the Context so
    // future syncs start already logged in.
    try {
      await bb.sessions.update(sessionId, {
        status: 'REQUEST_RELEASE',
        projectId: cfg.projectId,
      })
    } catch (releaseErr) {
      console.warn(
        '[browserbase/check-auth] session release failed:',
        releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
      )
    }

    // Intentionally NOT writing a 'success' SyncLog here — connecting is not a
    // data sync. SyncLog should only record real extraction attempts so the ops
    // dashboard isn't polluted with fake successes.
    return NextResponse.json({ status: 'connected', lastSyncAt: updated.kdpLastSyncAt })
  } catch (err) {
    console.error('[browserbase/check-auth] failed:', err)
    return NextResponse.json({ status: 'pending' })
  }
}
