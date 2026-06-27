// app/api/cron/sync/route.ts
// Nightly sync: KDP for connected users, then BSR for all users with books.
// Triggered by Vercel Cron — protected by x-cron-secret header.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncKdpForUser } from '@/lib/browserbase/kdp-sync'
import { fetchBsrForUser } from '@/lib/browserbase/bsr-fetch'

const BATCH_SIZE = 10

type UserResult = { userId: string; status: 'fulfilled' | 'rejected'; error?: string }

async function runInBatches(
  userIds: string[],
  fn: (userId: string) => Promise<void>,
): Promise<UserResult[]> {
  const results: UserResult[] = []
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE)
    const settled = await Promise.allSettled(batch.map(fn))
    settled.forEach((result, idx) => {
      const userId = batch[idx]
      if (result.status === 'rejected') {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
        results.push({ userId, status: 'rejected', error })
      } else {
        results.push({ userId, status: 'fulfilled' })
      }
    })
  }
  return results
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. KDP sync — users who have actively connected KDP via Browserbase
  const kdpUsers = await db.user.findMany({
    where: { kdpSyncStatus: 'connected' },
    select: { id: true },
  })
  console.log(`[cron/sync] KDP: ${kdpUsers.length} connected users`)

  const kdpResults = await runInBatches(
    kdpUsers.map(u => u.id),
    syncKdpForUser,
  )

  for (const r of kdpResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/sync] KDP failed for ${r.userId}:`, r.error)
  }

  // 2. BSR fetch — all users who have at least one book with an ASIN
  const bsrUsers = await db.user.findMany({
    where: { bookCatalog: { some: { asin: { not: null } } } },
    select: { id: true },
  })
  console.log(`[cron/sync] BSR: ${bsrUsers.length} users with books`)

  const bsrResults = await runInBatches(
    bsrUsers.map(u => u.id),
    fetchBsrForUser,
  )

  for (const r of bsrResults.filter(r => r.status === 'rejected')) {
    console.error(`[cron/sync] BSR failed for ${r.userId}:`, r.error)
  }

  return NextResponse.json({
    success: true,
    kdp: {
      total: kdpUsers.length,
      ok: kdpResults.filter(r => r.status === 'fulfilled').length,
      failed: kdpResults.filter(r => r.status === 'rejected').length,
    },
    bsr: {
      total: bsrUsers.length,
      ok: bsrResults.filter(r => r.status === 'fulfilled').length,
      failed: bsrResults.filter(r => r.status === 'rejected').length,
    },
  })
}
