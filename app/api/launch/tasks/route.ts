// app/api/launch/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'this_week'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  let whereClause: Record<string, unknown> = { userId: session.user.id }

  if (filter === 'this_week') {
    // All incomplete tasks due on or before 7 days from now (includes overdue from any phase)
    whereClause = {
      userId: session.user.id,
      status: { notIn: ['done', 'skipped'] },
      dueDate: { lte: weekEnd },
    }
  } else if (filter === 'all') {
    // No additional date filter
  } else if (['pre-order', 'launch', 'post-launch', 'evergreen'].includes(filter)) {
    whereClause = {
      userId: session.user.id,
      phase: filter,
    }
  }

  const tasks = await db.launchTask.findMany({
    where: whereClause,
    orderBy: { dueDate: 'asc' },
  })

  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    name: string
    channel: string
    phase: string
    dueDate: string
    actionType?: string | null
    actionPrompt?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { name, channel, phase, dueDate, actionType, actionPrompt } = body
  if (!name || !channel || !phase || !dueDate) {
    return NextResponse.json({ error: 'name, channel, phase, dueDate required' }, { status: 400 })
  }

  const task = await db.launchTask.create({
    data: {
      userId: session.user.id,
      name,
      channel,
      phase,
      dueDate: new Date(dueDate),
      status: 'not_started',
      actionType: actionType ?? null,
      actionPrompt: actionPrompt ?? null,
    },
  })

  return NextResponse.json({ task })
}
