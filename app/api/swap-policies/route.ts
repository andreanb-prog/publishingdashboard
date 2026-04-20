export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const STARTER_POLICIES = [
  { ruleName: 'No box sets as features', category: 'format',       appliesTo: 'both', severity: 'block' },
  { ruleName: 'No erotica',             category: 'content_heat', appliesTo: 'both', severity: 'block' },
  { ruleName: 'No YA',                  category: 'audience',     appliesTo: 'both', severity: 'block' },
  { ruleName: 'No sweet/clean (audience mismatch)', category: 'audience', appliesTo: 'both', severity: 'warn' },
]

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let policies = await db.swapPolicy.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  // Seed starter policies for new users
  if (policies.length === 0) {
    await db.swapPolicy.createMany({
      data: STARTER_POLICIES.map(p => ({ ...p, userId: session.user.id })),
    })
    policies = await db.swapPolicy.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  return NextResponse.json({ success: true, policies })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const policy = await db.swapPolicy.create({
    data: {
      userId:    session.user.id,
      ruleName:  body.ruleName,
      category:  body.category,
      appliesTo: body.appliesTo,
      severity:  body.severity,
      notes:     body.notes ?? null,
    },
  })

  return NextResponse.json({ success: true, policy })
}
