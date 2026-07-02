export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, browserbaseClient, checkMetaLoggedIn } from '@/lib/browserbase'

// POST — polled every 5s by Settings while the Meta Live View panel is open.
// Verifies the user has ACTUALLY reached a signed-in Ads Manager page (a RUNNING
// session alone proves nothing), then marks connected and releases the session
// so its cookies persist into the Context and the concurrency slot frees up.
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

  // Already connected from a prior poll — short-circuit so polling stops.
  const current = await db.user.findUnique({
    where: { id: session.user.id },
    select: { metaSyncStatus: true, metaLastSync: true },
  })
  if (current?.metaSyncStatus === 'connected') {
    return NextResponse.json({ status: 'connected', lastSyncAt: current.metaLastSync })
  }

  try {
    const bb = browserbaseClient(cfg)
    const bbSession = await bb.sessions.retrieve(sessionId)
    if (bbSession.status !== 'RUNNING') {
      return NextResponse.json({ status: 'pending' })
    }

    const { loggedIn, adAccountId } = await checkMetaLoggedIn(cfg, sessionId)
    if (!loggedIn) {
      return NextResponse.json({ status: 'pending' })
    }

    const now = new Date()
    // Capture the ad account the user landed on — but never overwrite an
    // explicitly saved one (multi-account users may land on the wrong default).
    const existing = await db.user.findUnique({
      where: { id: session.user.id },
      select: { metaAdAccountId: true },
    })
    await db.user.update({
      where: { id: session.user.id },
      data: {
        metaSyncStatus: 'connected',
        metaConnectedAt: now,
        ...(existing?.metaAdAccountId ? {} : adAccountId ? { metaAdAccountId: adAccountId } : {}),
      },
    })

    // Release the login session: frees the concurrency slot AND persists the
    // Facebook cookies into the Context so nightly syncs start logged in.
    try {
      await bb.sessions.update(sessionId, { status: 'REQUEST_RELEASE', projectId: cfg.projectId })
    } catch (releaseErr) {
      console.warn('[browserbase/meta/check-auth] session release failed:',
        releaseErr instanceof Error ? releaseErr.message : String(releaseErr))
    }

    return NextResponse.json({ status: 'connected', lastSyncAt: now.toISOString() })
  } catch (err) {
    console.error('[browserbase/meta/check-auth] failed:', err)
    return NextResponse.json({ status: 'pending' })
  }
}
