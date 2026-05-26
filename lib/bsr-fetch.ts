// lib/bsr-fetch.ts — Amazon BSR fetch via OpenWeb Ninja direct API (app.openwebninja.com)

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
  console.log('[bsr-fetch] RAPIDAPI_KEY present:', !!process.env.RAPIDAPI_KEY)
  console.log('[bsr-fetch] path: OpenWeb Ninja direct API')

  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable not set')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const url = `https://api.openwebninja.com/realtime-amazon-data/product-details?asin=${encodeURIComponent(asin)}&country=US`
    console.log('[bsr-fetch] calling URL:', url)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
      },
    })

    const httpStatus = response.status
    console.log(`[bsr-fetch] ASIN=${asin} HTTP=${httpStatus}`)

    const rawBody = await response.text()
    // Log full body on first request so we can confirm the response shape
    console.log('[bsr-fetch] raw response body:', rawBody)

    if (!response.ok) {
      return { error: 'blocked', httpStatus }
    }

    const json = JSON.parse(rawBody)

    // OpenWeb Ninja returns BSR as a text string in product_information or product_details
    const bsrString: string | undefined =
      json?.data?.product_information?.['Best Sellers Rank'] ??
      json?.data?.product_details?.['Best Sellers Rank']

    if (!bsrString || typeof bsrString !== 'string') {
      console.error('[bsr-fetch] No Best Sellers Rank string in response', JSON.stringify(json).slice(0, 500))
      return { error: 'parse_fail', httpStatus }
    }

    // Extract all #number + label pairs from the BSR string
    // e.g. "#335,172 in Kindle Store ..." → [{ rank: 335172, category: "Kindle Store" }, ...]
    const matches = [...bsrString.matchAll(/#([\d,]+)\s+in\s+([^#\n(]+)/g)]
    if (matches.length === 0) {
      console.error('[bsr-fetch] Failed to parse BSR string:', bsrString)
      return { error: 'parse_fail', httpStatus }
    }

    const topRank = parseInt(matches[0][1].replace(/,/g, ''), 10)
    if (isNaN(topRank)) return { error: 'parse_fail', httpStatus }

    const subcategories = matches.slice(1).map(m => ({
      rank: parseInt(m[1].replace(/,/g, ''), 10),
      category: m[2].trim(),
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
