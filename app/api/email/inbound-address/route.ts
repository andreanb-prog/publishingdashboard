export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domain = process.env.POSTMARK_INBOUND_DOMAIN ?? 'inbound.postmarkapp.com'
  const address = `swaps-${session.user.id}@${domain}`

  // Store on the user record if not already set
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { inboundEmailAddress: true },
  })

  if (!user?.inboundEmailAddress) {
    await db.user.update({
      where: { id: session.user.id },
      data: { inboundEmailAddress: address },
    })
  }

  return NextResponse.json({ address })
}
