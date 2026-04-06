export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let lists = await db.authorList.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  // Seed default list for new users
  if (lists.length === 0) {
    await db.authorList.create({
      data: {
        userId:    session.user.id,
        name:      'Elle Wilder Books',
        isDefault: true,
      },
    })
    lists = await db.authorList.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })
  }

  return NextResponse.json({ success: true, lists })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const list = await db.authorList.create({
    data: {
      userId:    session.user.id,
      name:      body.name,
      isDefault: body.isDefault ?? false,
    },
  })

  return NextResponse.json({ success: true, list })
}
