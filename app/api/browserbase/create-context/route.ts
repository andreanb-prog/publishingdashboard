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

  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID
  console.log('[browserbase/create-context] env check — BROWSERBASE_API_KEY present:', !!apiKey, '| BROWSERBASE_PROJECT_ID present:', !!projectId)

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    console.error('[browserbase/create-context] missing env vars — BROWSERBASE_API_KEY:', !!apiKey, 'BROWSERBASE_PROJECT_ID:', !!projectId)
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
    console.error('[browserbase/create-context] failed — message:', err instanceof Error ? err.message : String(err))
    console.error('[browserbase/create-context] failed — stack:', err instanceof Error ? err.stack : '(no stack)')
    console.error('[browserbase/create-context] failed — full error:', err)
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
