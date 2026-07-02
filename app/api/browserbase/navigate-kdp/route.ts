export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { getBrowserbaseConfig, navigateSessionToKdp, sessionPageOnAmazon } from '@/lib/browserbase'

// POST — fallback for the KDP connect flow: drives the Live View session to the
// Amazon sign-in page. Used by the "Load Amazon sign-in" button when the window
// opens blank (a navigate call at session-create time can silently fail).
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

  const ok = await navigateSessionToKdp(cfg, sessionId)
  await new Promise(resolve => setTimeout(resolve, 1500))
  const onAmazon = await sessionPageOnAmazon(cfg, sessionId)
  return NextResponse.json({ ok: ok || onAmazon, onAmazon })
}
