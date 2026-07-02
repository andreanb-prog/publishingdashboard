export const dynamic = 'force-dynamic'
export const maxDuration = 300 // context create + verify + first sync

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, injectKdpCookies, type RawCookie } from '@/lib/browserbase'
import { syncKdpForUser } from '@/lib/browserbase/kdp-sync'

// POST — the Fetch extension uploads the user's Amazon session cookies here as a
// BACKUP to the KDP Live View connect. Auth is the per-user extensionKey (Bearer).
// We plant the whole Amazon cookie bundle in a fresh Browserbase context, verify
// KDP reports loads, mark connected, and run the first sync.
// Body: { cookies: RawCookie[] }  (all .amazon.com cookies)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const key = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!key) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { extensionKey: key },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let cookies: RawCookie[] | undefined
  try {
    const body = await req.json()
    cookies = Array.isArray(body?.cookies) ? body.cookies : undefined
  } catch { /* handled below */ }

  if (!cookies || cookies.length === 0) {
    return NextResponse.json({ error: 'No Amazon cookies received. Make sure you are logged into kdp.amazon.com.' }, { status: 400 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) return NextResponse.json({ error: 'Browserbase is not configured.' }, { status: 503 })

  try {
    const { contextId, loggedIn } = await injectKdpCookies(cfg, cookies)

    if (!loggedIn) {
      await db.syncLog.create({
        data: {
          userId: user.id, source: 'kdp', status: 'failed',
          errorType: 'cookie_invalid',
          errorDetail: 'Amazon cookies did not reach KDP reports — likely logged out or expired.',
        },
      }).catch(() => undefined)
      return NextResponse.json({ ok: false, error: 'Those Amazon cookies didn\'t reach KDP. Make sure you\'re logged into kdp.amazon.com, then try again.' }, { status: 422 })
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        kdpContextId: contextId,
        kdpSyncStatus: 'connected',
        kdpConnectedAt: new Date(),
      },
    })

    // First sync now so data lands immediately (KDP is safe to sync from
    // Browserbase — it already accepts these sessions). Non-fatal.
    try {
      await syncKdpForUser(user.id)
    } catch (syncErr) {
      console.warn('[extension/kdp-cookies] first sync failed (cron will retry):',
        syncErr instanceof Error ? syncErr.message : String(syncErr))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[extension/kdp-cookies] failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ ok: false, error: 'Could not connect KDP right now. Please try again in a minute.' }, { status: 500 })
  }
}
