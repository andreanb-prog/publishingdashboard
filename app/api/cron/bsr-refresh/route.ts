// app/api/cron/bsr-refresh/route.ts
// Vercel cron job: fetches BSR for all books with an ASIN and logs the result.
// Runs twice daily (5 AM and 5 PM UTC = 7 AM / 7 PM HST).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchBsrFromAmazon } from '@/lib/bsr-fetch'

function todayUTC(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const books = await db.book.findMany({
    where: { asin: { not: null } },
    select: { userId: true, asin: true, title: true },
  })

  const { start: today, end: dayEnd } = todayUTC()

  const results = await Promise.allSettled(
    books.map(async (book) => {
      const asin = book.asin!

      // Idempotent: skip if a rank was already logged today for this user+book
      const existing = await db.bsrLog.findFirst({
        where: { userId: book.userId, asin, rank: { not: null }, date: { gte: today, lt: dayEnd } },
        select: { id: true },
      })
      if (existing) return 'skipped' as const

      const result = await fetchBsrFromAmazon(asin)
      if ('error' in result) {
        throw new Error(`${asin}: ${result.error}`)
      }

      await db.bsrLog.create({
        data: {
          userId: book.userId,
          asin,
          bookTitle: book.title,
          rank: result.rank,
          date: today,
          fetchedAt: new Date(),
        },
      })
      return 'processed' as const
    })
  )

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[cron/bsr-refresh]', r.reason)
      errors++
    } else if (r.value === 'skipped') {
      skipped++
    } else {
      processed++
    }
  }

  return NextResponse.json({ success: true, processed, skipped, errors })
}
