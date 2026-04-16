// lib/bsr-fetch.ts — shared Amazon BSR fetch + parse logic
import * as cheerio from 'cheerio'

export interface BsrSuccess {
  rank: number
  subcategories: { rank: number; category: string }[]
  fetchedAt: string
}

export type BsrFetchResult = BsrSuccess | { error: 'blocked' | 'timeout' | 'parse_fail' | 'rate_limited'; nextAllowed?: string }

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

function parseBsr(html: string): { rank: number; subcategories: { rank: number; category: string }[] } | 'blocked' | null {
  if (
    html.includes('Robot Check') ||
    html.includes('api-services-support') ||
    html.includes('Type the characters you see') ||
    html.includes('Enter the characters you see')
  ) return 'blocked'

  const $ = cheerio.load(html)
  let bsrText = ''

  const selectors = [
    '#detailBullets_feature_div li',
    '#productDetails_detailBullets_sections1 tr',
    '#detailBulletsWrapper_feature_div li',
    '.pdTab li',
  ]

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text.includes('Best Sellers Rank') || text.includes('Best Seller Rank')) {
        bsrText = text
      }
    })
    if (bsrText) break
  }

  if (!bsrText) return null

  const matches = Array.from(bsrText.matchAll(/#([\d,]+)\s+in\s+([^\n#(]+)/g))
  if (!matches.length) return null

  const rank = parseInt(matches[0][1].replace(/,/g, ''))
  if (isNaN(rank)) return null

  const subcategories = matches.slice(1, 3).map(m => ({
    rank: parseInt(m[1].replace(/,/g, '')),
    category: m[2].trim().replace(/\s+/g, ' ').replace(/[()]/g, '').trim(),
  }))

  return { rank, subcategories }
}

export async function fetchBsrFromAmazon(asin: string): Promise<BsrFetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`https://www.amazon.com/dp/${encodeURIComponent(asin)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    const html = await response.text()
    const parsed = parseBsr(html)

    if (parsed === 'blocked') return { error: 'blocked' }
    if (!parsed) return { error: 'parse_fail' }

    return { rank: parsed.rank, subcategories: parsed.subcategories, fetchedAt: new Date().toISOString() }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return { error: 'timeout' }
    return { error: 'parse_fail' }
  } finally {
    clearTimeout(timer)
  }
}
