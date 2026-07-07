export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { serializeSwapEntry } from '@/lib/swaps'

// Read-only: the BookClicker sync is the sole writer of SwapEntry rows. The
// manual Add Swap POST was removed when the Swaps page was rebuilt around the
// send queue.
export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await db.swapEntry.findMany({
    where: { userId: session.user.id, promoDate: { not: null } },
    orderBy: { promoDate: 'asc' },
  })

  return NextResponse.json({ success: true, swaps: entries.map(serializeSwapEntry) })
}
