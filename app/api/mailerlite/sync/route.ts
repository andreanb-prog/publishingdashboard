// app/api/mailerlite/sync/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { syncMailerLiteToAnalysis } from '@/lib/mailerlite'

export async function POST(_req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mailerLiteKey: true, mailerLiteLists: true },
  })

  if (!user?.mailerLiteKey) return NextResponse.json({ error: 'not_connected' }, { status: 400 })
  if ((user.mailerLiteLists ?? []).length === 0) return NextResponse.json({ success: true, updated: 0 })

  await syncMailerLiteToAnalysis(session.user.id)

  const updatedLists = await db.mailerLiteList.findMany({
    where: { userId: session.user.id },
    select: { id: true, activeCount: true, unsubCount: true },
  })

  return NextResponse.json({ success: true, updated: updatedLists.length, lists: updatedLists })
}
