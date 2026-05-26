// lib/bsr-fetch.ts — Amazon BSR fetch via OpenWeb Ninja Real-Time Amazon Data API (RapidAPI)

export interface BsrSuccess {
  rank: number
  subcategories: { rank: number; category: string }[]
  fetchedAt: string
}

export type BsrFetchResult =
  | BsrSuccess
  | { error: 'blocked' | 'timeout' | 'parse_fail' | 'rate_limited'; httpStatus?: number; nextAllowed?: string }

// In-memory rate limit shared across imports in the same module instance
const rateCache = new Map<string, number>()
const RATE_LIMIT_MS = 60 * 60 * 1000

export function isRateLimited(key: string): { limited: boolean; nextAllowed?: string } {
  const last = rateCache.get(key)
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    return { limited: true, nextAllowed: new Date(last + RATE_LIMIT_MS).toISOString() }
  }
  return { limited: false }
}

export function markFetched(key: string) {
  rateCache.set(key, Date.now())
}

export async function fetchBsrFromAmazon(asin: string): Promise<BsrFetchResult> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    console.error('[bsr-fetch] RAPIDAPI_KEY is not set')
    return { error: 'parse_fail' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${encodeURIComponent(asin)}&country=US`
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'real-time-amazon-data.p.rapidapi.com',
      },
    })

    const httpStatus = response.status
    console.log(`[bsr-fetch] ASIN=${asin} HTTP=${httpStatus}`)

    if (!response.ok) {
      return { error: 'blocked', httpStatus }
    }

    const json = await response.json()
    const bsrList: { rank: string | number; ladder: { name: string }[] }[] | undefined =
      json?.data?.product_details?.best_sellers_rank ??
      json?.data?.best_sellers_rank

    if (!Array.isArray(bsrList) || bsrList.length === 0) {
      console.error('[bsr-fetch] No best_sellers_rank in response', JSON.stringify(json).slice(0, 500))
      return { error: 'parse_fail', httpStatus }
    }

    const topRank = parseInt(String(bsrList[0].rank).replace(/[^0-9]/g, ''), 10)
    if (isNaN(topRank)) return { error: 'parse_fail', httpStatus }

    const subcategories = bsrList.slice(1, 3).map(entry => ({
      rank: parseInt(String(entry.rank).replace(/[^0-9]/g, ''), 10),
      category: entry.ladder?.map(l => l.name).join(' > ') ?? String(entry.rank),
    })).filter(s => !isNaN(s.rank))

    return { rank: topRank, subcategories, fetchedAt: new Date().toISOString() }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return { error: 'timeout' }
    console.error(`[bsr-fetch] ASIN=${asin} caught:`, err)
    return { error: 'parse_fail' }
  } finally {
    clearTimeout(timer)
  }
}
