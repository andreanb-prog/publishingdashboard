export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { serializeSwapEntry, directionToRole } from '@/lib/swaps'

const SwapSchema = z.object({
  partnerName: z.string().min(1),
  partnerEmail: z.string().email().optional().nullable(),
  partnerListSize: z.number().optional().nullable(),
  bookTitle: z.string().min(1),
  promoFormat: z.string().optional().nullable(),
  promoDate: z.string().min(1),
  direction: z.string().min(1),
  source: z.string().optional().nullable(),
  launchWindow: z.string().optional().nullable(),
  mailerLiteListId: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await db.swapEntry.findMany({
    where: { userId: session.user.id, promoDate: { not: null } },
    orderBy: { promoDate: 'asc' },
  })

  return NextResponse.json({ success: true, swaps: entries.map(serializeSwapEntry) })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await req.json()
  const parsed = SwapSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data

  // Manual Add Swap writes SwapEntry too, so the page has one source of truth.
  const promoDate = new Date(body.promoDate)
  if (isNaN(promoDate.getTime())) return NextResponse.json({ error: 'Invalid promo date' }, { status: 400 })

  const entry = await db.swapEntry.create({
    data: {
      userId:          session.user.id,
      promoType:       'swap',
      role:            directionToRole(body.direction),
      platform:        body.source ?? 'direct',
      partnerName:     body.partnerName,
      partnerListSize: body.partnerListSize ? Number(body.partnerListSize) : null,
      myBook:          body.bookTitle,
      myList:          body.launchWindow ?? 'Manual',
      swapType:        body.promoFormat ? body.promoFormat.toLowerCase() : null,
      promoDate,
      confirmation:    'approved', // a manually-added swap is a booked/agreed one
      paymentType:     'swap',
      mailerLiteListId: body.mailerLiteListId ?? null,
      // SwapEntry has no email column — preserve it in notes so it isn't lost.
      notes:           body.partnerEmail ? `Added manually · ${body.partnerEmail}` : 'Added manually',
    },
  })

  return NextResponse.json({ success: true, swap: serializeSwapEntry(entry) })
}
