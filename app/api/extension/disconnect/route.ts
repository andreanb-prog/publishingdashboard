export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const extensionKey = req.headers.get('x-extension-key') ?? req.headers.get('extensionkey')

  if (!extensionKey) {
    return NextResponse.json({ error: 'Missing extension key' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { extensionKey },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid extension key' }, { status: 401 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { extensionKey: null, extensionConnectedAt: null },
  })

  return NextResponse.json({ success: true, message: 'Disconnected' })
}
