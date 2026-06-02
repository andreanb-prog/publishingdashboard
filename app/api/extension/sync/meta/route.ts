export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

function hasOnlyZeroOrNullNumbers(obj: Record<string, unknown>): boolean {
  const nums = Object.values(obj).filter((v) => typeof v === 'number' || v === null)
  if (nums.length === 0) return false
  return nums.every((v) => v === null || v === 0)
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as {
    spend?: number
    impressions?: number
    clicks?: number
    ctr?: number
    cpc?: number
    currency?: string
    dateFrom?: string
    dateTo?: string
    adAccountId?: string
    topAdName?: string
  }

  if (hasOnlyZeroOrNullNumbers(body as Record<string, unknown>)) {
    await db.extensionSyncLog.create({
      data: { userId: auth.userId, platform: 'meta', dataPoints: 0, status: 'rejected_zeros' },
    })
    return NextResponse.json({ error: 'Rejected: zero-value payload' }, { status: 400 })
  }

  if (!body.dateFrom || !body.dateTo) {
    return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
  }

  // Validate adAccountId against stored value — accept if user has none stored yet
  if (body.adAccountId) {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { metaAdAccountId: true },
    })

    if (user?.metaAdAccountId && user.metaAdAccountId !== body.adAccountId) {
      return NextResponse.json({ error: 'Ad account ID mismatch' }, { status: 403 })
    }

    // Persist the account ID if not yet stored
    if (!user?.metaAdAccountId) {
      await db.user.update({
        where: { id: auth.userId },
        data: { metaAdAccountId: body.adAccountId },
      })
    }
  }

  const dateFrom = new Date(body.dateFrom + 'T00:00:00.000Z')
  const dateTo   = new Date(body.dateTo   + 'T23:59:59.999Z')
  const campaignName = body.topAdName ?? 'Extension Sync'

  // Replace any existing rows for this user in the synced date range to avoid stacking
  await db.metaAdData.deleteMany({
    where: { userId: auth.userId, date: { gte: dateFrom, lte: dateTo } },
  })

  await db.metaAdData.create({
    data: {
      userId:      auth.userId,
      date:        dateFrom,
      campaignName,
      spend:       body.spend       ?? 0,
      impressions: body.impressions ?? 0,
      clicks:      body.clicks      ?? 0,
      ctr:         body.ctr         ?? 0,
      cpc:         body.cpc         ?? 0,
    },
  })

  const dataPoints = [body.spend, body.impressions, body.clicks, body.ctr, body.cpc]
    .filter((v) => typeof v === 'number' && v !== 0).length

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'meta', dataPoints, status: 'success' },
  })

  return NextResponse.json({ success: true })
}
