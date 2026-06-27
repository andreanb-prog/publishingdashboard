export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, checkKdpLoggedIn } from '@/lib/browserbase'

// POST — polled every 5s by Settings while the KDP Live View panel is open.
// Reads the live session's page URL to see whether the user has finished logging
// into KDP. On success, flips kdpSyncStatus to 'connected' and stamps timestamps.
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
    const { loggedIn } = await checkKdpLoggedIn(cfg, sessionId)

    if (!loggedIn) {
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

    // Open the sync audit trail: the connection succeeded; the first data sync
    // is handled by the sync worker.
    try {
      await db.syncLog.create({
        data: {
          userId: session.user.id,
          source: 'kdp',
          status: 'success',
          completedAt: now,
          sessionId,
        },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ status: 'connected', lastSyncAt: updated.kdpLastSyncAt })
  } catch (err) {
    console.error('[browserbase/check-auth] failed:', err)
    return NextResponse.json({ status: 'pending' })
  }
}
