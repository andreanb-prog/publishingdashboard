// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await db.campaign.findUnique({ where: { id: params.id } })
  if (!campaign || campaign.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.campaign.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
