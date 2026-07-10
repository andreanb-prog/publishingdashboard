// lib/market-pulse.ts
// Category Intelligence v2 — Market Pulse pipeline.
//
// Design logic (see roadmap spec "Category Intelligence v2: Market Pulse"):
// - Browserbase Fetch API (same lightweight pattern as bsr-fetch.ts): best-seller
//   pages are public, no browser session or LLM extraction needed.
// - Deterministic cheerio parse of the top-100 grid (2 pages of 50).
// - Threshold math: the list doesn't expose overall BSR, so we fetch the product
//   pages of ranks #1 / #10 / #50 only (3 extra fetches per genre) and convert
//   their Kindle Store BSR to est. sales/day via the editable curve in config.
// - Trope pulse: ONE Claude call per genre tags all titles against the shared
//   taxonomy (same vocabulary as the Ad Naming System — that's the moat).
// - Market-level data, stored once per genre per day, shared across all users.

import Browserbase from '@browserbasehq/sdk'
import * as cheerio from 'cheerio'
import { db } from '@/lib/db'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { PULSE_GENRES, PULSE_TROPES, bsrToSalesPerDay, type PulseGenre } from '@/config/market-pulse'

export type PulseRow = {
  rank: number
  asin: string | null
  title: string
  author: string | null
  price: number | null
  reviews: number | null
  ku: boolean
}

export type PulseStats = {
  thresholds: {
    rank1: { bsr: number | null; salesPerDay: number | null }
    rank10: { bsr: number | null; salesPerDay: number | null }
    rank50: { bsr: number | null; salesPerDay: number | null }
  }
  modalPrice: number | null
  kuShare: number | null       // 0..1 of rows with a detectable KU badge, null if none detectable
  tropeCounts: Record<string, number>
  rowCount: number
}

function bb(): Browserbase | null {
  const apiKey = process.env.BROWSERBASE_API_KEY
  if (!apiKey) return null
  return new Browserbase({ apiKey })
}

function isBlocked(html: string): boolean {
  return html.includes('Robot Check')
    || html.includes('api-services-support')
    || html.includes('Type the characters you see')
    || html.includes('Enter the characters you see')
}

// ── Best-seller page parse ────────────────────────────────────────────────────
// Amazon has shipped several zgbs layouts; try the modern faceout first, then
// the legacy grid. Title falls back to the cover image's alt text, which has
// survived every layout change so far.
export function parseBestsellerPage(html: string): PulseRow[] {
  if (isBlocked(html)) return []
  const $ = cheerio.load(html)
  const rows: PulseRow[] = []

  const items = $('.zg-grid-general-faceout').length
    ? $('.zg-grid-general-faceout')
    : $('#gridItemRoot')

  items.each((_, el) => {
    const $el = $(el)
    const rankText = $el.find('.zg-bdg-text').first().text().trim()
      || $el.closest('[id^="p13n-asin-index-"]').find('.zg-bdg-text').first().text().trim()
    const rank = parseInt(rankText.replace(/[^\d]/g, ''), 10)
    if (!rank) return

    const link = $el.find('a.a-link-normal[href*="/dp/"]').first().attr('href') ?? ''
    const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})/)
    const asin = asinMatch ? asinMatch[1] : null

    const title = $el.find('div[class*="line-clamp"]').first().text().trim()
      || $el.find('img').first().attr('alt')?.trim()
      || ''
    if (!title) return

    const author = $el.find('div.a-row a.a-size-small, div.a-row span.a-size-small')
      .first().text().trim() || null

    const priceText = $el.find('span[class*="price"] span, span[class*="p13n-sc-price"]')
      .first().text().trim()
      || $el.find('span[class*="price"]').first().text().trim()
    const priceMatch = priceText.match(/\$([\d.,]+)/)
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null

    const reviewsText = $el.find('a[href*="customerReviews"] span, .a-icon-row span.a-size-small')
      .first().text().trim()
    const reviews = reviewsText ? parseInt(reviewsText.replace(/[^\d]/g, ''), 10) || null : null

    const ku = /kindle unlimited/i.test($el.text())

    rows.push({ rank, asin, title, author, price, reviews, ku })
  })

  return rows.sort((a, b) => a.rank - b.rank)
}

// Overall Kindle Store BSR from a product page (reuses bsr-fetch's selector set).
function parseOverallBsr(html: string): number | null {
  if (isBlocked(html)) return null
  const $ = cheerio.load(html)
  let bsrText = ''
  for (const sel of [
    '#detailBullets_feature_div li',
    '#productDetails_detailBullets_sections1 tr',
    '#detailBulletsWrapper_feature_div li',
    '.pdTab li',
  ]) {
    $(sel).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim()
      if (text.includes('Best Sellers Rank') || text.includes('Best Seller Rank')) bsrText = text
    })
    if (bsrText) break
  }
  // First "#N in Kindle Store" (or first rank at all as fallback)
  const kindle = bsrText.match(/#([\d,]+)\s+in\s+Kindle Store/i)
  const any = bsrText.match(/#([\d,]+)\s+in\s+/)
  const m = kindle ?? any
  if (!m) return null
  const rank = parseInt(m[1].replace(/,/g, ''), 10)
  return Number.isFinite(rank) ? rank : null
}

// ── Trope tagging (one Claude call per genre) ────────────────────────────────
async function tagTropes(rows: PulseRow[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  if (!process.env.ANTHROPIC_API_KEY || rows.length === 0) return counts

  const list = rows.slice(0, 100)
    .map(r => `${r.rank}. ${r.title}${r.author ? ` — ${r.author}` : ''}`)
    .join('\n')

  try {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content:
`These are current Amazon best-selling book titles in one genre. Tag each with 0-3 tropes from this fixed taxonomy (exact strings only):
${PULSE_TROPES.join(', ')}

Titles:
${list}

Reply with ONLY a JSON object mapping rank number to an array of tropes, e.g. {"1":["small town","second chance"],"2":[]}. No other text.`,
      }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return counts
    const tagged = JSON.parse(jsonMatch[0]) as Record<string, string[]>
    const valid = new Set<string>(PULSE_TROPES)
    for (const tropes of Object.values(tagged)) {
      if (!Array.isArray(tropes)) continue
      for (const t of tropes) {
        if (valid.has(t)) counts[t] = (counts[t] ?? 0) + 1
      }
    }
  } catch (err) {
    console.warn('[market-pulse] trope tagging failed:', err instanceof Error ? err.message : err)
  }
  return counts
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function modalPrice(rows: PulseRow[]): number | null {
  const prices = rows.map(r => r.price).filter((p): p is number => p != null)
  if (!prices.length) return null
  const buckets = new Map<number, number>()
  for (const p of prices) {
    const b = Math.round(p * 100) / 100
    buckets.set(b, (buckets.get(b) ?? 0) + 1)
  }
  return Array.from(buckets.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
export async function runPulseForGenre(genre: PulseGenre): Promise<{ ok: boolean; rows: number; error?: string }> {
  const client = bb()
  if (!client) return { ok: false, rows: 0, error: 'browserbase_not_configured' }

  try {
    // 1. Top 100 = pages 1 + 2 of the best-seller list.
    const urls = [genre.bestsellerUrl, `${genre.bestsellerUrl}?pg=2`]
    let rows: PulseRow[] = []
    for (const url of urls) {
      const result = await client.fetchAPI.create({ url, format: 'raw' })
      const html = typeof result.content === 'string' ? result.content : ''
      rows = rows.concat(parseBestsellerPage(html))
    }
    // Dedupe by rank (page 2 sometimes repeats page 1 when the node is small)
    const byRank = new Map<number, PulseRow>()
    for (const r of rows) if (!byRank.has(r.rank)) byRank.set(r.rank, r)
    rows = Array.from(byRank.values()).sort((a, b) => a.rank - b.rank)

    if (rows.length === 0) {
      return { ok: false, rows: 0, error: 'parse_empty_or_blocked' }
    }

    // 2. Threshold anchors: overall BSR of ranks #1 / #10 / #50.
    const anchorRanks = [1, 10, 50] as const
    const anchors: Record<number, number | null> = {}
    for (const rk of anchorRanks) {
      const row = rows.find(r => r.rank === rk)
      anchors[rk] = null
      if (row?.asin) {
        try {
          const res = await client.fetchAPI.create({
            url: `https://www.amazon.com/dp/${row.asin}`, format: 'raw',
          })
          anchors[rk] = parseOverallBsr(typeof res.content === 'string' ? res.content : '')
        } catch { /* threshold stays null — card degrades gracefully */ }
      }
    }

    // 3. Trope pulse.
    const tropeCounts = await tagTropes(rows)

    // 4. Assemble + store.
    const kuKnown = rows.filter(r => r.ku).length
    const stats: PulseStats = {
      thresholds: {
        rank1:  { bsr: anchors[1],  salesPerDay: anchors[1]  ? bsrToSalesPerDay(anchors[1])  : null },
        rank10: { bsr: anchors[10], salesPerDay: anchors[10] ? bsrToSalesPerDay(anchors[10]) : null },
        rank50: { bsr: anchors[50], salesPerDay: anchors[50] ? bsrToSalesPerDay(anchors[50]) : null },
      },
      modalPrice: modalPrice(rows),
      kuShare: rows.length ? kuKnown / rows.length : null,
      tropeCounts,
      rowCount: rows.length,
    }

    await db.marketPulseSnapshot.create({
      data: { genreSlug: genre.slug, rows: rows as object[], stats: stats as object },
    })

    return { ok: true, rows: rows.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, rows: 0, error: msg.slice(0, 300) }
  }
}

export async function runPulseAll(): Promise<Record<string, { ok: boolean; rows: number; error?: string }>> {
  const out: Record<string, { ok: boolean; rows: number; error?: string }> = {}
  // Sequential on purpose: keeps Browserbase + Amazon request rates polite.
  for (const genre of PULSE_GENRES) {
    out[genre.slug] = await runPulseForGenre(genre)
  }
  return out
}

// Latest snapshot per genre, plus the previous one for trend deltas.
export async function getLatestPulse() {
  const results = await Promise.all(PULSE_GENRES.map(async genre => {
    const [latest, prev] = await db.marketPulseSnapshot.findMany({
      where: { genreSlug: genre.slug },
      orderBy: { capturedAt: 'desc' },
      take: 2,
    })
    return {
      genre: { slug: genre.slug, label: genre.label, group: genre.group, focusTropes: genre.focusTropes ?? [] },
      latest: latest ? {
        capturedAt: latest.capturedAt.toISOString(),
        rows: latest.rows as unknown as PulseRow[],
        stats: latest.stats as unknown as PulseStats | null,
      } : null,
      prevStats: prev ? (prev.stats as unknown as PulseStats | null) : null,
    }
  }))
  return results
}
