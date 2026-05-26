export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || session.user.email !== 'andreanbonilla@gmail.com') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = session.user.id as string

  // Today start-of-day UTC
  const todayStr = '2026-05-26'

  const records = await db.kdpSale.findMany({
    where: { userId, date: { gte: todayStr } },
    orderBy: [{ asin: 'asc' }, { royalties: 'asc' }],
  })

  // Group by asin, keep lowest-royalties record per asin per date
  const keepIds = new Set<string>()
  const seen = new Map<string, boolean>()

  for (const r of records) {
    const key = `${r.asin}::${r.date}`
    if (!seen.has(key)) {
      seen.set(key, true)
      keepIds.add(r.id)
    }
  }

  const deleteIds = records.map((r) => r.id).filter((id) => !keepIds.has(id))

  if (deleteIds.length === 0) {
    return NextResponse.json({ deleted: 0, kept: records.length })
  }

  await db.kdpSale.deleteMany({ where: { id: { in: deleteIds } } })

  return NextResponse.json({ deleted: deleteIds.length, kept: keepIds.size })
}
