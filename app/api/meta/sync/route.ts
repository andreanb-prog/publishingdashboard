// app/api/meta/sync/route.ts — Pull Meta Ads data for a user
// API version: v21.0 (minimum required for current Insights API)
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { metaSyncLimiter, checkRateLimit, RATE_LIMIT_RESPONSE } from '@/lib/ratelimit'
import { db } from '@/lib/db'
import type { MetaAd, MetaData } from '@/types'
import { GRAPH, fetchAccountAds } from '@/lib/metaGraphApi'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { limited } = await checkRateLimit(metaSyncLimiter, `meta-sync:${session.user.id}`)
  if (limited) return RATE_LIMIT_RESPONSE

  await req.json().catch(() => {}) // consume body

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { metaAccessToken: true, metaAdAccountId: true, metaTokenExpires: true },
    })

    const token = user?.metaAccessToken

    if (!token) {
      return NextResponse.json({ error: 'Meta account not connected. Please reconnect in Settings.' }, { status: 401 })
    }

    if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
      return NextResponse.json({ error: 'Meta token expired — reconnect in Settings' }, { status: 401 })
    }

    // ── Step 1: Validate token ──────────────────────────────────────────────────
    const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`)
    const meData = await meRes.json()

    if (meData.error) {
      const code = meData.error.code
      if (code === 190) {
        await db.user.update({
          where: { id: session.user.id },
          data: { metaAccessToken: null, metaTokenExpires: null },
        })
        return NextResponse.json({ error: 'Token expired — please reconnect Meta Ads' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Token invalid' }, { status: 401 })
    }

    // ── Step 2: Verify stored account access (if one is saved) ───────────────
    if (user.metaAdAccountId) {
      const accountTestRes = await fetch(
        `${GRAPH}/${user.metaAdAccountId}?fields=id,name,account_status&access_token=${token}`
      )
      const accountTestData = await accountTestRes.json()
      if (accountTestData.error) {
        console.error('[Meta Sync] No access to stored account. Code:', accountTestData.error.code, '| Message:', accountTestData.error.message)
      }
    }

    // ── Step 3: Build account list ───────────────────────────────────────────
    // Use the user's saved account when available. Fall back to the Instagram-linked
    // account that is not discoverable via /me/adaccounts (used for the owner account).
    const FALLBACK_ACCOUNT_ID = 'act_940232825191906'
    const accountId = user.metaAdAccountId ?? FALLBACK_ACCOUNT_ID
    const allAccounts: { id: string; name: string }[] = [{ id: accountId, name: 'Ad Account' }]

    // ── Step 4: Fetch insights from each account ───────────────────────────────
    const allAds: MetaAd[] = []
    let totalSpend = 0
    let bestAccountId: string | null = null
    let bestAccountSpend = -1

    for (const account of allAccounts) {
      try {
        const ads = await fetchAccountAds(token, account.id)
        const accountSpend = ads.reduce((s, a) => s + a.spend, 0)
        if (ads.length > 0) {
          allAds.push(...ads)
          totalSpend += accountSpend
          if (accountSpend > bestAccountSpend) {
            bestAccountSpend = accountSpend
            bestAccountId = account.id
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'PERMISSION_DENIED') throw err
        console.error(`[Meta Sync] Error fetching ${account.id}:`, err)
      }
    }

    if (allAds.length === 0) {
      return NextResponse.json({
        error: 'No ad data found in the last 30 days. If you\'re running ads, make sure you\'re connecting the Facebook account that owns your Ads Manager. Disconnect and reconnect with the correct account.',
        code: 'NO_AD_DATA',
        accountsChecked: allAccounts.map(a => a.id),
      }, { status: 400 })
    }

    // Update stored ad account to the one with the most spend
    if (bestAccountId) {
      await db.user.update({ where: { id: session.user.id }, data: { metaAdAccountId: bestAccountId } })
      console.log(`[Meta Sync] Updated metaAdAccountId to ${bestAccountId}`)
    }

    const totalClicks = allAds.reduce((s, a) => s + a.clicks, 0)
    const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0)
    const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
    const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0

    const sorted = [...allAds].sort((a, b) => b.ctr - a.ctr)
    const bestAd = sorted[0] || null
    const worstAds = [...allAds].sort((a, b) => a.ctr - b.ctr).filter(a => a.spend > 5).slice(0, 3)

    const data: MetaData = {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalClicks,
      totalImpressions,
      avgCTR,
      avgCPC,
      ads: allAds,
      bestAd,
      worstAds,
    }

    // ── Persist to Analysis table so the Meta page can display it ────────────
    const currentMonth = new Date().toISOString().slice(0, 7)
    const existing = await db.analysis.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      const existingData = (existing.data as Record<string, unknown>) || {}
      await db.analysis.update({
        where: { id: existing.id },
        data: { data: { ...existingData, meta: data } as any },
      })
      console.log(`[Meta Sync] Updated analysis ${existing.id} with ${allAds.length} ads`)
    } else {
      await db.analysis.create({
        data: {
          userId: session.user.id,
          month: currentMonth,
          data: { month: currentMonth, meta: data } as any,
        },
      })
      console.log(`[Meta Sync] Created new analysis for ${currentMonth} with ${allAds.length} ads`)
    }

    await db.user.update({ where: { id: session.user.id }, data: { metaLastSync: new Date() } })

    console.log('=== META SYNC COMPLETE ===')
    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof Error && err.message === 'PERMISSION_DENIED') {
      console.error('[Meta Sync] Permission denied — ads_read not granted for this account')
      return NextResponse.json({
        error: 'permission_denied',
        message: 'Your ad account hasn\'t granted AuthorDash read access. Disconnect and reconnect Meta to re-authorize with the correct permissions.',
      }, { status: 403 })
    }
    console.error('[Meta Sync] Unhandled error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

