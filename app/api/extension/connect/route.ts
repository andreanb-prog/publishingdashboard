export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

const TOKEN_TTL_MS = 10 * 60 * 1000 // 10 minutes

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

  const record = await db.connectionToken.findUnique({ where: { token: connectionToken } })

  if (!record) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (record.userId !== session.user.id) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 403 })
  }

  if (record.usedAt !== null) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400 })
  }

  if (Date.now() - record.createdAt.getTime() > TOKEN_TTL_MS) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  const extensionKey = `ext_${session.user.id}_${randomBytes(32).toString('hex')}`

  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data: { extensionKey, extensionConnectedAt: new Date() },
    }),
    db.connectionToken.update({
      where: { token: connectionToken },
      data: { usedAt: new Date() },
    }),
  ])

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true },
  })

  return NextResponse.json({
    extensionKey,
    userId: user!.id,
    userName: user!.name,
  })
}
