// app/api/launch/tasks/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  // Verify task belongs to user
  const task = await db.launchTask.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // Mark task done
  await db.launchTask.update({
    where: { id },
    data: { status: 'done' },
  })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Create a StreakEvent for today
  await db.streakEvent.create({
    data: {
      userId: session.user.id,
      date: today,
      actionType: 'task_complete',
    },
  })

  // Upsert UserStreak
  const streak = await db.userStreak.findUnique({
    where: { userId: session.user.id },
  })

  if (!streak) {
    await db.userStreak.create({
      data: {
        userId: session.user.id,
        currentStreak: 1,
        longestStreak: 1,
        lastCheckInDate: today,
        totalCheckIns: 1,
      },
    })
  } else {
    const lastCheckIn = streak.lastCheckInDate
      ? new Date(streak.lastCheckInDate.getFullYear(), streak.lastCheckInDate.getMonth(), streak.lastCheckInDate.getDate())
      : null

    const todayTime = today.getTime()
    const alreadyCheckedInToday = lastCheckIn && lastCheckIn.getTime() === todayTime

    if (alreadyCheckedInToday) {
      // Already checked in today — just increment totalCheckIns
      await db.userStreak.update({
        where: { userId: session.user.id },
        data: { totalCheckIns: { increment: 1 } },
      })
    } else {
      // Check if yesterday
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const checkedInYesterday = lastCheckIn && lastCheckIn.getTime() === yesterday.getTime()

      const newStreak = checkedInYesterday ? streak.currentStreak + 1 : 1
      const newLongest = Math.max(newStreak, streak.longestStreak)

      await db.userStreak.update({
        where: { userId: session.user.id },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastCheckInDate: today,
          totalCheckIns: { increment: 1 },
        },
      })
    }
  }

  const updatedStreak = await db.userStreak.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json({ success: true, streak: updatedStreak })
}
