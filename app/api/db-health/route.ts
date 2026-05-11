// app/api/db-health/route.ts — write+read+delete test to confirm DB persistence
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function maskUrl(url: string | undefined): string {
  if (!url) return 'NOT SET'
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}?${u.searchParams}`
  } catch {
    return url.replace(/:[^:@]+@/, ':***@')
  }
}

export async function GET() {
  const start = Date.now()
  const databaseUrl = maskUrl(process.env.DATABASE_URL)
  let writeId: string | null = null

  try {
    // Write
    const record = await db.adminAuditLog.create({
      data: {
        adminEmail: '__db_health_check__',
        impersonatedEmail: '__db_health_check__',
        action: 'health_check',
        metadata: { ts: new Date().toISOString() },
      },
    })
    writeId = record.id

    // Read back
    const readBack = await db.adminAuditLog.findUnique({ where: { id: writeId } })
    if (!readBack) throw new Error('Write succeeded but immediate read returned null')

    // Delete
    await db.adminAuditLog.delete({ where: { id: writeId } })

    return NextResponse.json({
      status: 'ok',
      latencyMs: Date.now() - start,
      databaseUrl,
    })
  } catch (err) {
    if (writeId) {
      try { await db.adminAuditLog.delete({ where: { id: writeId } }) } catch {}
    }
    const message = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code
    console.error('[db-health] write/read/delete test failed:', message)
    return NextResponse.json({
      status: 'error',
      error: message,
      code,
      databaseUrl,
      latencyMs: Date.now() - start,
    }, { status: 500 })
  }
}
