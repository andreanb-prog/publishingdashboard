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

  const force = req.nextUrl.searchParams.get('force') === 'true'

  const allBooks = await db.book.findMany({
    where: { asin: { not: null } },
    select: { userId: true, asin: true, title: true },
  })

  // Only fetch Kindle eBook ASINs — skip paperback ISBNs (978/979) and anything
  // that doesn't match the standard Amazon ASIN pattern (B + 9 alphanumeric chars)
  const KINDLE_ASIN = /^B[A-Z0-9]{9}$/i
  const books = allBooks.filter(b => {
    const asin = b.asin!
    if (asin.startsWith('978') || asin.startsWith('979')) return false
    return KINDLE_ASIN.test(asin)
  })

  console.log(`[cron/bsr-refresh] ${allBooks.length} total books, ${books.length} valid Kindle ASINs to process${force ? ' (force=true, idempotent check skipped)' : ''}`)

  const { start: today, end: dayEnd } = todayUTC()

  let processed = 0
  let skipped = 0
  let errors = 0
  const errorDetails: { asin: string; error: string; httpStatus?: number }[] = []

  // Group books by user so we can add a per-user cooldown between batches
  const byUser = new Map<string, typeof books>()
  for (const book of books) {
    const list = byUser.get(book.userId) ?? []
    list.push(book)
    byUser.set(book.userId, list)
  }

  const users = Array.from(byUser.entries())
  console.log(`[cron/bsr-refresh] processing ${users.length} users`)

  // RapidAPI free tier: 1 req/s — use 1100 ms between requests to stay safely under.
  // Add a 2000 ms cooldown between users to space out burst windows.
  const REQUEST_DELAY_MS = 1100
  const USER_DELAY_MS = 2000

  for (let u = 0; u < users.length; u++) {
    const [userId, userBooks] = users[u]
    console.log(`[cron/bsr-refresh] user ${u + 1}/${users.length} (${userId}): ${userBooks.length} books`)

    for (const book of userBooks) {
      const asin = book.asin!

      try {
        // Idempotent: skip if a rank was already logged today for this user+book (bypass with ?force=true)
        if (!force) {
          const existing = await db.bsrLog.findFirst({
            where: { userId: book.userId, asin, rank: { not: null }, date: { gte: today, lt: dayEnd } },
            select: { id: true },
          })
          if (existing) {
            skipped++
            continue
          }
        }

        const result = await fetchBsrFromAmazon(asin)

        if ('error' in result) {
          const detail = { asin, error: result.error, httpStatus: result.httpStatus }
          console.error('[cron/bsr-refresh] fetch error', detail)
          errorDetails.push(detail)
          errors++
        } else {
          // Update today's row if one exists (e.g. under ?force=true, which
          // bypasses the skip check above), otherwise create — never append a
          // duplicate same-day row.
          const existingToday = await db.bsrLog.findFirst({
            where: { userId: book.userId, asin, date: { gte: today, lt: dayEnd } },
            select: { id: true },
          })
          if (existingToday) {
            await db.bsrLog.update({
              where: { id: existingToday.id },
              data: { rank: result.rank, bookTitle: book.title, fetchedAt: new Date() },
            })
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
          }
          processed++
          console.log(`[cron/bsr-refresh] logged rank=${result.rank} for ASIN=${asin}`)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[cron/bsr-refresh] unexpected error for ASIN=${asin}:`, msg)
        errorDetails.push({ asin, error: msg })
        errors++
      }

      // 1100 ms between requests — safely under RapidAPI free-tier 1 req/s limit
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS))
    }

    // 2000 ms cooldown between users to spread burst windows
    if (u < users.length - 1) {
      await new Promise(r => setTimeout(r, USER_DELAY_MS))
    }
  }

  return NextResponse.json({ success: true, processed, skipped, errors, errorDetails })
}
