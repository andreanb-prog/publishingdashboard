export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

// POST — called by the Fetch extension using the user's AuthorDash session
// cookie (host permission on authordash.io). Mints (or returns) a per-user
// extensionKey so the extension can authenticate later cookie uploads WITHOUT
// the user copy-pasting anything. This is the whole pairing step.
export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    // Not signed into AuthorDash in this browser — the extension will prompt
    // the user to open authordash.io and sign in, then retry.
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 })
  }

  const existing = await db.user.findUnique({
    where: { id: session.user.id },
    select: { extensionKey: true, penName: true, email: true },
  })

  let extensionKey = existing?.extensionKey
  if (!extensionKey) {
    extensionKey = randomBytes(32).toString('hex')
    await db.user.update({
      where: { id: session.user.id },
      data: { extensionKey },
    })
  }

  return NextResponse.json({
    extensionKey,
    account: existing?.penName || existing?.email || 'your account',
  })
}
