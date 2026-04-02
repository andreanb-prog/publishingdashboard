// app/api/profile/route.ts — Save author profile (pen name, genre, referral)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { penName, genreCategory, genreSubgenre, referralSource } = await req.json()

  try {
    await db.$executeRawUnsafe(
      `UPDATE "User" SET "penName" = $1, "genreCategory" = $2, "genreSubgenre" = $3, "referralSource" = $4, "name" = COALESCE($1, "name") WHERE "id" = $5`,
      penName || null, genreCategory || null, genreSubgenre || null, referralSource || null, session.user.id
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Profile] Save failed:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT "penName", "genreCategory", "genreSubgenre", "referralSource" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    )
    return NextResponse.json(rows[0] ?? {})
  } catch {
    return NextResponse.json({})
  }
}
