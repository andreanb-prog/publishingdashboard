// app/api/books/lookup/route.ts
// Scrapes an Amazon product page by ASIN and returns title, publication date, and series name.
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const asin = req.nextUrl.searchParams.get('asin')?.toUpperCase()
  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.json({ error: 'Invalid ASIN' }, { status: 400 })
  }

  const url = `https://www.amazon.com/dp/${asin}`
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Amazon returned ${res.status}` }, { status: 502 })
    }
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 502 },
    )
  }

  // ── Parse JSON-LD blocks once ────────────────────────────────────────────────
  interface JsonLd {
    datePublished?: string
    isPartOf?: { name?: string } | Array<{ name?: string }>
    [key: string]: unknown
  }
  const jsonLdBlocks: JsonLd[] = []
  const ldRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let ldMatch: RegExpExecArray | null
  while ((ldMatch = ldRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(ldMatch[1])
      if (Array.isArray(parsed)) jsonLdBlocks.push(...parsed)
      else jsonLdBlocks.push(parsed)
    } catch { /* ignore malformed JSON-LD */ }
  }

  // ── Extract title ────────────────────────────────────────────────────────────
  let title: string | null = null
  const titleMatch = html.match(/<span[^>]+id="productTitle"[^>]*>([\s\S]*?)<\/span>/)
  if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, '').trim()

  // ── Extract publication date ─────────────────────────────────────────────────
  let pubDate: string | null = null

  // 1. JSON-LD datePublished (most reliable when present)
  if (!pubDate) {
    for (const block of jsonLdBlocks) {
      if (block.datePublished) {
        pubDate = parsePubDate(String(block.datePublished))
        if (pubDate) break
      }
    }
  }

  // 2. Product details table: <th>Publication date</th> … <td>…</td>
  if (!pubDate) {
    const tableMatch = html.match(
      /Publication date[^<]*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i,
    )
    if (tableMatch) pubDate = parsePubDate(tableMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  // 3. Detail bullets: "Publication date :</span> <span>…</span>"
  if (!pubDate) {
    const bulletMatch = html.match(
      /Publication date[^<]*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i,
    )
    if (bulletMatch) pubDate = parsePubDate(bulletMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  // 4. #rpi-attribute-book_details-publication_date value span
  if (!pubDate) {
    const rpiBlock = html.match(
      /id="rpi-attribute-book_details-publication_date"[\s\S]{0,500}?<span[^>]*>([\s\S]*?)<\/span>/i,
    )
    if (rpiBlock) pubDate = parsePubDate(rpiBlock[1].replace(/<[^>]+>/g, '').trim())
  }

  // 5. Plain-text fallback: "Publication date : March 15, 2025"
  if (!pubDate) {
    const textMatch = html.match(
      /Publication date\s*:?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
    )
    if (textMatch) pubDate = parsePubDate(textMatch[1].trim())
  }

  // ── Extract series name ──────────────────────────────────────────────────────
  let seriesName: string | null = null

  // 1. JSON-LD isPartOf.name
  if (!seriesName) {
    for (const block of jsonLdBlocks) {
      const isPartOf = block.isPartOf
      if (isPartOf) {
        const candidates = Array.isArray(isPartOf) ? isPartOf : [isPartOf]
        for (const c of candidates) {
          if (c.name) { seriesName = cleanSeriesName(c.name); break }
        }
      }
      if (seriesName) break
    }
  }

  // 2. #seriesAsinList anchor text
  if (!seriesName) {
    const seriesListMatch = html.match(
      /id="seriesAsinList"[\s\S]{0,800}?href="[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    )
    if (seriesListMatch) seriesName = cleanSeriesName(seriesListMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  // 3. .series-childAsin-item anchor
  if (!seriesName) {
    const seriesItemMatch = html.match(
      /class="[^"]*series-childAsin-item[^"]*"[\s\S]{0,400}?href="[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    )
    if (seriesItemMatch) seriesName = cleanSeriesName(seriesItemMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  // 4. Any /gp/series/ link anchor text
  if (!seriesName) {
    const gpMatch = html.match(/href="[^"]*\/gp\/series\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    if (gpMatch) seriesName = cleanSeriesName(gpMatch[1].replace(/<[^>]+>/g, '').trim())
  }

  return NextResponse.json({ asin, title, pubDate, seriesName })
}

// Converts Amazon date strings → "YYYY-MM-DD"
function parsePubDate(raw: string): string | null {
  const cleaned = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  // "15 March 2025" → rearrange for Date constructor
  const ddMmmYyyy = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (ddMmmYyyy) {
    const d = new Date(`${ddMmmYyyy[2]} ${ddMmmYyyy[1]}, ${ddMmmYyyy[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

// Strips " (Book N of M)" / " (Book N)" / " Book N" suffixes from series names
function cleanSeriesName(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/\s*\(Book\s+[\d.]+\s+of\s+\d+\)/i, '')
    .replace(/\s*\(Book\s+[\d.]+\)/i, '')
    .replace(/\s+Book\s+[\d.]+$/i, '')
    .trim()
  return cleaned || null
}
