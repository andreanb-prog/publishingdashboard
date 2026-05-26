export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = randomBytes(32).toString('hex')

  await db.connectionToken.create({
    data: { token, userId: session.user.id },
  })

  return NextResponse.json({ token })
}
