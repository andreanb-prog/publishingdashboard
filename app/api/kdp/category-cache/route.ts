import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

// POST — look up categories from BKLNK and cache them
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
    // Fetch the BKLNK page for this ASIN
    const url = `https://bklnk.com/amazon/us/${encodeURIComponent(asin)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AuthorDash/1.0' },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'BKLNK returned an error — check that your ASIN is correct' },
        { status: 502 },
      )
    }

    const html = await res.text()

    // Parse categories + ranks from the BKLNK HTML
    const categories = parseBklnkCategories(html)

    if (categories.length === 0) {
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
// Parse the BKLNK HTML for category names + ranks
// BKLNK renders category rows like:
//   <a ...>Kindle Store > Kindle eBooks > Romance > Contemporary</a>
//   <span ...>#1,234</span>
// ---------------------------------------------------------------------------
interface ParsedCategory {
  category: string
  rank: number | null
}

function parseBklnkCategories(html: string): ParsedCategory[] {
  const results: ParsedCategory[] = []

  // Pattern 1: look for category breadcrumb paths followed by rank numbers
  // BKLNK typically shows "Category > Subcategory > ..." with rank "#N"
  const categoryBlockRegex = /class="[^"]*category[^"]*"[^>]*>([^<]+(?:<[^>]+>[^<]*)*)<\/[^>]+>\s*(?:<[^>]*>)*\s*#([\d,]+)/gi
  let match = categoryBlockRegex.exec(html)
  while (match) {
    const rawCategory = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const rank = parseInt(match[2].replace(/,/g, ''), 10)
    if (rawCategory && rawCategory.length > 3) {
      results.push({ category: rawCategory, rank: isNaN(rank) ? null : rank })
    }
    match = categoryBlockRegex.exec(html)
  }

  // Pattern 2: fallback — look for ">" separated breadcrumbs near rank numbers
  if (results.length === 0) {
    const breadcrumbRegex = /((?:[\w\s&'-]+\s*>\s*){1,}[\w\s&'-]+)\s*(?:<[^>]*>)*\s*#([\d,]+)/g
    let m = breadcrumbRegex.exec(html)
    while (m) {
      const cat = m[1].replace(/\s*>\s*/g, ' > ').trim()
      const rank = parseInt(m[2].replace(/,/g, ''), 10)
      if (cat.length > 5) {
        results.push({ category: cat, rank: isNaN(rank) ? null : rank })
      }
      m = breadcrumbRegex.exec(html)
    }
  }

  // Deduplicate by category name
  const seen = new Set<string>()
  return results.filter(r => {
    if (seen.has(r.category)) return false
    seen.add(r.category)
    return true
  })
}
