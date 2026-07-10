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

// ── Product-page metadata (KU status, blurb, categories, BSR) ────────────────
// One fetch per ASIN, cached in AsinMeta. KU status does NOT appear on the
// best-seller list faceouts — this page is the only reliable source.
export function parseProductPage(html: string): {
  isKu: boolean
  blurb: string | null
  author: string | null
  price: number | null
  reviews: number | null
  overallBsr: number | null
  categories: { rank: number; name: string }[]
} | null {
  if (isBlocked(html)) return null
  const $ = cheerio.load(html)

  // KU: the "Read for Free" / Kindle Unlimited block or the KU logo image.
  const kuText = $('#tmm-grid-swatch-KINDLE, #kindle-price-block, .a-icon-kindle-unlimited').length > 0
    || /kindle\s*unlimited/i.test($('#rightCol, #buybox, #tmmSwatches').text())
    || $('img[src*="kindle-unlimited"], i.a-icon-kindle-unlimited').length > 0
  const readForFree = /read for free|\$0\.00.*kindle unlimited/i.test($('#rightCol, #buybox').text())
  const isKu = kuText && (readForFree || /kindle\s*unlimited/i.test($('body').text().slice(0, 60000)))

  const blurb = $('#bookDescription_feature_div').text().replace(/\s+/g, ' ').trim().slice(0, 1200) || null
  const author = $('#bylineInfo .author a, #bylineInfo a.contributorNameID').first().text().trim() || null

  const priceText = $('#kindle-price, .kindle-price, #price').first().text().trim()
    || $('span:contains("Kindle Price")').parent().text()
  const priceMatch = priceText.match(/\$([\d.,]+)/)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null

  const reviewsText = $('#acrCustomerReviewText').first().text()
  const reviews = reviewsText ? parseInt(reviewsText.replace(/[^\d]/g, ''), 10) || null : null

  // BSR + category ladder from the detail bullets.
  let bsrText = ''
  for (const sel of [
    '#detailBullets_feature_div li',
    '#productDetails_detailBullets_sections1 tr',
    '#detailBulletsWrapper_feature_div li',
  ]) {
    $(sel).each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (t.includes('Best Sellers Rank')) bsrText = t
    })
    if (bsrText) break
  }
  const catMatches = Array.from(bsrText.matchAll(/#([\d,]+)\s+in\s+([^#(]+?)(?:\s*\(|\s*#|$)/g))
  const categories = catMatches.map(m => ({
    rank: parseInt(m[1].replace(/,/g, ''), 10),
    name: m[2].trim(),
  })).filter(c => Number.isFinite(c.rank) && c.name)
  const kindleStore = categories.find(c => /kindle store/i.test(c.name))
  const overallBsr = kindleStore?.rank ?? categories[0]?.rank ?? null

  return { isKu, blurb, author, price, reviews, overallBsr, categories }
}

// Tag tropes from title + blurb (much more accurate than title-only).
async function tagTropesFromMeta(
  items: { asin: string; title: string; blurb: string | null }[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return out
  const list = items.map((it, i) =>
    `${i + 1}. [${it.asin}] ${it.title}${it.blurb ? ` — ${it.blurb.slice(0, 350)}` : ''}`
  ).join('\n')
  try {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content:
`Tag each book with 0-4 tropes from this fixed taxonomy (exact strings only):
${PULSE_TROPES.join(', ')}

Books (ASIN in brackets, then title — blurb):
${list}

Reply with ONLY a JSON object mapping ASIN to an array of tropes, e.g. {"B0ABC12345":["small town","second chance"]}. No other text.`,
      }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return out
    const tagged = JSON.parse(m[0]) as Record<string, string[]>
    const valid = new Set<string>(PULSE_TROPES)
    for (const [asin, tropes] of Object.entries(tagged)) {
      if (Array.isArray(tropes)) out.set(asin, tropes.filter(t => valid.has(t)))
    }
  } catch (err) {
    console.warn('[market-pulse] blurb trope tagging failed:', err instanceof Error ? err.message : err)
  }
  return out
}

// Enrich up to `cap` ASINs from a scraped list that are missing or stale
// (>14 days) in AsinMeta. First full coverage converges over a few nightly
// runs; steady state is a handful of new ASINs per genre per day.
const META_STALE_DAYS = 14
export async function enrichAsins(
  client: Browserbase,
  rows: PulseRow[],
  cap = 40,
): Promise<number> {
  const asins = rows.map(r => r.asin).filter((a): a is string => !!a)
  if (asins.length === 0) return 0
  const existing = await db.asinMeta.findMany({
    where: { asin: { in: asins } },
    select: { asin: true, fetchedAt: true },
  })
  const fresh = new Set(
    existing
      .filter(e => Date.now() - e.fetchedAt.getTime() < META_STALE_DAYS * 24 * 3600 * 1000)
      .map(e => e.asin),
  )
  const todo = asins.filter(a => !fresh.has(a)).slice(0, cap)
  if (todo.length === 0) return 0

  const fetched: { asin: string; title: string; blurb: string | null; meta: NonNullable<ReturnType<typeof parseProductPage>> }[] = []
  for (const asin of todo) {
    try {
      const res = await client.fetchAPI.create({ url: `https://www.amazon.com/dp/${asin}`, format: 'raw' })
      const meta = parseProductPage(typeof res.content === 'string' ? res.content : '')
      if (!meta) continue
      const row = rows.find(r => r.asin === asin)
      fetched.push({ asin, title: row?.title ?? '', blurb: meta.blurb, meta })
    } catch { /* skip — retried next run */ }
  }

  const tropesByAsin = await tagTropesFromMeta(fetched.map(f => ({ asin: f.asin, title: f.title, blurb: f.blurb })))

  for (const f of fetched) {
    await db.asinMeta.upsert({
      where: { asin: f.asin },
      update: {
        title: f.title || undefined,
        author: f.meta.author,
        blurb: f.meta.blurb,
        isKu: f.meta.isKu,
        price: f.meta.price,
        reviews: f.meta.reviews,
        overallBsr: f.meta.overallBsr,
        categories: f.meta.categories as object[],
        tropes: (tropesByAsin.get(f.asin) ?? []) as string[],
        fetchedAt: new Date(),
      },
      create: {
        asin: f.asin,
        title: f.title || f.asin,
        author: f.meta.author,
        blurb: f.meta.blurb,
        isKu: f.meta.isKu,
        price: f.meta.price,
        reviews: f.meta.reviews,
        overallBsr: f.meta.overallBsr,
        categories: f.meta.categories as object[],
        tropes: (tropesByAsin.get(f.asin) ?? []) as string[],
      },
    }).catch(() => undefined)
  }
  return fetched.length
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
export async function runPulseForGenre(
  genre: PulseGenre,
  deadline?: number, // ms epoch — skip enrichment when close, so ALL genres get their list scan
): Promise<{ ok: boolean; rows: number; error?: string }> {
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

    // 5. Enrich new/stale ASINs with product-page metadata (KU status, blurb
    //    tropes, real BSR). Capped per run — full coverage converges over a few
    //    nightly crons. Non-fatal.
    try {
      // With 14 genres, full 40-ASIN enrichment per genre would blow the 300s
      // function budget and kill later genres' scans. List scans come first;
      // enrichment gets whatever time remains (min 45s needed to bother) and a
      // smaller per-genre cap. Coverage converges across nightly runs.
      const msLeft = deadline ? deadline - Date.now() : Infinity
      const cap = msLeft < 45_000 ? 0 : Math.min(15, Math.floor(msLeft / 3_000))
      const enriched = cap > 0 ? await enrichAsins(client, rows, cap) : 0
      if (enriched) console.log(`[market-pulse] ${genre.slug}: enriched ${enriched} ASINs`)
    } catch (err) {
      console.warn(`[market-pulse] ${genre.slug}: enrichment failed (non-fatal):`,
        err instanceof Error ? err.message : String(err))
    }

    return { ok: true, rows: rows.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, rows: 0, error: msg.slice(0, 300) }
  }
}

export async function runPulseAll(): Promise<Record<string, { ok: boolean; rows: number; error?: string }>> {
  const out: Record<string, { ok: boolean; rows: number; error?: string }> = {}
  // Sequential on purpose: keeps Browserbase + Amazon request rates polite.
  // Global deadline keeps the whole run inside the 300s function budget —
  // list scans are guaranteed for every genre; enrichment uses the slack.
  const deadline = Date.now() + 240_000
  for (const genre of PULSE_GENRES) {
    out[genre.slug] = await runPulseForGenre(genre, deadline)
  }
  return out
}

// A list row joined with its cached product-page metadata.
export type EnrichedRow = PulseRow & {
  meta: null | {
    author: string | null
    isKu: boolean
    price: number | null
    reviews: number | null
    overallBsr: number | null
    estSalesPerDay: number | null
    tropes: string[]
  }
}

// Latest snapshot per genre, plus the previous one for trend deltas, with rows
// joined against the AsinMeta cache (KU status, blurb tropes, real BSR).
export async function getLatestPulse() {
  const results = await Promise.all(PULSE_GENRES.map(async genre => {
    const [latest, prev] = await db.marketPulseSnapshot.findMany({
      where: { genreSlug: genre.slug },
      orderBy: { capturedAt: 'desc' },
      take: 2,
    })

    let enrichedRows: EnrichedRow[] = []
    let kuTropeCounts: Record<string, number> = {}
    let kuCount = 0
    let metaCoverage = 0
    if (latest) {
      const rows = latest.rows as unknown as PulseRow[]
      const asins = rows.map(r => r.asin).filter((a): a is string => !!a)
      const metas = asins.length
        ? await db.asinMeta.findMany({ where: { asin: { in: asins } } }).catch(() => [])
        : []
      const byAsin = new Map(metas.map(m => [m.asin, m]))
      enrichedRows = rows.map(r => {
        const m = r.asin ? byAsin.get(r.asin) : undefined
        return {
          ...r,
          meta: m ? {
            author: m.author,
            isKu: m.isKu,
            price: m.price,
            reviews: m.reviews,
            overallBsr: m.overallBsr,
            estSalesPerDay: m.overallBsr ? bsrToSalesPerDay(m.overallBsr) : null,
            tropes: Array.isArray(m.tropes) ? (m.tropes as string[]) : [],
          } : null,
        }
      })
      metaCoverage = enrichedRows.filter(r => r.meta).length
      const kuRows = enrichedRows.filter(r => r.meta?.isKu)
      kuCount = kuRows.length
      for (const r of kuRows) {
        for (const t of r.meta!.tropes) kuTropeCounts[t] = (kuTropeCounts[t] ?? 0) + 1
      }
    }

    return {
      genre: { slug: genre.slug, label: genre.label, group: genre.group, focusTropes: genre.focusTropes ?? [] },
      latest: latest ? {
        capturedAt: latest.capturedAt.toISOString(),
        rows: enrichedRows,
        stats: latest.stats as unknown as PulseStats | null,
        kuTropeCounts,
        kuCount,
        metaCoverage,
      } : null,
      prevStats: prev ? (prev.stats as unknown as PulseStats | null) : null,
    }
  }))
  return results
}
