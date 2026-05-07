export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function POST() {
  const session = await getAugmentedSession()
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
        title: 'Upload your latest KDP royalty report',
        priority: 'high',
        status: 'todo',
        dueDate: today,
        category: 'KDP',
        isAISuggested: true,
        aiReason: 'Fresh royalty data unlocks revenue insights and sales trends across your catalog',
        assignee: 'author',
      },
      {
        userId,
        title: 'Review your most recent ad campaign performance',
        priority: 'high',
        status: 'todo',
        dueDate: today,
        category: 'Meta ads',
        isAISuggested: true,
        aiReason: 'Reviewing open rates and click rates helps you identify what creative is working',
        assignee: 'author',
      },
      {
        userId,
        title: 'Set up your first ad creative variants in Meta Ads Manager',
        priority: 'high',
        status: 'todo',
        dueDate: tomorrow,
        category: 'Meta ads',
        isAISuggested: true,
        aiReason: 'Testing multiple creatives early helps you find your best-performing hook faster',
        assignee: 'author',
      },
      {
        userId,
        title: 'Send a re-engagement email to cold subscribers',
        priority: 'medium',
        status: 'todo',
        dueDate: wednesday,
        category: 'MailerLite',
        isAISuggested: true,
        aiReason: 'Segments with lower open rates benefit from a targeted re-engagement sequence',
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
        title: 'Schedule a newsletter with your latest book content',
        priority: 'medium',
        status: 'todo',
        dueDate: friday,
        category: 'MailerLite',
        isAISuggested: true,
        aiReason: 'Regular newsletters keep your list warm and drive pre-order and launch momentum',
        assignee: 'author',
      },
      {
        userId,
        title: 'Create 5 Pinterest pins for your book tropes',
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
        aiReason: 'Uploading ad spend data lets AuthorDash calculate your cost-per-subscriber and ROAS',
        assignee: 'author',
      },
    ],
  })

  return NextResponse.json({ message: 'Seeded tasks', count: tasks.count })
}
