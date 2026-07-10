// app/api/cron/market-pulse/route.ts
// Daily market scrape — one run covers ALL users (data is market-level).
// Schedule in vercel.json alongside the other crons.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cronAuth'
import { runPulseAll } from '@/lib/market-pulse'

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const results = await runPulseAll()
  const ok = Object.values(results).filter(r => r.ok).length
  console.log(`[cron/market-pulse] ${ok}/${Object.keys(results).length} genres ok`, results)
  return NextResponse.json({ results })
}
