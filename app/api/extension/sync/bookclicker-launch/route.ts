export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

interface SwapRow {
  partnerName: string
  listSize?: number
  sendDate: string
  swapType?: string
  status?: string
}

interface LaunchPayload {
  syncedAt?: string
  bookId?: string
  swaps?: SwapRow[]
}

function mapStatus(raw?: string): string {
  switch (raw) {
    case 'sent':      return 'Sent'
    case 'paid':      return 'Sent'
    case 'cancelled': return 'Cancelled'
    case 'declined':  return 'Cancelled'
    case 'pending':   return 'Booked'
    default:          return 'Booked'
  }
}

function mapSwapType(raw?: string): string | undefined {
  switch (raw) {
    case 'feature': return 'Feature'
    case 'solo':    return 'Solo'
    case 'mention': return 'Mention'
    default:        return undefined
  }
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as LaunchPayload
  const swaps = body.swaps ?? []

  let written = 0

  for (const swap of swaps) {
    const promoDate = new Date(swap.sendDate)
    const status = mapStatus(swap.status)
    const promoFormat = mapSwapType(swap.swapType)

    const existing = await db.swap.findFirst({
      where: { userId: auth.userId, partnerName: swap.partnerName, promoDate },
    })

    if (existing) {
      await db.swap.update({
        where: { id: existing.id },
        data: {
          status,
          ...(swap.listSize != null && { partnerListSize: swap.listSize }),
          ...(promoFormat && { promoFormat }),
          source: 'extension',
        },
      })
    } else {
      await db.swap.create({
        data: {
          userId: auth.userId,
          partnerName: swap.partnerName,
          partnerListSize: swap.listSize ?? null,
          bookTitle: '',
          promoDate,
          direction: 'you_promote',
          status,
          promoFormat: promoFormat ?? null,
          source: 'extension',
        },
      })
    }

    written++
  }

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bookclicker_launch', dataPoints: written, status: 'success' },
  })

  return NextResponse.json({ success: true, written })
}
