// app/api/launches/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const launch = await db.launch.findUnique({ where: { id: params.id } })
  if (!launch || launch.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const allowed = ['bookTitle', 'asin', 'phase', 'customPhase', 'startDate', 'endDate', 'notes', 'status']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      if ((key === 'startDate' || key === 'endDate') && body[key]) {
        data[key] = new Date(body[key] as string)
      } else {
        data[key] = body[key]
      }
    }
  }

  const updated = await db.launch.update({ where: { id: params.id }, data })
  return NextResponse.json({
    launch: {
      ...updated,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate:   updated.endDate?.toISOString()   ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const launch = await db.launch.findUnique({ where: { id: params.id } })
  if (!launch || launch.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.launch.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
