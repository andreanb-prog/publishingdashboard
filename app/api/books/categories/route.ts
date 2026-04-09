// app/api/books/categories/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { load } from 'cheerio'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const asin = req.nextUrl.searchParams.get('asin')
  if (!asin)
    return Response.json({ error: 'ASIN required' }, { status: 400 })

  // Check cache (24hr TTL)
  const cached = await db.categoryCache.findMany({
    where: { userId: session.user.id, asin },
  })
  if (cached.length > 0) {
    const ageMs = Date.now() - new Date(cached[0].fetchedAt).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      return Response.json({
        success: true,
        data: cached.map(c => ({
          category: c.category,
          rank: c.rank,
        })),
        cached: true,
      })
    }
  }

  // Polite delay
  await new Promise(r => setTimeout(r, 500))

  const response = await fetch(`https://www.amazon.com/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  const html = await response.text()

  // Check for CAPTCHA / rate limit
  if (html.includes('Robot Check') || html.includes('captcha')) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
  }

  const $ = load(html)
  const categories: { rank: number; path: string }[] = []

  const addCategory = (rankNum: number, pathStr: string) => {
    const trimmed = pathStr.trim()
    if (!trimmed || rankNum <= 0) return
    if (categories.find(c => c.rank === rankNum && c.path === trimmed)) return
    categories.push({ rank: rankNum, path: trimmed })
  }

  // Pattern 1: table row
  $('tr').each((_: number, row) => {
    const label = $(row).find('th, .a-color-secondary').text()
    if (label.includes('Best Sellers Rank')) {
      const text = $(row).find('td').text()
      for (const m of Array.from<RegExpMatchArray>(text.matchAll(/#([\d,]+)\s+in\s+([^(#\n]+)/g))) {
        addCategory(parseInt(m[1].replace(/,/g, '')), m[2].trim())
      }
    }
  })

  // Pattern 2: detail bullets span
  $('#detailBulletsWrapper_feature_div span.a-list-item').each((_: number, el) => {
    const text = $(el).text()
    if (text.includes('Best Sellers Rank')) {
      for (const m of Array.from<RegExpMatchArray>(text.matchAll(/#([\d,]+)\s+in\s+([^#\n(]+)/g))) {
        addCategory(
          parseInt(m[1].replace(/,/g, '')),
          m[2].trim().replace(/\s+/g, ' ')
        )
      }
    }
  })

  categories.sort((a, b) => a.rank - b.rank)

  // Upsert each category into the cache
  for (const cat of categories) {
    await db.categoryCache.upsert({
      where: {
        userId_asin_category: {
          userId: session.user.id,
          asin,
          category: cat.path,
        },
      },
      create: {
        userId: session.user.id,
        asin,
        category: cat.path,
        rank: cat.rank,
      },
      update: { rank: cat.rank, fetchedAt: new Date() },
    })
  }

  return Response.json({
    success: true,
    data: categories.map(c => ({ category: c.path, rank: c.rank })),
    cached: false,
  })
}
