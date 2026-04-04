// app/dashboard/launch/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { LaunchClient } from './LaunchClient'

export const metadata = { title: 'Launch Planner — AuthorDash' }

export default async function LaunchPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Check if user has existing launch tasks
  const existingTasks = await db.launchTask.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: 'asc' },
  })

  // Derive launch date from tasks
  let launchDate: string | null = null
  let bookTitle: string | null = null

  if (existingTasks.length > 0) {
    // Find a task with daysFromLaunch=0 template to get the launch date
    const launchDayTemplates = await db.launchTemplate.findMany({
      where: { daysFromLaunch: 0 },
    })
    const launchDayIds = new Set(launchDayTemplates.map(t => t.id))

    for (const task of existingTasks) {
      if (task.templateId && launchDayIds.has(task.templateId)) {
        launchDate = task.dueDate.toISOString()
        break
      }
    }

    // Fallback: use first task + its template offset
    if (!launchDate && existingTasks[0]?.templateId) {
      const tpl = await db.launchTemplate.findUnique({
        where: { id: existingTasks[0].templateId },
      })
      if (tpl) {
        const d = new Date(existingTasks[0].dueDate)
        d.setDate(d.getDate() - tpl.daysFromLaunch)
        launchDate = d.toISOString()
      }
    }
  }

  const initialTasks = existingTasks.map(t => ({
    id: t.id,
    userId: t.userId,
    bookId: t.bookId ?? null,
    templateId: t.templateId ?? null,
    name: t.name,
    channel: t.channel,
    phase: t.phase,
    dueDate: t.dueDate.toISOString(),
    status: t.status,
    actionType: t.actionType ?? null,
    actionPrompt: t.actionPrompt ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return (
    <LaunchClient
      initialTasks={initialTasks}
      initialLaunchDate={launchDate}
      initialBookTitle={bookTitle}
    />
  )
}
