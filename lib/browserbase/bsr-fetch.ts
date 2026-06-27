// lib/browserbase/bsr-fetch.ts
// Fetches Amazon BSR for all books belonging to a user via the Browserbase
// Fetch API (lightweight, no browser session needed — product pages are public).
import Browserbase from '@browserbasehq/sdk'
import * as cheerio from 'cheerio'
import { db } from '@/lib/db'

function getBbClient(): Browserbase | null {
  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) return null
  return new Browserbase({ apiKey })
}

function parseBsr(html: string): {
  rank: number
  category: string
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

  const category = matches[0][2].trim().replace(/\s+/g, ' ').replace(/[()]/g, '').trim()

  const subcategories = matches.slice(1, 3).map(m => ({
    rank: parseInt(m[1].replace(/,/g, '')),
    category: m[2].trim().replace(/\s+/g, ' ').replace(/[()]/g, '').trim(),
  }))

  return { rank, category, subcategories }
}

function todayDateString(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function fetchBsrForUser(userId: string): Promise<void> {
  const bb = getBbClient()
  if (!bb) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'bsr',
        status: 'failed',
        errorType: 'no_api_key',
        errorDetail: 'BROWSERBASE_API_KEY not set.',
      },
    })
    return
  }

  // 1. Look up all books for this user that have an asin
  const books = await db.book.findMany({
    where: { userId, asin: { not: null } },
    select: { asin: true, title: true },
  })

  if (!books.length) {
    await db.syncLog.create({
      data: {
        userId,
        source: 'bsr',
        status: 'success',
        rowsFetched: 0,
        completedAt: new Date(),
      },
    })
    return
  }

  const todayStr = todayDateString()
  const todayUtc = new Date(`${todayStr}T00:00:00.000Z`)

  let rowsSaved = 0
  let anyFailed = false

  for (const book of books) {
    const asin = book.asin!
    const url = `https://www.amazon.com/dp/${encodeURIComponent(asin)}`

    try {
      const result = await bb.fetchAPI.create({ url, format: 'raw' })
      const html = typeof result.content === 'string' ? result.content : ''

      const parsed = parseBsr(html)

      if (!parsed || parsed === 'blocked') {
        anyFailed = true
        continue
      }

      // Upsert: update today's row if it exists, otherwise create
      const existing = await db.bsrLog.findFirst({
        where: { userId, asin, date: todayUtc },
        select: { id: true },
      })

      const data = {
        rank: parsed.rank,
        categoryRanks: [
          { rank: parsed.rank, category: parsed.category },
          ...parsed.subcategories,
        ],
        source: 'fetch',
        fetchedAt: new Date(),
      }

      if (existing) {
        await db.bsrLog.update({ where: { id: existing.id }, data })
      } else {
        await db.bsrLog.create({
          data: {
            userId,
            asin,
            bookTitle: book.title,
            date: todayUtc,
            ...data,
          },
        })
      }

      rowsSaved++
    } catch {
      anyFailed = true
    }
  }

  await db.syncLog.create({
    data: {
      userId,
      source: 'bsr',
      status: anyFailed && rowsSaved === 0 ? 'failed' : 'success',
      rowsFetched: rowsSaved,
      completedAt: new Date(),
    },
  })
}
