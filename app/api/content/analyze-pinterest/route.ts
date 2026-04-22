export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import * as cheerio from 'cheerio'

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let boardText = `Pinterest board URL: ${url}\n`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const html = await res.text()
      const $ = cheerio.load(html)

      const title = $('title').text().trim()
      const metaDesc = $('meta[name="description"]').attr('content') ?? ''
      const ogDesc = $('meta[property="og:description"]').attr('content') ?? ''
      const ogTitle = $('meta[property="og:title"]').attr('content') ?? ''

      // Extract any JSON-LD or initial state data
      const jsonBlocks: string[] = []
      $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text) jsonBlocks.push(text.slice(0, 800))
      })

      // Extract pin descriptions / alt texts
      const pinTexts: string[] = []
      $('[data-test-id="pin-description"], .pinDescription, [aria-label]').each((_, el) => {
        const t = $(el).text().trim() || $(el).attr('aria-label') || ''
        if (t && t.length > 5) pinTexts.push(t)
      })
      $('img[alt]').each((_, el) => {
        const alt = $(el).attr('alt') ?? ''
        if (alt.length > 5) pinTexts.push(alt)
      })

      boardText += `Page title: ${title}\n`
      boardText += `Meta description: ${metaDesc || ogDesc}\n`
      boardText += `OG title: ${ogTitle}\n`
      if (pinTexts.length > 0) {
        boardText += `Pin descriptions/alt text:\n${pinTexts.slice(0, 40).join('\n')}\n`
      }
      if (jsonBlocks.length > 0) {
        boardText += `Structured data:\n${jsonBlocks.join('\n').slice(0, 1500)}\n`
      }
    }
  } catch {
    // Scraping failed — proceed with URL only; Claude will infer from URL context
  }

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `You are a visual creative director specializing in romance fiction author branding. Analyze the Pinterest board data and extract a precise visual brief for generating warm, romantic social media imagery.

CRITICAL CONSTRAINTS — regardless of what the board data shows, the output must be appropriate for romance fiction marketing:
- lightQuality must describe WARM light (golden hour, soft morning, dappled sunlight). If board data is thin, default to "warm golden hour backlight, soft natural light"
- colorPalette must be warm tones (ambers, creams, terracotta, sage, honey). Never cold or desaturated.
- mood must be romantic and hopeful, never dark or melancholic
- midjourneyStyleString must always end with: --ar 4:5 --style raw --v 6

If the board data is thin or unavailable, use romance fiction visual defaults rather than guessing from limited data.

Return JSON with these exact fields:
- lightQuality: string (e.g. "warm golden hour backlight, soft natural light filtering through")
- colorPalette: string (e.g. "amber, cream, dusty sage, terracotta, honey tones")
- setting: string (e.g. "California wine country, vineyard rows, rustic outdoor spaces")
- mood: string (e.g. "romantic and grounded, intimate not posed, hopeful warmth")
- coupleEnergy: string (e.g. "casual elegance, backs to camera, linen and natural fabrics")
- midjourneyStyleString: string (complete locked style string ready to append)
- summary: string (2-3 sentence visual brief in plain English)

Return ONLY valid JSON, no markdown, no explanation.`,
    messages: [
      {
        role: 'user',
        content: boardText,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let brief
  try {
    brief = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse visual brief from Claude' }, { status: 500 })
  }

  return NextResponse.json({ brief })
}
