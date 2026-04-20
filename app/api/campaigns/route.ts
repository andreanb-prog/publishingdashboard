// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = await db.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      adSets: {
        include: { ads: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name: string
    phase: string
    objective: string
    bookId?: string | null
    dailyBudget?: number | null
    status?: string
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { name, phase, objective } = body
  if (!name || !phase || !objective) {
    return NextResponse.json({ error: 'name, phase, objective required' }, { status: 400 })
  }

  const campaign = await db.campaign.create({
    data: {
      userId: session.user.id,
      name,
      phase,
      objective,
      bookId: body.bookId ?? null,
      dailyBudget: body.dailyBudget ?? null,
      status: body.status ?? 'draft',
    },
    include: { adSets: { include: { ads: true } } },
  })

  return NextResponse.json({ campaign })
}
