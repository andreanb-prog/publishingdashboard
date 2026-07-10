// app/api/market-pulse/route.ts
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // POST runs the full multi-genre scrape

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { getLatestPulse, runPulseAll } from '@/lib/market-pulse'

// GET — latest pulse per genre (market-level, same for every user).
export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pulse = await getLatestPulse()
  return NextResponse.json({ pulse })
}

// POST — manual scrape trigger (any signed-in user; data is shared, and the
// pipeline is idempotent per day at worst-duplicate cost of one extra snapshot).
export async function POST() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const results = await runPulseAll()
  return NextResponse.json({ results })
}
