// app/api/db-check/route.ts — read back the 5 most recent KDP upload logs to confirm writes
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ADMIN_EMAILS } from '@/lib/getSession'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const recentUploads = await db.uploadLog.findMany({
      where: { fileType: 'kdp' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { userId: true, createdAt: true, rowCount: true, status: true },
    })

    const totalKdpRows = await db.kdpSale.count()

    return NextResponse.json({
      ok: true,
      recentKdpUploads: recentUploads,
      totalKdpSaleRows: totalKdpRows,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[db-check] query failed:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
