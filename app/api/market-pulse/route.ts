// app/api/market-pulse/route.ts
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // POST runs the full multi-genre scrape

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { getLatestPulse, runPulseAll } from '@/lib/market-pulse'
import { db } from '@/lib/db'

// GET — latest pulse per genre (market-level, same for every user).
export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pulse = await getLatestPulse()
  return NextResponse.json({ pulse })
}

// POST — manual scrape trigger (any signed-in user; data is shared, and the
// pipeline is idempotent per day at worst-duplicate cost of one extra snapshot).
// ?reenrich=1 purges the AsinMeta cache first — used after parser fixes so bad
// cached rows (wrong KU flags/prices) get refetched instead of aging out over
// 14 days.
export async function POST(req: Request) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  if (url.searchParams.get('reenrich') === '1') {
    const purged = await db.asinMeta.deleteMany({})
    console.log(`[market-pulse] reenrich: purged ${purged.count} cached ASIN rows`)
  }
  const results = await runPulseAll()
  return NextResponse.json({ results })
}
