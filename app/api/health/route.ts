// app/api/health/route.ts — Uptime monitoring endpoint
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const now = new Date().toISOString()
  let dbStatus = 'ok'

  try {
    // Quick DB ping
    await db.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'error'
  }

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: now,
    database: dbStatus,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
  })
}
