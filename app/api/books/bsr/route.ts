// app/api/books/bsr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import * as cheerio from 'cheerio'

// In-memory rate limit: one fetch per book per hour
const fetchCache = new Map<string, number>()
const RATE_LIMIT_MS = 60 * 60 * 1000

function parseBsr(html: string): {
  rank: number
  subcategories: { rank: number; category: string }[]
} | 'blocked' | null {
  if (
    html.includes('Robot Check') ||
    html.includes('api-services-support') ||
    html.includes('Type the characters you see') ||
    html.includes('Enter the characters you see')
  ) {
    return 'blocked'
  }

  const $ = cheerio.load(html)
  let bsrText = ''

  // Try all known BSR container selectors
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

  // Extract all #number in Category patterns
  const matches = Array.from(bsrText.matchAll(/#([\d,]+)\s+in\s+([^\n#(]+)/g))
  if (!matches.length) return null

  const rank = parseInt(matches[0][1].replace(/,/g, ''))
  if (isNaN(rank)) return null

  // Subcategories: skip the first (overall) match
  const subcategories = matches.slice(1, 3).map(m => ({
    rank: parseInt(m[1].replace(/,/g, '')),
    category: m[2].trim().replace(/\s+/g, ' ').replace(/[()]/g, '').trim(),
  }))

  return { rank, subcategories }
}

// GET /api/books/bsr?asin=XXXXXXXX          → fetch BSR from Amazon
// GET /api/books/bsr?asin=XXXXXXXX&history=true → fetch logged history
export async function GET(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const asin = searchParams.get('asin')?.trim()

  if (!asin) {
    return NextResponse.json({ error: 'no_asin' }, { status: 400 })
  }

  // History mode
  if (searchParams.get('history') === 'true') {
    const logs = await db.bsrLog.findMany({
      where: { userId: session.user.id, asin },
      orderBy: { fetchedAt: 'desc' },
      take: 10,
    })
    return NextResponse.json({ logs })
  }

  // Rate limit check
  const cacheKey = `${session.user.id}:${asin}`
  const lastFetch = fetchCache.get(cacheKey)
  if (lastFetch && Date.now() - lastFetch < RATE_LIMIT_MS) {
    const nextAllowed = new Date(lastFetch + RATE_LIMIT_MS).toISOString()
    return NextResponse.json(
      { error: 'rate_limited', nextAllowed },
      { status: 429 }
    )
  }

  // Fetch from Amazon
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    let response: Response
    try {
      response = await fetch(`https://www.amazon.com/dp/${encodeURIComponent(asin)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      })
    } finally {
      clearTimeout(timeout)
    }

    const html = await response.text()
    const result = parseBsr(html)

    if (result === 'blocked') {
      return NextResponse.json({ error: 'blocked' }, { status: 200 })
    }

    if (!result) {
      return NextResponse.json({ error: 'parse_fail' }, { status: 200 })
    }

    // Update rate limit cache on success
    fetchCache.set(cacheKey, Date.now())

    return NextResponse.json({
      rank: result.rank,
      subcategories: result.subcategories,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'timeout' }, { status: 200 })
    }
    return NextResponse.json({ error: 'parse_fail' }, { status: 200 })
  }
}

// POST /api/books/bsr — log a rank entry
export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { asin, bookTitle, rank } = await req.json()
  if (!asin || !rank) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const rankNum = parseInt(rank)
  if (isNaN(rankNum) || rankNum < 1) {
    return NextResponse.json({ error: 'Invalid rank' }, { status: 400 })
  }

  const log = await db.bsrLog.create({
    data: {
      userId: session.user.id,
      asin,
      bookTitle: bookTitle ?? null,
      rank: rankNum,
    },
  })

  return NextResponse.json({ success: true, log })
}
