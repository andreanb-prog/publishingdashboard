export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface MyList {
  listSize?: number
  openRate?: number
  clickRate?: number
}

interface PendingConfirmation {
  partnerName: string
  bookTitle: string
  sendDate: string
}

interface TodaysPromo {
  title: string
  type: string
}

interface DashboardPayload {
  syncedAt?: string
  myList?: MyList
  todaysPromos?: TodaysPromo[]
  pendingConfirmations?: PendingConfirmation[]
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as DashboardPayload
  const { myList, pendingConfirmations = [] } = body

  // Update User list stats
  if (myList) {
    await db.user.update({
      where: { id: auth.userId },
      data: {
        ...(myList.listSize != null && { bcListSize: myList.listSize }),
        ...(myList.openRate != null && { bcOpenRate: myList.openRate }),
        ...(myList.clickRate != null && { bcClickRate: myList.clickRate }),
        bcLastSync: new Date(),
      },
    })
  }

  // Upsert pending confirmations as Swap records
  for (const conf of pendingConfirmations) {
    const promoDate = new Date(conf.sendDate)
    const existing = await db.swap.findFirst({
      where: { userId: auth.userId, partnerName: conf.partnerName, promoDate },
    })

    if (existing) {
      await db.swap.update({
        where: { id: existing.id },
        data: { status: 'pending_confirmation', bookTitle: conf.bookTitle, source: 'extension' },
      })
    } else {
      await db.swap.create({
        data: {
          userId: auth.userId,
          partnerName: conf.partnerName,
          bookTitle: conf.bookTitle,
          promoDate,
          direction: 'you_promote',
          status: 'pending_confirmation',
          source: 'extension',
        },
      })
    }
  }

  const dataPoints =
    (myList ? Object.values(myList).filter((v) => v != null).length : 0) +
    pendingConfirmations.length

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bookclicker_dashboard', dataPoints, status: 'success' },
  })

  return NextResponse.json({ success: true })
}
