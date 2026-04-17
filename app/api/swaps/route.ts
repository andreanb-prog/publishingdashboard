export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const swaps = await db.swap.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'asc' },
  })

  return NextResponse.json({ success: true, swaps })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

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
    },
  })

  return NextResponse.json({ success: true, swap })
}
