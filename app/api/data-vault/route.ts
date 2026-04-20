// app/api/data-vault/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const analyses = await db.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, month: true, data: true, createdAt: true },
  })

  return NextResponse.json({ analyses })
}

export async function DELETE(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, deleteAll } = await req.json()

  if (deleteAll) {
    await db.analysis.deleteMany({ where: { userId: session.user.id } })
    return NextResponse.json({ success: true })
  }

  if (id) {
    await db.analysis.delete({ where: { id, userId: session.user.id } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'No id or deleteAll provided' }, { status: 400 })
}
