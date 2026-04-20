// app/api/meta/connect/route.ts — Initiate Meta OAuth flow
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || 'https://authordash.io/api/meta/callback'

  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 })
  }

  const scopes = 'ads_read,ads_management,business_management'
  const state = session.user.id // pass userId as state for callback

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code&auth_type=rerequest`

  return NextResponse.redirect(url)
}
