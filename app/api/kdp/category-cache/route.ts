import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as cheerio from 'cheerio'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

// GET — return cached categories for a given ASIN
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const asin = req.nextUrl.searchParams.get('asin')
  if (!asin) {
    return NextResponse.json({ error: 'Missing asin' }, { status: 400 })
  }

  const rows = await db.categoryCache.findMany({
    where: { userId: session.user.id, asin },
    orderBy: { rank: 'asc' },
  })

  return NextResponse.json({ data: rows })
}

// POST — look up categories from bklnk (with Amazon fallback) and cache them
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { asin } = await req.json()
  if (!asin || typeof asin !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid asin' }, { status: 400 })
  }

  try {
    // ── Strategy 1: bklnk.com ────────────────────────────────────────────────
    let categories = await fetchFromBklnk(asin)

    // ── Strategy 2: Amazon direct fallback ───────────────────────────────────
    if (categories.length === 0) {
      console.log(`[category] bklnk returned 0 results for ${asin} — trying Amazon direct`)
      categories = await fetchFromAmazon(asin)
    }

    if (categories.length === 0) {
      console.error(`[category] Both sources failed for ASIN ${asin}`)
      return NextResponse.json(
        {
          error: 'category_lookup_unavailable',
          message: 'Category data temporarily unavailable — try again later',
        },
        { status: 404 },
      )
    }

    // Delete old cached rows for this user+asin, then insert fresh ones
    await db.categoryCache.deleteMany({
      where: { userId: session.user.id, asin },
    })

    const created = await db.$transaction(
      categories.map(c =>
        db.categoryCache.create({
          data: {
            userId: session.user.id,
            asin,
            category: c.category,
            rank: c.rank,
          },
        }),
      ),
    )

    return NextResponse.json({ data: created })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[category] lookup failed:', message)
    return NextResponse.json(
      {
        error: 'category_lookup_unavailable',
        message: 'Category data temporarily unavailable — try again later',
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Fetch from bklnk.com
// ---------------------------------------------------------------------------
async function fetchFromBklnk(asin: string): Promise<ParsedCategory[]> {
  try {
    const url = `https://bklnk.com/amazon/us/${asin}`
    console.log('[category] fetching bklnk ASIN:', asin)

    const response = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        'Referer': 'https://bklnk.com/',
      },
      signal: AbortSignal.timeout(15_000),
    })

    console.log('[category] bklnk response status:', response.status)

    if (!response.ok) {
      console.error(`[category] bklnk returned ${response.status} for ASIN ${asin}`)
      return []
    }

    const html = await response.text()
    console.log('[category] bklnk html preview:', html.slice(0, 300))

    return parseBklnkCategories(html)
  } catch (err) {
    console.error('[category] bklnk fetch error:', err instanceof Error ? err.message : err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Fetch from Amazon direct
// ---------------------------------------------------------------------------
async function fetchFromAmazon(asin: string): Promise<ParsedCategory[]> {
  try {
    const url = `https://www.amazon.com/dp/${encodeURIComponent(asin)}`
    console.log('[category] fetching Amazon ASIN:', asin)

    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
    })

    console.log('[category] Amazon response status:', res.status)

    if (!res.ok) {
      console.error(`[category] Amazon returned ${res.status} for ASIN ${asin}`)
      return []
    }

    const html = await res.text()
    console.log('[category] Amazon html preview:', html.slice(0, 300))

    const categories = parseAmazonCategories(html)
    console.log(`[category] Amazon parsed ${categories.length} categories for ASIN ${asin}`)

    if (categories.length === 0) {
      const bsrIdx = html.indexOf('Best Sellers Rank')
      if (bsrIdx === -1) {
        console.error(`[category] No "Best Sellers Rank" text found in Amazon page for ${asin}`)
      } else {
        console.error(`[category] BSR section found but parser failed. Snippet: ${html.slice(bsrIdx, bsrIdx + 500)}`)
      }
    }

    return categories
  } catch (err) {
    console.error('[category] Amazon fetch error:', err instanceof Error ? err.message : err)
    return []
  }
}

// ---------------------------------------------------------------------------
interface ParsedCategory {
  category: string
  rank: number | null
}

// ---------------------------------------------------------------------------
// Parse bklnk.com HTML for BSR categories
// Tries multiple selector strategies
// ---------------------------------------------------------------------------
function parseBklnkCategories(html: string): ParsedCategory[] {
  const $ = cheerio.load(html)
  const results: ParsedCategory[] = []

  // Strategy 1: links containing /category/ in href (bklnk category links)
  $('a[href*="/category/"]').each((_i, el) => {
    const linkText = $(el).text().trim()
    // Look for a sibling or parent text containing a rank
    const parent = $(el).parent()
    const parentText = parent.text().trim()
    const rankMatch = parentText.match(/#([\d,]+)/)
    if (linkText.length > 2) {
      const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : null
      results.push({ category: linkText, rank: isNaN(rank ?? NaN) ? null : rank })
    }
  })

  if (results.length > 0) return dedupe(results)

  // Strategy 2: any element whose text starts with #N (BSR rank pattern)
  $('*').filter((_i, el) => {
    const text = $(el).children().length === 0 ? $(el).text().trim() : ''
    return /^#[\d,]+/.test(text)
  }).each((_i, el) => {
    const text = $(el).text().trim()
    const m = text.match(/#([\d,]+)\s+in\s+(.+)/)
    if (m) {
      const rank = parseInt(m[1].replace(/,/g, ''), 10)
      const category = m[2].trim()
      if (category.length > 2) {
        results.push({ category, rank: isNaN(rank) ? null : rank })
      }
    }
  })

  if (results.length > 0) return dedupe(results)

  // Strategy 3: table cells or list items mentioning Best Sellers
  $('td, li').filter((_i, el) => $(el).text().includes('Best Sellers')).each((_i, el) => {
    const text = $(el).text().trim()
    const re = /#([\d,]+)\s+in\s+([^(#\n]+)/g
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      const rank = parseInt(match[1].replace(/,/g, ''), 10)
      const category = match[2].trim()
      if (category.length > 2) {
        results.push({ category, rank: isNaN(rank) ? null : rank })
      }
    }
  })

  return dedupe(results)
}

// ---------------------------------------------------------------------------
// Parse Amazon product page HTML for Best Sellers Rank categories
// ---------------------------------------------------------------------------
function parseAmazonCategories(html: string): ParsedCategory[] {
  const $ = cheerio.load(html)
  const results: ParsedCategory[] = []

  // Strategy 1: Parse the sub-category list (ul.zg_hrsr)
  $('ul.zg_hrsr li span.a-list-item').each((_i, el) => {
    const text = $(el).text().trim()
    const m = text.match(/#([\d,]+)\s+in\s+(.+)/)
    if (m) {
      const rank = parseInt(m[1].replace(/,/g, ''), 10)
      const category = m[2].trim()
      if (category.length > 2) {
        results.push({ category, rank: isNaN(rank) ? null : rank })
      }
    }
  })

  // Strategy 2: Parse from detailBulletsWrapper or productDetails sections
  if (results.length === 0) {
    const detailSections = $('#detailBulletsWrapper_feature_div, #productDetails_db_sections, #detail-bullets')
    detailSections.find('span, li').each((_i, el) => {
      const text = $(el).text().trim()
      if (text.includes('Best Sellers Rank')) {
        const re = /#([\d,]+)\s+in\s+([^(#\n]+)/g
        let match: RegExpExecArray | null
        while ((match = re.exec(text)) !== null) {
          const rank = parseInt(match[1].replace(/,/g, ''), 10)
          const category = match[2].trim()
          if (category.length > 2) {
            results.push({ category, rank: isNaN(rank) ? null : rank })
          }
        }
      }
    })
  }

  // Strategy 3: Broad search for any span.a-text-bold with BSR label
  if (results.length === 0) {
    $('span.a-text-bold').each((_i, el) => {
      const label = $(el).text().trim()
      if (label.includes('Best Sellers Rank')) {
        const parent = $(el).parent()
        const fullText = parent.text()
        const re = /#([\d,]+)\s+in\s+([^(#\n]+)/g
        let match: RegExpExecArray | null
        while ((match = re.exec(fullText)) !== null) {
          const rank = parseInt(match[1].replace(/,/g, ''), 10)
          const category = match[2].trim()
          if (category.length > 2) {
            results.push({ category, rank: isNaN(rank) ? null : rank })
          }
        }
      }
    })
  }

  return dedupe(results)
}

function dedupe(results: ParsedCategory[]): ParsedCategory[] {
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.category)) return false
    seen.add(r.category)
    return true
  })
}
