export const dynamic = 'force-dynamic'
export const maxDuration = 300 // context create + verify + first sync

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getBrowserbaseConfig, injectMetaCookies } from '@/lib/browserbase'
import { syncMetaForUser } from '@/lib/browserbase/meta-sync'

// POST — the Fetch extension uploads the user's Facebook session cookies here.
// Auth is the per-user extensionKey (Bearer), NOT the site session, because the
// request originates from the extension's service worker. We plant the cookies
// in a fresh Browserbase context, verify Ads Manager loads, and mark connected.
// Body: { cUser: string, xs: string }
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const key = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!key) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { extensionKey: key },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let cUser: string | undefined
  let xs: string | undefined
  try {
    const body = await req.json()
    cUser = typeof body?.cUser === 'string' ? body.cUser : undefined
    xs    = typeof body?.xs === 'string' ? body.xs : undefined
  } catch { /* handled below */ }

  if (!cUser || !xs) {
    return NextResponse.json({ error: 'Missing Facebook session cookies. Make sure you are logged into Facebook.' }, { status: 400 })
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    return NextResponse.json({ error: 'Browserbase is not configured.' }, { status: 503 })
  }

  try {
    const { contextId, loggedIn, adAccountId } = await injectMetaCookies(cfg, { cUser, xs })

    if (!loggedIn) {
      // Cookies didn't authenticate (expired / wrong account). Don't mark connected.
      await db.syncLog.create({
        data: {
          userId: user.id, source: 'meta', status: 'failed',
          errorType: 'cookie_invalid',
          errorDetail: 'Facebook cookies did not reach Ads Manager — likely logged out or expired.',
        },
      }).catch(() => undefined)
      return NextResponse.json({ ok: false, error: 'Those Facebook cookies didn\'t reach Ads Manager. Make sure you\'re logged into Facebook, then try again.' }, { status: 422 })
    }

    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { metaAdAccountId: true },
    })
    await db.user.update({
      where: { id: user.id },
      data: {
        metaContextId: contextId,
        metaSyncStatus: 'connected',
        metaConnectedAt: new Date(),
        metaConnectMethod: 'fetch',
        ...(existing?.metaAdAccountId ? {} : adAccountId ? { metaAdAccountId: adAccountId } : {}),
      },
    })

    // Run the first sync NOW so data lands immediately. The Live View flow
    // triggers this from the client on connect; the extension can't, so we do it
    // server-side here. Non-fatal: if it fails, the nightly cron still covers it.
    try {
      await syncMetaForUser(user.id)
    } catch (syncErr) {
      console.warn('[extension/meta-cookies] first sync failed (cron will retry):',
        syncErr instanceof Error ? syncErr.message : String(syncErr))
    }

    return NextResponse.json({ ok: true, adAccountId: adAccountId ?? null })
  } catch (err) {
    console.error('[extension/meta-cookies] failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ ok: false, error: 'Could not connect Meta right now. Please try again in a minute.' }, { status: 500 })
  }
}
