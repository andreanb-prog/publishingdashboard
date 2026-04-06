import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.swapEntry.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()

  const updated = await db.swapEntry.update({
    where: { id: params.id },
    data: {
      ...(body.promoType        !== undefined && { promoType:        body.promoType }),
      ...(body.role             !== undefined && { role:             body.role }),
      ...(body.platform         !== undefined && { platform:         body.platform }),
      ...(body.partnerName      !== undefined && { partnerName:      body.partnerName }),
      ...(body.partnerListName  !== undefined && { partnerListName:  body.partnerListName }),
      ...(body.partnerListSize  !== undefined && { partnerListSize:  body.partnerListSize ? Number(body.partnerListSize) : null }),
      ...(body.partnerLink      !== undefined && { partnerLink:      body.partnerLink }),
      ...(body.myBook           !== undefined && { myBook:           body.myBook }),
      ...(body.myList           !== undefined && { myList:           body.myList }),
      ...(body.theirBook        !== undefined && { theirBook:        body.theirBook }),
      ...(body.swapType         !== undefined && { swapType:         body.swapType }),
      ...(body.promoDate        !== undefined && { promoDate:        body.promoDate ? new Date(body.promoDate) : null }),
      ...(body.confirmation     !== undefined && { confirmation:     body.confirmation }),
      ...(body.paymentType      !== undefined && { paymentType:      body.paymentType }),
      ...(body.cost             !== undefined && { cost:             Number(body.cost) }),
      ...(body.reportedOpenRate !== undefined && { reportedOpenRate: body.reportedOpenRate ? Number(body.reportedOpenRate) : null }),
      ...(body.reportedClickRate!== undefined && { reportedClickRate:body.reportedClickRate? Number(body.reportedClickRate): null }),
      ...(body.clicks           !== undefined && { clicks:           body.clicks ? Number(body.clicks) : null }),
      ...(body.impressions      !== undefined && { impressions:      body.impressions ? Number(body.impressions) : null }),
      ...(body.subsGained       !== undefined && { subsGained:       body.subsGained ? Number(body.subsGained) : null }),
      ...(body.firstSwap        !== undefined && { firstSwap:        body.firstSwap }),
      ...(body.overSwapFlag     !== undefined && { overSwapFlag:     body.overSwapFlag }),
      ...(body.qualityRating    !== undefined && { qualityRating:    body.qualityRating }),
      ...(body.notes            !== undefined && { notes:            body.notes }),
    },
  })

  return NextResponse.json({ success: true, entry: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.swapEntry.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Soft delete: set confirmation to "cancelled"
  await db.swapEntry.update({
    where: { id: params.id },
    data: { confirmation: 'cancelled' },
  })

  return NextResponse.json({ success: true })
}
