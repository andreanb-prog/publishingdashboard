// app/api/books/bsr/fetch/route.ts
// GET /api/books/bsr/fetch?asin=XXXXXXXX
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { fetchBsrFromAmazon, isRateLimited, markFetched } from '@/lib/bsr-fetch'

export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const asin = new URL(req.url).searchParams.get('asin')?.trim()
  if (!asin) return NextResponse.json({ error: 'no_asin' }, { status: 400 })

  const cacheKey = `${session.user.id}:${asin}`
  const { limited, nextAllowed } = isRateLimited(cacheKey)
  if (limited) {
    return NextResponse.json({ error: 'rate_limited', nextAllowed }, { status: 200 })
  }

  const result = await fetchBsrFromAmazon(asin)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 200 })
  }

  markFetched(cacheKey)
  return NextResponse.json(result)
}
