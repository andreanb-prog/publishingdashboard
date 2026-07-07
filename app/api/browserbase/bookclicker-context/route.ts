export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, createBookclickerLiveSession } from '@/lib/browserbase'

// POST — create a Browserbase Context + live session for connecting BookClicker.
// Saves the contextId to the user, marks BookClicker as never_connected (awaiting
// login), and returns contextId, sessionId, and a Browserbase Live View URL.
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
    const { contextId, sessionId, liveViewUrl } = await createBookclickerLiveSession(cfg)

    await db.user.update({
      where: { id: session.user.id },
      data: {
        bookclickerContextId: contextId,
        bookclickerSyncStatus: 'never_connected',
      },
    })

    return NextResponse.json({ contextId, sessionId, liveViewUrl })
  } catch (err) {
    console.error('[browserbase/bookclicker-context] failed:', err instanceof Error ? err.message : String(err))
    try {
      await db.syncLog.create({
        data: {
          userId: session.user.id,
          source: 'bookclicker',
          status: 'failed',
          errorType: 'context_create_failed',
          errorDetail: err instanceof Error ? err.message : String(err),
        },
      })
    } catch { /* non-fatal */ }
    return NextResponse.json(
      { error: 'Could not start the BookClicker connection. Please try again.' },
      { status: 500 },
    )
  }
}

// DELETE — disconnect BookClicker: clear the stored context + status so the
// nightly cron stops syncing this user.
export async function DELETE() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await db.user.update({
    where: { id: session.user.id },
    data: {
      bookclickerContextId: null,
      bookclickerSyncStatus: null,
      bookclickerConnectedAt: null,
    },
  })
  return NextResponse.json({ success: true })
}
