export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { connectionToken } = body as { connectionToken?: string }

  if (!connectionToken) {
    return NextResponse.json({ error: 'Missing connectionToken' }, { status: 400 })
  }

  const extensionKey = `ext_${session.user.id}_${randomBytes(32).toString('hex')}`

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      extensionKey,
      extensionConnectedAt: new Date(),
    },
    select: { id: true, name: true },
  })

  return NextResponse.json({
    extensionKey,
    userId: user.id,
    userName: user.name,
  })
}
