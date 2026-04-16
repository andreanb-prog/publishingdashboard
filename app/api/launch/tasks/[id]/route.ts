// app/api/launch/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const task = await db.launchTask.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const allowedFields = ['status', 'name', 'channel', 'phase', 'dueDate', 'assignedTo', 'notes']
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = field === 'dueDate' && body[field]
        ? new Date(body[field] as string)
        : body[field]
    }
  }

  const updated = await db.launchTask.update({ where: { id }, data })
  return NextResponse.json({ task: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  const task = await db.launchTask.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  await db.launchTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
