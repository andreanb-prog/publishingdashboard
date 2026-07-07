export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { roleToDirection, confirmationToStatus } from '@/lib/swaps'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await db.swapEntry.findMany({
    where: { userId: session.user.id, promoDate: { not: null } },
    orderBy: { promoDate: 'asc' },
    select: {
      id: true,
      partnerName: true,
      myBook: true,
      theirBook: true,
      promoDate: true,
      role: true,
      confirmation: true,
    },
  })

  const swaps = entries.map(e => ({
    id: e.id,
    partnerName: e.partnerName ?? '',
    bookTitle: e.myBook ?? e.theirBook ?? '',
    promoDate: e.promoDate,
    direction: roleToDirection(e.role),
    status: confirmationToStatus(e.confirmation),
  }))

  return NextResponse.json({ swaps })
}
