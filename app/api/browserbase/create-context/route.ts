export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, createKdpLiveSession } from '@/lib/browserbase'

// POST — create a Browserbase Context + live session for connecting KDP.
// Saves the contextId to the user, marks KDP as never_connected (awaiting login),
// and returns the contextId, sessionId, and a Browserbase Live View URL.
export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    return NextResponse.json(
      { error: 'Browserbase is not configured. Add BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.' },
      { status: 503 },
    )
  }

  try {
    const { contextId, sessionId, liveViewUrl } = await createKdpLiveSession(cfg)

    await db.user.update({
      where: { id: session.user.id },
      data: {
        kdpContextId: contextId,
        kdpSyncStatus: 'never_connected',
      },
    })

    return NextResponse.json({ contextId, sessionId, liveViewUrl })
  } catch (err) {
    console.error('[browserbase/create-context] failed:', err)
    // Record the failed attempt for the sync audit trail.
    try {
      await db.syncLog.create({
        data: {
          userId: session.user.id,
          source: 'kdp',
          status: 'failed',
          errorType: 'context_create_failed',
          errorDetail: err instanceof Error ? err.message : String(err),
        },
      })
    } catch { /* non-fatal */ }
    return NextResponse.json(
      { error: 'Could not start the KDP connection. Please try again.' },
      { status: 500 },
    )
  }
}
