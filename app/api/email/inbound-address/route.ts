export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // POSTMARK_INBOUND_TOKEN is the plain Postmark inbound address hash
  // (the part before @inbound.postmarkapp.com). No per-user plus-addressing.
  const token = process.env.POSTMARK_INBOUND_TOKEN ?? ''
  if (!token) {
    return NextResponse.json({ error: 'POSTMARK_INBOUND_TOKEN not configured' }, { status: 500 })
  }

  const address = `${token}@inbound.postmarkapp.com`

  return NextResponse.json({ address })
}
