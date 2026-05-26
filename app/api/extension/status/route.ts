export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/extensionRateLimit'

export async function GET(req: NextRequest) {
  const extensionKey = req.headers.get('extensionkey') ?? req.headers.get('x-extension-key')

  if (!extensionKey) {
    return NextResponse.json({ error: 'Missing extension key' }, { status: 401 })
  }

  if (!checkRateLimit(extensionKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const user = await db.user.findUnique({
    where: { extensionKey },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid extension key' }, { status: 401 })
  }

  return NextResponse.json({
    kdp: { lastSync: null, status: 'not_connected', summary: null },
    meta: { lastSync: null, status: 'not_connected', summary: null },
    bookclicker: { lastSync: null, status: 'not_connected', summary: null },
  })
}
