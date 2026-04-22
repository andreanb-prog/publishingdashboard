export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contentSession = await db.contentSession.findUnique({
      where: { userId: session.user.id },
    })

    if (!contentSession) return NextResponse.json({ session: null })

    let contentProfile = null
    if (contentSession.bookId) {
      const profile = await db.contentProfile.findFirst({
        where: { userId: session.user.id, bookId: contentSession.bookId },
        select: { readerAvatar: true, coreFeelings: true, voiceProfile: true },
      })
      if (profile) {
        contentProfile = {
          readerAvatar: profile.readerAvatar,
          coreFeelings: profile.coreFeelings as string[],
          voiceProfile: profile.voiceProfile,
        }
      }
    }

    return NextResponse.json({
      session: {
        bookId: contentSession.bookId,
        currentPhase: contentSession.currentPhase,
        pinterestUrl: contentSession.pinterestUrl,
        visualBrief: contentSession.visualBrief,
        midjourneyStyleString: contentSession.midjourneyStyleString,
        profileId: contentSession.profileId,
        campaignId: contentSession.campaignId,
        contentProfile,
      },
    })
  } catch (err) {
    console.error('[session GET]', err)
    return NextResponse.json({ session: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAugmentedSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { bookId, currentPhase, pinterestUrl, visualBrief, midjourneyStyleString, campaignId } =
      body as {
        bookId?: string | null
        currentPhase?: number
        pinterestUrl?: string | null
        visualBrief?: Record<string, unknown> | null
        midjourneyStyleString?: string | null
        campaignId?: string | null
      }

    // Resolve profileId server-side from ContentProfile
    let profileId: string | null = null
    if (bookId) {
      const profile = await db.contentProfile.findFirst({
        where: { userId: session.user.id, bookId },
        select: { id: true },
      })
      profileId = profile?.id ?? null
    }

    const data = {
      bookId: bookId ?? null,
      currentPhase: currentPhase ?? 1,
      pinterestUrl: pinterestUrl ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visualBrief: (visualBrief ?? null) as any,
      midjourneyStyleString: midjourneyStyleString ?? null,
      profileId,
      campaignId: campaignId ?? null,
    }

    await db.contentSession.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { userId: session.user.id, ...data },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[session POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
