export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'
import { fetchAccountAds } from '@/lib/metaGraphApi'

const FALLBACK_ACCOUNT_ID = 'act_940232825191906'

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  await req.json().catch(() => {})

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { metaAccessToken: true, metaAdAccountId: true, metaTokenExpires: true },
  })

  if (!user?.metaAccessToken) {
    return NextResponse.json({ success: false, reason: 'meta_not_connected' })
  }

  if (user.metaTokenExpires && new Date(user.metaTokenExpires) < new Date()) {
    return NextResponse.json({ success: false, reason: 'meta_token_expired' })
  }

  const accountId = user.metaAdAccountId ?? FALLBACK_ACCOUNT_ID

  let ads
  try {
    ads = await fetchAccountAds(user.metaAccessToken, accountId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[meta-trigger] fetchAccountAds error:', msg)
    if (msg === 'PERMISSION_DENIED') {
      return NextResponse.json({ success: false, reason: 'permission_denied' })
    }
    if (msg === 'TOKEN_EXPIRED') {
      await db.user.update({
        where: { id: auth.userId },
        data: { metaAccessToken: null, metaTokenExpires: null },
      })
      return NextResponse.json({ success: false, reason: 'meta_token_expired' })
    }
    return NextResponse.json({ success: false, reason: 'meta_api_error' })
  }

  if (ads.length === 0) {
    return NextResponse.json({ success: true, synced: false, reason: 'no_ad_data' })
  }

  const totalSpend = ads.reduce((s, a) => s + a.spend, 0)
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0)
  const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
  const avgCPC = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0
  const topAd = [...ads].sort((a, b) => b.ctr - a.ctr)[0]

  const today = new Date()
  const dateKey = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z')

  await db.metaAdData.deleteMany({
    where: { userId: auth.userId, date: dateKey },
  })

  await db.metaAdData.create({
    data: {
      userId:      auth.userId,
      date:        dateKey,
      campaignName: topAd?.name ?? 'Extension Trigger',
      spend:       Math.round(totalSpend * 100) / 100,
      impressions: totalImpressions,
      clicks:      totalClicks,
      ctr:         avgCTR,
      cpc:         avgCPC,
    },
  })

  await db.user.update({ where: { id: auth.userId }, data: { metaLastSync: new Date() } })

  console.log(`[meta-trigger] Synced ${ads.length} ads for user ${auth.userId}`)
  return NextResponse.json({ success: true, synced: true })
}
