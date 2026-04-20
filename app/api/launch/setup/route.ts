// app/api/launch/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await db.launchTask.findMany({
    where: { userId: session.user.id },
    orderBy: { dueDate: 'asc' },
  })

  if (tasks.length === 0) {
    return NextResponse.json({ hasLaunch: false })
  }

  // Find the task with daysFromLaunch = 0 (launch day) or derive launch date
  // The task with templateId pointing to daysFromLaunch=0 is the launch day
  // We find launch date by getting the earliest task and working back
  // Actually we store launchDate by finding a task with daysFromLaunch=0
  // We need to find launch day: look for tasks from templates with daysFromLaunch=0
  // Simple approach: find the task whose dueDate is the launch date
  // We can find launch date from any task: launchDate = task.dueDate - task.daysFromLaunch
  // But we don't store daysFromLaunch on LaunchTask. Use templateId to look up.
  // Easiest: find the template with daysFromLaunch=0 and match to the task templateId
  const launchDayTemplates = await db.launchTemplate.findMany({
    where: { daysFromLaunch: 0 },
  })
  const launchDayTemplateIds = new Set(launchDayTemplates.map(t => t.id))

  let launchDate: Date | null = null
  for (const task of tasks) {
    if (task.templateId && launchDayTemplateIds.has(task.templateId)) {
      launchDate = task.dueDate
      break
    }
  }

  // Fallback: if no exact match, derive from first task and its template
  if (!launchDate && tasks[0]?.templateId) {
    const firstTemplate = await db.launchTemplate.findUnique({
      where: { id: tasks[0].templateId },
    })
    if (firstTemplate) {
      const d = new Date(tasks[0].dueDate)
      d.setDate(d.getDate() - firstTemplate.daysFromLaunch)
      launchDate = d
    }
  }

  // Get book title from first task name context — we store it in a user-level lookup
  // We don't have a dedicated field, so we use a bookId or just return what we have
  const bookTitle = null // will be retrieved from a user pref or returned from tasks

  return NextResponse.json({
    hasLaunch: true,
    launchDate: launchDate?.toISOString() ?? null,
    bookTitle,
    taskCount: tasks.length,
  })
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { launchDate: string; bookTitle: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { launchDate, bookTitle } = body
  if (!launchDate) return NextResponse.json({ error: 'launchDate required' }, { status: 400 })

  const launch = new Date(launchDate)
  if (isNaN(launch.getTime())) {
    return NextResponse.json({ error: 'Invalid launchDate' }, { status: 400 })
  }

  // Delete existing tasks for this user
  await db.launchTask.deleteMany({ where: { userId: session.user.id } })

  // Fetch all templates
  const templates = await db.launchTemplate.findMany({ orderBy: { daysFromLaunch: 'asc' } })

  // Create tasks from templates
  const tasks = await Promise.all(
    templates.map(async (template) => {
      const dueDate = new Date(launch)
      dueDate.setDate(dueDate.getDate() + template.daysFromLaunch)

      return db.launchTask.create({
        data: {
          userId: session.user.id,
          templateId: template.id,
          name: template.name,
          channel: template.channel,
          phase: template.phase,
          dueDate,
          status: 'not_started',
          actionType: template.actionType ?? null,
          actionPrompt: template.actionPrompt ?? null,
        },
      })
    })
  )

  return NextResponse.json({
    success: true,
    launchDate: launch.toISOString(),
    bookTitle,
    taskCount: tasks.length,
  })
}
