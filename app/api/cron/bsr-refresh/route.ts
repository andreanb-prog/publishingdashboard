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

  let processed = 0
  let skipped = 0
  let errors = 0
  const errorDetails: { asin: string; error: string; httpStatus?: number }[] = []

  // Process sequentially with a 500 ms gap to avoid triggering Amazon bot-detection
  for (const book of books) {
    const asin = book.asin!

    try {
      // Idempotent: skip if a rank was already logged today for this user+book
      const existing = await db.bsrLog.findFirst({
        where: { userId: book.userId, asin, rank: { not: null }, date: { gte: today, lt: dayEnd } },
        select: { id: true },
      })
      if (existing) {
        skipped++
        continue
      }

      const result = await fetchBsrFromAmazon(asin)

      if ('error' in result) {
        const detail = { asin, error: result.error, httpStatus: result.httpStatus }
        console.error('[cron/bsr-refresh] fetch error', detail)
        errorDetails.push(detail)
        errors++
      } else {
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
        processed++
        console.log(`[cron/bsr-refresh] logged rank=${result.rank} for ASIN=${asin}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[cron/bsr-refresh] unexpected error for ASIN=${asin}:`, msg)
      errorDetails.push({ asin, error: msg })
      errors++
    }

    // 500 ms delay between requests — keeps us under Amazon's bot radar
    await new Promise(r => setTimeout(r, 500))
  }

  return NextResponse.json({ success: true, processed, skipped, errors, errorDetails })
}
