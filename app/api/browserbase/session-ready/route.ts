export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { getBrowserbaseConfig, browserbaseClient } from '@/lib/browserbase'

// Substring a source's live session must have navigated to before we consider
// it "ready" to show in the Live View iframe. Mounting the iframe before this is
// true is what produced the blank/white remote-browser window users saw.
const READY_MATCH: Record<string, string> = {
  kdp: 'amazon',
  bookclicker: 'bookclicker.com',
}

// POST — cheap readiness probe for the connect flow. Reads the session's open
// pages and reports whether any is on the target sign-in site yet. Read-only
// (no CDP attach), so the client can poll it every ~1.5s without cost.
export async function POST(req: Request) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    return NextResponse.json({ ready: false, error: 'not_configured' }, { status: 503 })
  }

  let sessionId: string | undefined
  let source: string | undefined
  try {
    const body = await req.json()
    sessionId = body?.sessionId
    source = body?.source
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const match = source ? READY_MATCH[source] : undefined
  if (!sessionId || !match) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const bb = browserbaseClient(cfg)
    const live = await bb.sessions.debug(sessionId)
    const ready = (live.pages ?? []).some(p => (p.url ?? '').includes(match))
    return NextResponse.json({ ready })
  } catch {
    // Session not yet debuggable (still spinning up) — report not-ready and let
    // the client keep polling; the client's own timeout surfaces a failure.
    return NextResponse.json({ ready: false })
  }
}
