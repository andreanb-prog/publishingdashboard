// app/api/books/categories/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import * as cheerio from 'cheerio'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const asin = req.nextUrl.searchParams.get('asin')
  if (!asin)
    return Response.json({ error: 'ASIN required' }, { status: 400 })

  // Check cache (24hr TTL)
  const cached = await db.categoryCache.findUnique({
    where: { userId_asin: { userId: session.user.id, asin } },
  })
  if (cached) {
    const ageMs = Date.now() - new Date(cached.fetchedAt).getTime()
    if (ageMs < 24 * 60 * 60 * 1000) {
      return Response.json({
        success: true,
        data: JSON.parse(cached.data),
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

  const $ = cheerio.load(html)
  const categories: {
    rank: number
    path: string[]
    rawPath: string
    bestSellersUrl: string
    newReleasesUrl: string
    rankStrength: 'top100' | 'strong' | 'competitive' | 'low'
  }[] = []

  const addCategory = (rankNum: number, pathStr: string) => {
    const pathParts = pathStr
      .split('>')
      .map(p => p.trim())
      .filter(Boolean)
    if (pathParts.length === 0 || rankNum <= 0) return
    if (categories.find(c => c.rank === rankNum && c.rawPath === pathStr))
      return
    let rankStrength: 'top100' | 'strong' | 'competitive' | 'low' = 'low'
    if (rankNum <= 100) rankStrength = 'top100'
    else if (rankNum <= 1000) rankStrength = 'strong'
    else if (rankNum <= 5000) rankStrength = 'competitive'
    categories.push({
      rank: rankNum,
      path: pathParts,
      rawPath: pathStr,
      bestSellersUrl: 'https://www.amazon.com/Best-Sellers/zgbs/',
      newReleasesUrl: 'https://www.amazon.com/gp/new-releases/',
      rankStrength,
    })
  }

  // Pattern 1: table row
  $('tr').each((_, row) => {
    const label = $(row).find('th, .a-color-secondary').text()
    if (label.includes('Best Sellers Rank')) {
      const text = $(row).find('td').text()
      for (const m of Array.from(text.matchAll(/#([\d,]+)\s+in\s+([^(#\n]+)/g))) {
        addCategory(parseInt(m[1].replace(/,/g, '')), m[2].trim())
      }
    }
  })

  // Pattern 2: detail bullets span
  $('#detailBulletsWrapper_feature_div span.a-list-item').each((_, el) => {
    const text = $(el).text()
    if (text.includes('Best Sellers Rank')) {
      for (const m of Array.from(text.matchAll(/#([\d,]+)\s+in\s+([^#\n(]+)/g))) {
        addCategory(
          parseInt(m[1].replace(/,/g, '')),
          m[2].trim().replace(/\s+/g, ' ')
        )
      }
    }
  })

  categories.sort((a, b) => a.rank - b.rank)

  const result = {
    categories,
    bestRank: categories[0]?.rank ?? null,
    bestCategory: categories[0]?.rawPath ?? null,
    asin,
    fetchedAt: new Date().toISOString(),
  }

  await db.categoryCache.upsert({
    where: { userId_asin: { userId: session.user.id, asin } },
    create: {
      userId: session.user.id,
      asin,
      data: JSON.stringify(result),
    },
    update: { data: JSON.stringify(result), fetchedAt: new Date() },
  })

  return Response.json({ success: true, data: result, cached: false })
}
