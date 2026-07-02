export const dynamic = 'force-dynamic'
export const maxDuration = 300 // drives a real browser against a heavy SPA

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { syncMetaForUser } from '@/lib/browserbase/meta-sync'

// POST — on-demand Meta Ads sync for the signed-in user.
export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { metaContextId: true, metaSyncStatus: true },
  })
  if (!user?.metaContextId) {
    return NextResponse.json({ error: 'Meta is not connected. Connect Meta first.' }, { status: 400 })
  }

  await syncMetaForUser(session.user.id)

  // Report the outcome of the sync we just ran so the client can show real state.
  const latest = await db.syncLog.findFirst({
    where: { userId: session.user.id, source: 'meta' },
    orderBy: { attemptedAt: 'desc' },
  }).catch(() => null)

  const refreshed = await db.user.findUnique({
    where: { id: session.user.id },
    select: { metaLastSync: true, metaSyncStatus: true },
  })

  return NextResponse.json({
    success: latest?.status === 'success',
    status: latest?.status ?? 'unknown',
    errorDetail: latest?.errorDetail ?? null,
    metaLastSync: refreshed?.metaLastSync ?? null,
    metaSyncStatus: refreshed?.metaSyncStatus ?? null,
  })
}
