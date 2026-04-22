export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

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

  const swaps = await db.swap.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'asc' },
  })

  return NextResponse.json({ success: true, swaps })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await req.json()
  const parsed = SwapSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const body = parsed.data

  const swap = await db.swap.create({
    data: {
      userId:          session.user.id,
      partnerName:     body.partnerName,
      partnerEmail:    body.partnerEmail ?? null,
      partnerListSize: body.partnerListSize ? Number(body.partnerListSize) : null,
      bookTitle:       body.bookTitle,
      promoFormat:     body.promoFormat ?? null,
      promoDate:       new Date(body.promoDate),
      direction:       body.direction,
      source:          body.source ?? null,
      launchWindow:    body.launchWindow ?? null,
      mailerLiteListId: body.mailerLiteListId ?? null,
    },
  })

  return NextResponse.json({ success: true, swap })
}
