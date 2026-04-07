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

  // POSTMARK_INBOUND_ADDRESS is the full Postmark server address, e.g.:
  //   abc123@inbound.postmarkapp.com
  // We use the mailbox hash (+tag) to encode the userId:
  //   abc123+swaps-{userId}@inbound.postmarkapp.com
  // Postmark extracts the tag into MailboxHash so the webhook can route to the right user.
  const baseAddress = process.env.POSTMARK_INBOUND_ADDRESS ?? ''
  if (!baseAddress) {
    return NextResponse.json({ error: 'POSTMARK_INBOUND_ADDRESS not configured' }, { status: 500 })
  }

  const [localpart, domain] = baseAddress.split('@')
  const address = `${localpart}+swaps-${session.user.id}@${domain}`

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
