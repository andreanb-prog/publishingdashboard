export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface BookingPartner {
  partnerName: string
  listSize?: number
  sendDate: string
}

interface BookingPayload {
  syncedAt?: string
  partner?: BookingPartner
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as BookingPayload
  const { partner } = body

  if (!partner?.partnerName || !partner?.sendDate) {
    return NextResponse.json({ error: 'Missing partner.partnerName or partner.sendDate' }, { status: 400 })
  }

  const promoDate = new Date(partner.sendDate)

  await db.swap.create({
    data: {
      userId: auth.userId,
      partnerName: partner.partnerName,
      partnerListSize: partner.listSize ?? null,
      bookTitle: '',
      promoDate,
      direction: 'you_promote',
      status: 'booked',
      source: 'extension',
    },
  })

  // Check cooldown: any swap with this partner in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentSwap = await db.swap.findFirst({
    where: {
      userId: auth.userId,
      partnerName: partner.partnerName,
      promoDate: { gte: thirtyDaysAgo, lt: promoDate },
    },
    orderBy: { promoDate: 'desc' },
  })

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bookclicker_booking', dataPoints: 1, status: 'success' },
  })

  if (recentSwap) {
    const daysAgo = Math.floor(
      (promoDate.getTime() - recentSwap.promoDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    return NextResponse.json({
      success: true,
      cooldownWarning: `You swapped with ${partner.partnerName} ${daysAgo} days ago`,
    })
  }

  return NextResponse.json({ success: true })
}
