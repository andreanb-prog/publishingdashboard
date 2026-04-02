// app/api/meta/callback/route.ts — Exchange Meta auth code for long-lived token
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !userId) {
    console.error('[Meta Callback] Error:', error || 'Missing code/state')
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?meta=error`)
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
      console.error('[Meta Callback] Token error:', tokenData)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?meta=error`)
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const accessToken = longData.access_token || tokenData.access_token
    const expiresIn = longData.expires_in || 5184000 // default 60 days
    console.log('[Meta Callback] Long-lived token:', accessToken ? 'success' : 'using short-lived')

    // Step 3: Get ad account ID
    const adAccountRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
    )
    const adAccountData = await adAccountRes.json()
    const adAccount = adAccountData.data?.[0]
    const adAccountId = adAccount?.id || null
    console.log('[Meta Callback] Ad account:', adAccountId, adAccount?.name)

    // Step 4: Save to database
    await db.$executeRawUnsafe(
      `UPDATE "User" SET "metaAccessToken" = $1, "metaAdAccountId" = $2, "metaTokenExpires" = $3 WHERE "id" = $4`,
      accessToken,
      adAccountId,
      new Date(Date.now() + expiresIn * 1000),
      userId
    )

    console.log('[Meta Callback] Saved for user:', userId)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/meta?connected=true`)

  } catch (err) {
    console.error('[Meta Callback] Error:', err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?meta=error`)
  }
}
