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
    case 'sent':      return 'sent'
    case 'paid':      return 'sent'
    case 'cancelled': return 'cancelled'
    case 'declined':  return 'cancelled'
    case 'pending':   return 'booked'
    default:          return 'booked'
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

// Strips ordinal suffixes (1st, 2nd, 3rd, 4th … 31st) and parses the result.
// Handles: "Wednesday, April 29th", "April 29th", "May 21st 2026", etc.
// Falls back to current year when no year is present in the string.
function parsePromoDate(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null

  // Remove ordinal suffixes
  const cleaned = raw.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1')

  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    // If the parsed year looks like a default epoch year (1970 or similar),
    // and the original string had no 4-digit year, pin to current year.
    if (!/\b\d{4}\b/.test(raw)) {
      d.setFullYear(new Date().getFullYear())
    }
    return d
  }

  return null
}

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  const body = await req.json().catch(() => ({})) as LaunchPayload
  const swaps = body.swaps ?? []

  let written = 0

  for (const swap of swaps) {
    try {
      const promoDate = parsePromoDate(swap.sendDate)
      if (!promoDate) {
        console.warn('[bookclicker-launch] Skipping row — unparseable date:', swap.sendDate, swap)
        continue
      }

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
    } catch (err) {
      console.error('[bookclicker-launch] Error processing swap row, skipping:', swap, err)
    }
  }

  await db.extensionSyncLog.create({
    data: { userId: auth.userId, platform: 'bookclicker_launch', dataPoints: written, status: 'success' },
  })

  return NextResponse.json({ success: true, written })
}
