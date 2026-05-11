// app/api/db-check/route.ts — read back the 5 most recent KDP upload logs to confirm writes
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
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
