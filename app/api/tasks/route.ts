export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const where: Record<string, unknown> = { userId: session.user.id }
  if (status === 'todo' || status === 'done') {
    where.status = status
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' },
    ],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const task = await db.task.create({
    data: {
      userId: session.user.id,
      title: body.title,
      description: body.description ?? null,
      priority: body.priority ?? 'medium',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      category: body.category ?? null,
      assignee: body.assignee ?? 'author',
      assignedTo: body.assignedTo ?? null,
      isAISuggested: body.isAISuggested ?? false,
      aiReason: body.aiReason ?? null,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
