// app/api/profile/route.ts — Save author profile (pen name, genre, referral)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const ProfileSchema = z.object({
  penName: z.string().optional().nullable(),
  genreCategory: z.string().optional().nullable(),
  genreSubgenre: z.string().optional().nullable(),
  referralSource: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await req.json()
  const parsed = ProfileSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { penName, genreCategory, genreSubgenre, referralSource } = parsed.data

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        penName: penName || null,
        genreCategory: genreCategory || null,
        genreSubgenre: genreSubgenre || null,
        referralSource: referralSource || null,
        ...(penName ? { name: penName } : {}),
      },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Profile] Save failed:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userRow = await db.user.findUnique({
      where: { id: session.user.id },
      select: { penName: true, genreCategory: true, genreSubgenre: true, referralSource: true },
    })
    return NextResponse.json(userRow ?? {})
  } catch {
    return NextResponse.json({})
  }
}
