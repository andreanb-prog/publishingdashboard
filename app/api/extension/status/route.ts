export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { validateExtensionRequest } from '@/lib/extensionAuth'

export async function GET(req: NextRequest) {
  const auth = await validateExtensionRequest(req)
  if ('errorResponse' in auth) return auth.errorResponse

  return NextResponse.json({
    kdp: { lastSync: null, status: 'not_connected', summary: null },
    meta: { lastSync: null, status: 'not_connected', summary: null },
    bookclicker: { lastSync: null, status: 'not_connected', summary: null },
  })
}
