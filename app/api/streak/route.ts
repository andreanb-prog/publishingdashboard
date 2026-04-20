// app/api/streak/route.ts
import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Upsert streak (create with defaults if none exists)
  let streak = await db.userStreak.findUnique({
    where: { userId: session.user.id },
  })

  if (!streak) {
    streak = await db.userStreak.create({
      data: {
        userId: session.user.id,
        currentStreak: 0,
        longestStreak: 0,
        totalCheckIns: 0,
        freezesAvailable: 0,
      },
    })
  }

  // Last 7 days of StreakEvents
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentEvents = await db.streakEvent.findMany({
    where: {
      userId: session.user.id,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json({ streak, recentEvents })
}
