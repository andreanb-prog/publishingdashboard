// app/api/meta/callback/route.ts — Exchange Meta auth code for long-lived token
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !userId) {
    const reason = searchParams.get('error_description') || error || 'Authorization was cancelled or failed'
    console.error('[Meta Callback] Error:', reason)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/meta/error?reason=${encodeURIComponent(reason)}`
    )
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = process.env.META_REDIRECT_URI || 'https://authordash.io/api/meta/callback'

  try {
    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    console.log('[Meta Callback] Token exchange:', tokenData.access_token ? 'success' : 'failed')

    if (!tokenData.access_token) {
      const reason = tokenData.error?.message || 'Token exchange failed'
      console.error('[Meta Callback] Token error:', tokenData)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/meta/error?reason=${encodeURIComponent(reason)}`
      )
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const accessToken = longData.access_token || tokenData.access_token
    const expiresIn = longData.expires_in || 5184000 // default 60 days
    console.log('[Meta Callback] Long-lived token:', accessToken ? 'success' : 'using short-lived')

    // Step 3: Save token to DB — account selection happens on the next page
    await db.user.update({
      where: { id: userId },
      data: {
        metaAccessToken:  accessToken,
        metaTokenExpires: new Date(Date.now() + expiresIn * 1000),
      },
    })

    // Step 4: Read back to verify the token was actually persisted
    const verify = await db.user.findUnique({
      where: { id: userId },
      select: { metaAccessToken: true },
    })

    if (!verify?.metaAccessToken) {
      console.error('[Meta Callback] Read-back failed — token not persisted for user:', userId)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/meta/error?reason=${encodeURIComponent('Token could not be saved — please try again')}`
      )
    }

    console.log('[Meta Callback] Token saved for user:', userId, '— redirecting to account selection')

    // Step 5: Redirect to account selection — user picks which ad account to use
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL ?? 'https://authordash.io'}/dashboard/meta/select-account`)

  } catch (err: any) {
    // P2025 = Prisma "Record to update not found" — userId from state didn't match any user
    if (err?.code === 'P2025') {
      console.error('[Meta Callback] User not found for id from state param:', userId)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/meta/error?reason=${encodeURIComponent('Session mismatch — please sign out, sign back in, and try connecting Meta again')}`
      )
    }
    console.error('[Meta Callback] Error:', err)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/meta/error?reason=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}
