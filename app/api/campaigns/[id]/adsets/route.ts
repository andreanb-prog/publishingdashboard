// app/api/campaigns/[id]/adsets/route.ts
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

  const campaign = await db.campaign.findUnique({ where: { id: params.id } })
  if (!campaign || campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { name: string; targeting: string; audience?: string | null; dailyBudget?: number | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.name || !body.targeting) {
    return NextResponse.json({ error: 'name, targeting required' }, { status: 400 })
  }

  const adSet = await db.adSet.create({
    data: {
      campaignId: params.id,
      name: body.name,
      targeting: body.targeting,
      audience: body.audience ?? null,
      dailyBudget: body.dailyBudget ?? null,
    },
    include: { ads: true },
  })

  return NextResponse.json({ adSet })
}
