import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as cheerio from 'cheerio'

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

// POST — look up categories from Amazon product page and cache them
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
    // Fetch the Amazon product page directly
    const url = `https://www.amazon.com/dp/${encodeURIComponent(asin)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      console.error(`[category-cache] Amazon returned ${res.status} for ASIN ${asin}`)
      return NextResponse.json(
        { error: `Amazon returned HTTP ${res.status} — check that your ASIN is correct` },
        { status: 502 },
      )
    }

    const html = await res.text()
    console.log(`[category-cache] Fetched ${html.length} bytes for ASIN ${asin}`)

    // Parse categories + ranks from the Amazon product page
    const categories = parseAmazonCategories(html)
    console.log(`[category-cache] Parsed ${categories.length} categories for ASIN ${asin}`)

    if (categories.length === 0) {
      // Log a snippet around "Best Sellers Rank" to help debug
      const bsrIdx = html.indexOf('Best Sellers Rank')
      if (bsrIdx === -1) {
        console.error(`[category-cache] No "Best Sellers Rank" text found in page for ${asin}`)
      } else {
        console.error(`[category-cache] BSR section found but parser failed. Snippet: ${html.slice(bsrIdx, bsrIdx + 500)}`)
      }
      return NextResponse.json(
        { error: 'No categories found — the ASIN may be incorrect or the book is not listed' },
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
    console.error('[category-cache] lookup failed:', message)
    return NextResponse.json({ error: 'Category lookup failed — try again later' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Parse Amazon product page HTML for Best Sellers Rank categories
// Amazon structure:
//   <span class="a-text-bold"> Best Sellers Rank: </span>
//   #210,948 in Kindle Store (See Top 100 ...)
//   <ul class="zg_hrsr">
//     <li><span class="a-list-item"> #2,832 in <a href="...">Category Name</a></span></li>
//     ...
//   </ul>
// ---------------------------------------------------------------------------
interface ParsedCategory {
  category: string
  rank: number | null
}

function parseAmazonCategories(html: string): ParsedCategory[] {
  const $ = cheerio.load(html)
  const results: ParsedCategory[] = []

  // Strategy 1: Parse the sub-category list (ul.zg_hrsr)
  // Each <li> contains "#N in <a>Category Name</a>"
  $('ul.zg_hrsr li span.a-list-item').each((_i, el) => {
    const text = $(el).text().trim()
    // Match pattern: #1,234 in Category Name
    const m = text.match(/#([\d,]+)\s+in\s+(.+)/)
    if (m) {
      const rank = parseInt(m[1].replace(/,/g, ''), 10)
      const category = m[2].trim()
      if (category.length > 2) {
        results.push({ category, rank: isNaN(rank) ? null : rank })
      }
    }
  })

  // Strategy 2: Parse the overall BSR from the "Best Sellers Rank" line
  // This gives us the top-level store rank (e.g. "Kindle Store")
  if (results.length === 0) {
    // Find the text node containing "Best Sellers Rank"
    $('span.a-text-bold').each((_i, el) => {
      const label = $(el).text().trim()
      if (label.includes('Best Sellers Rank')) {
        const parent = $(el).parent()
        const fullText = parent.text()
        // Parse "#N in Store Name" from the full text
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

  // Deduplicate by category name
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.category)) return false
    seen.add(r.category)
    return true
  })
}
