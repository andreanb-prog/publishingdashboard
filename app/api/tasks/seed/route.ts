export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Don't seed if tasks already exist
  const existing = await db.task.count({ where: { userId } })
  if (existing > 0) {
    return NextResponse.json({ message: 'Tasks already exist', count: existing })
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const wednesday = new Date(today)
  wednesday.setDate(wednesday.getDate() + ((3 - today.getDay() + 7) % 7 || 7))
  const friday = new Date(today)
  friday.setDate(friday.getDate() + ((5 - today.getDay() + 7) % 7 || 7))
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const tasks = await db.task.createMany({
    data: [
      {
        userId,
        title: 'Upload latest KDP royalty report for April',
        priority: 'high',
        status: 'todo',
        dueDate: today,
        category: 'KDP',
        isAISuggested: true,
        aiReason: 'Last upload was March data — April numbers needed for fresh insights',
        assignee: 'author',
      },
      {
        userId,
        title: 'Review B3 pre-order campaign performance',
        priority: 'high',
        status: 'todo',
        dueDate: today,
        category: 'Meta ads',
        isAISuggested: true,
        aiReason: 'Pre-order swap email sent yesterday — 28.6% open rate, 4.1% click rate',
        assignee: 'author',
      },
      {
        userId,
        title: 'Launch Crush Season ad variants in Meta Ads Manager',
        priority: 'high',
        status: 'todo',
        dueDate: tomorrow,
        category: 'Meta ads',
        isAISuggested: true,
        aiReason: '4 creatives specced — start with Variant 3 for cold traffic',
        assignee: 'author',
      },
      {
        userId,
        title: 'Send re-engagement email to cold subscribers',
        priority: 'medium',
        status: 'todo',
        dueDate: wednesday,
        category: 'MailerLite',
        isAISuggested: true,
        aiReason: '2,409 total subs but FB segment only 27% open rate vs 32%+ organic',
        assignee: 'author',
      },
      {
        userId,
        title: 'Check BookClicker swap calendar for upcoming sends',
        priority: 'medium',
        status: 'todo',
        dueDate: wednesday,
        category: 'General',
        isAISuggested: false,
        assignee: 'author',
      },
      {
        userId,
        title: 'Schedule next newsletter with B3 excerpt teaser',
        priority: 'medium',
        status: 'todo',
        dueDate: friday,
        category: 'MailerLite',
        isAISuggested: true,
        aiReason: 'ARC invite got 56% open rate — readers are engaged with B3 content',
        assignee: 'author',
      },
      {
        userId,
        title: 'Create 5 Pinterest pins for Book 1 tropes',
        priority: 'low',
        status: 'todo',
        dueDate: nextWeek,
        category: 'Pinterest',
        isAISuggested: false,
        assignee: 'author',
      },
      {
        userId,
        title: 'Export Meta ads CSV and upload to AuthorDash',
        priority: 'medium',
        status: 'todo',
        dueDate: friday,
        category: 'Meta ads',
        isAISuggested: true,
        aiReason: 'LM campaign running at $0.14/sub — track spend to calculate ROAS',
        assignee: 'author',
      },
    ],
  })

  return NextResponse.json({ message: 'Seeded tasks', count: tasks.count })
}
