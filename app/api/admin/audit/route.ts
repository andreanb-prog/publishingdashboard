// app/api/admin/audit/route.ts
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

  const logs = await db.adminAuditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  })

  return NextResponse.json({ logs })
}
