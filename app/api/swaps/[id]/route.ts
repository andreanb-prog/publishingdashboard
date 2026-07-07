import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import { serializeSwapEntry, statusToConfirmation } from '@/lib/swaps'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.swapEntry.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()

  const updated = await db.swapEntry.update({
    where: { id: params.id },
    // The UI sends component-vocab status (sent/complete/cancelled); map it to the
    // SwapEntry confirmation enum.
    data: {
      ...(body.status !== undefined && { confirmation: statusToConfirmation(body.status) }),
    },
  })

  return NextResponse.json({ success: true, swap: serializeSwapEntry(updated) })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.swapEntry.findUnique({ where: { id: params.id } })
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.swapEntry.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
