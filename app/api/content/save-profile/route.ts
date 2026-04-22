export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (e) {
      console.error('[save-profile] Failed to parse request body:', e)
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { bookId, readerAvatar, coreFeelings, voiceProfile, visualBrief, midjourneyStyle } = body as {
      bookId?: string
      readerAvatar?: string
      coreFeelings?: unknown
      voiceProfile?: string
      visualBrief?: unknown
      midjourneyStyle?: string
    }

    if (!bookId || !readerAvatar || !coreFeelings || !voiceProfile) {
      return NextResponse.json({ error: 'bookId, readerAvatar, coreFeelings, and voiceProfile are required' }, { status: 400 })
    }

    const data = {
      userId: session.user.id,
      bookId,
      readerAvatar,
      coreFeelings: coreFeelings as object,
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
  } catch (err) {
    console.error('[save-profile] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
