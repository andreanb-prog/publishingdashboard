export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, readerAvatar, coreFeelings, voiceProfile, visualBrief, midjourneyStyle } = await req.json()
  if (!bookId || !readerAvatar || !coreFeelings || !voiceProfile) {
    return NextResponse.json({ error: 'bookId, readerAvatar, coreFeelings, and voiceProfile are required' }, { status: 400 })
  }

  const data = {
    userId: session.user.id,
    bookId,
    readerAvatar,
    coreFeelings,
    voiceProfile,
    visualBrief: (visualBrief ?? {}) as object,
    midjourneyStyle: midjourneyStyle ?? '',
  }

  const existing = await db.contentProfile.findFirst({
    where: { userId: session.user.id, bookId },
  })

  if (existing) {
    await db.contentProfile.update({ where: { id: existing.id }, data })
  } else {
    await db.contentProfile.create({ data })
  }

  return NextResponse.json({
    profile: { readerAvatar, coreFeelings, voiceProfile },
  })
}
