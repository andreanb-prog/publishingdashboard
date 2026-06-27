// app/api/admin/sync-health/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ADMIN_EMAILS } from '@/lib/getSession'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      kdpSyncStatus: true,
      kdpLastSyncAt: true,
      syncLogs: {
        orderBy: { attemptedAt: 'desc' },
        take: 1,
        select: {
          status: true,
          errorDetail: true,
          sessionId: true,
          attemptedAt: true,
        },
      },
    },
    orderBy: { email: 'asc' },
  })

  return NextResponse.json({ users })
}
