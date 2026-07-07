export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { syncBookclickerForUser, STALE_LOCK_MS } from '@/lib/browserbase/bookclicker-sync'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Concurrency guard: reject if a sync is already in flight (fresh lock). This is
  // the same lock the auto-first-sync-on-connect hits, so the auto-sync and a
  // manual "Sync Now" can never run two Browserbase sessions at once (which is
  // what tripped the 429). A stale lock (heartbeat older than STALE_LOCK_MS) is
  // allowed through — the sync itself reclaims it.
  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { bookclickerSyncStatus: true, bookclickerLastSyncAt: true },
  })
  const lockFresh =
    u?.bookclickerSyncStatus === 'syncing' &&
    u.bookclickerLastSyncAt != null &&
    (Date.now() - u.bookclickerLastSyncAt.getTime()) < STALE_LOCK_MS
  if (lockFresh) {
    return NextResponse.json(
      { error: 'A BookClicker sync is already running. Try again in a minute.' },
      { status: 409 },
    )
  }

  try {
    await syncBookclickerForUser(session.user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
