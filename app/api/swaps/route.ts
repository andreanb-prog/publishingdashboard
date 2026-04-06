export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const swaps = await db.swapEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { promoDate: 'desc' },
  })

  return NextResponse.json({ success: true, swaps })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const entry = await db.swapEntry.create({
    data: {
      userId: session.user.id,
      promoType:        body.promoType        ?? 'swap',
      role:             body.role             ?? null,
      platform:         body.platform         ?? 'other',
      partnerName:      body.partnerName      ?? null,
      partnerListName:  body.partnerListName  ?? null,
      partnerListSize:  body.partnerListSize  ? Number(body.partnerListSize) : null,
      partnerLink:      body.partnerLink      ?? null,
      myBook:           body.myBook           ?? null,
      myList:           body.myList           ?? '',
      theirBook:        body.theirBook        ?? null,
      swapType:         body.swapType         ?? null,
      promoDate:        body.promoDate        ? new Date(body.promoDate) : null,
      confirmation:     body.confirmation     ?? 'applied',
      paymentType:      body.paymentType      ?? 'swap',
      cost:             body.cost             ? Number(body.cost) : 0,
      reportedOpenRate: body.reportedOpenRate ? Number(body.reportedOpenRate) : null,
      reportedClickRate:body.reportedClickRate? Number(body.reportedClickRate): null,
      clicks:           body.clicks           ? Number(body.clicks) : null,
      impressions:      body.impressions      ? Number(body.impressions) : null,
      subsGained:       body.subsGained       ? Number(body.subsGained) : null,
      firstSwap:        body.firstSwap        ?? false,
      overSwapFlag:     body.overSwapFlag     ?? false,
      qualityRating:    body.qualityRating    ?? null,
      notes:            body.notes            ?? null,
    },
  })

  return NextResponse.json({ success: true, entry })
}
