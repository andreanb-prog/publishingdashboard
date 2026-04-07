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

  // POSTMARK_INBOUND_TOKEN is the Postmark server token (the part before @inbound.postmarkapp.com)
  // Per-user routing uses the mailbox hash (+tag):
  //   {TOKEN}+swaps-{userId}@inbound.postmarkapp.com
  // Postmark extracts the tag into MailboxHash so the webhook can route to the right user.
  const token = process.env.POSTMARK_INBOUND_TOKEN ?? ''
  if (!token) {
    return NextResponse.json({ error: 'POSTMARK_INBOUND_TOKEN not configured' }, { status: 500 })
  }

  const address = `${token}+swaps-${session.user.id}@inbound.postmarkapp.com`

  // Store on the user record; overwrite if previously stored value was malformed or stale
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { inboundEmailAddress: true },
  })

  if (!user?.inboundEmailAddress || user.inboundEmailAddress !== address) {
    await db.user.update({
      where: { id: session.user.id },
      data: { inboundEmailAddress: address },
    })
  }

  return NextResponse.json({ address })
}
