export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateExtensionRequest } from '@/lib/extensionAuth'

export async function POST(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  await db.user.update({
    where: { id: auth.userId },
    data: { extensionKey: null, extensionConnectedAt: null },
  })

  return NextResponse.json({ ok: true })
}
