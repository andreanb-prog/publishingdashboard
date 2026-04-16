// app/api/books/bsr/fetch/route.ts
// GET /api/books/bsr/fetch?asin=XXXXXXXX
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchBsrFromAmazon, isRateLimited, markFetched } from '@/lib/bsr-fetch'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const asin = new URL(req.url).searchParams.get('asin')?.trim()
  if (!asin) return NextResponse.json({ error: 'no_asin' }, { status: 400 })

  // Rate limit: check most recent BsrLog entry date as fallback, then in-memory cache
  const cacheKey = `${session.user.id}:${asin}`
  const { limited, nextAllowed } = isRateLimited(cacheKey)
  if (limited) {
    return NextResponse.json({ error: 'rate_limited', nextAllowed }, { status: 200 })
  }

  // Also check DB: don't fetch if already fetched within the last hour
  const recent = await db.bsrLog.findFirst({
    where: { userId: session.user.id, asin },
    orderBy: { fetchedAt: 'desc' },
  })
  if (recent) {
    const age = Date.now() - new Date(recent.fetchedAt).getTime()
    if (age < 60 * 60 * 1000) {
      return NextResponse.json({
        error: 'rate_limited',
        nextAllowed: new Date(new Date(recent.fetchedAt).getTime() + 60 * 60 * 1000).toISOString(),
      }, { status: 200 })
    }
  }

  const result = await fetchBsrFromAmazon(asin)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 200 })
  }

  markFetched(cacheKey)
  return NextResponse.json(result)
}
