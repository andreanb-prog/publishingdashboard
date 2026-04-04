// app/api/adsets/[id]/ads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the ad set belongs to this user via campaign
  const adSet = await db.adSet.findUnique({
    where: { id: params.id },
    include: { campaign: { select: { userId: true } } },
  })
  if (!adSet || adSet.campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { generatedName: string; creativeId?: string | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.generatedName) {
    return NextResponse.json({ error: 'generatedName required' }, { status: 400 })
  }

  const ad = await db.ad.create({
    data: {
      adSetId: params.id,
      generatedName: body.generatedName,
      creativeId: body.creativeId ?? null,
    },
  })

  return NextResponse.json({ ad })
}
