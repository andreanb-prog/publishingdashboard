export const dynamic = 'force-dynamic'
export const maxDuration = 15

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// GET — lightweight poll used by Settings right after a KDP connect to surface
// the FIRST sync's outcome in real time (Gina's "connected, data in 2 minutes"
// followed by silence: the empty-bookshelf warning only appeared on a later
// page load). Returns the latest KDP SyncLog outcome + sync timestamp. Cheap:
// two indexed DB reads, no external calls — safe to poll every ~10s.
export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [user, lastLog] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { kdpSyncStatus: true, kdpLastSyncAt: true },
    }),
    db.syncLog.findFirst({
      where: { userId: session.user.id, source: 'kdp' },
      orderBy: { attemptedAt: 'desc' },
      select: { status: true, errorType: true, attemptedAt: true },
    }).catch(() => null),
  ])

  return NextResponse.json({
    kdpSyncStatus: user?.kdpSyncStatus ?? null,
    kdpLastSyncAt: user?.kdpLastSyncAt ? user.kdpLastSyncAt.toISOString() : null,
    lastSync: lastLog
      ? { status: lastLog.status, errorType: lastLog.errorType, attemptedAt: lastLog.attemptedAt.toISOString() }
      : null,
  })
}
