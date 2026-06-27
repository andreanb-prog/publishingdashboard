// app/api/cron/bsr/route.ts
// Hourly BSR fetch for all users with at least one book ASIN.
// Protected by x-cron-secret header — only Vercel Cron can trigger it.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchBsrForUser } from '@/lib/browserbase/bsr-fetch'

const BATCH_SIZE = 10

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await db.user.findMany({
    where: { bookCatalog: { some: { asin: { not: null } } } },
    select: { id: true },
  })

  const userIds = users.map(u => u.id)
  console.log(`[cron/bsr] ${userIds.length} users to process`)

  let succeeded = 0
  let failed = 0

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map(fetchBsrForUser))
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        succeeded++
      } else {
        failed++
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
        console.error(`[cron/bsr] failed for ${batch[idx]}:`, error)
      }
    })
  }

  return NextResponse.json({ total: userIds.length, succeeded, failed })
}
