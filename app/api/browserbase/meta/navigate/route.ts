export const dynamic = 'force-dynamic'
export const maxDuration = 60 // CDP attach + navigation

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { getBrowserbaseConfig, navigateSessionToUrl, sessionPageMatches, metaLoginUrl } from '@/lib/browserbase'

// POST — fallback for the Meta connect flow: drives the Live View session to the
// Facebook sign-in page when the window opens blank.
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

  const ok = await navigateSessionToUrl(cfg, sessionId, metaLoginUrl())
  await new Promise(resolve => setTimeout(resolve, 1500))
  const onFacebook = await sessionPageMatches(cfg, sessionId, 'facebook')
  return NextResponse.json({ ok: ok || onFacebook, onFacebook })
}
