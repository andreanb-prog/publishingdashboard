export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

// DELETE — clears the KDP Browserbase connection from the user record.
export async function DELETE() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      kdpContextId:  null,
      kdpSyncStatus: null,
      kdpConnectedAt: null,
      kdpLastSyncAt:  null,
    },
  })

  return NextResponse.json({ success: true })
}
