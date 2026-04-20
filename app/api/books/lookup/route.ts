// app/api/books/lookup/route.ts
// Scrapes an Amazon product page by ASIN and returns title + publication date.
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
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Amazon returned ${res.status}` }, { status: 502 })
    }
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 502 },
    )
  }

  // ── Extract title ────────────────────────────────────────────────────────────
  let title: string | null = null
  const titleMatch = html.match(/<span[^>]+id="productTitle"[^>]*>([\s\S]*?)<\/span>/)
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // ── Extract publication date ──────────────────────────────────────────────────
  // Appears in the product details table as a row labeled "Publication date"
  let pubDate: string | null = null

  // Pattern 1: detail bullet list  "Publication date : January 1, 2024"
  const bulletMatch = html.match(
    /Publication date[^:]*:?\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/i,
  )
  if (bulletMatch) {
    pubDate = parsePubDate(bulletMatch[1].trim())
  }

  // Pattern 2: detail table row  <td>January 1, 2024</td>
  if (!pubDate) {
    const tableMatch = html.match(
      /Publication date[\s\S]{0,200}?<td[^>]*>([\s\S]*?)<\/td>/i,
    )
    if (tableMatch) {
      pubDate = parsePubDate(tableMatch[1].replace(/<[^>]+>/g, '').trim())
    }
  }

  // Pattern 3: "datePublished" JSON-LD schema
  if (!pubDate) {
    const schemaMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/)
    if (schemaMatch) {
      pubDate = parsePubDate(schemaMatch[1])
    }
  }

  return NextResponse.json({ asin, title, pubDate })
}

// Converts Amazon date strings like "January 1, 2024" or "2024-01-01" → "YYYY-MM-DD"
function parsePubDate(raw: string): string | null {
  const cleaned = raw.replace(/<[^>]+>/g, '').trim()
  if (!cleaned) return null

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return null
}
