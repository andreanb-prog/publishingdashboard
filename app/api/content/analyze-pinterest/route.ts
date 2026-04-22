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
    system: `You are a visual creative director specializing in fiction author branding. Analyze the following Pinterest board data and extract a precise visual brief. Return JSON with these fields:
- lightQuality: string (e.g. 'warm golden hour backlight')
- colorPalette: string (e.g. 'amber, dusty sage, terracotta, cream')
- setting: string (e.g. 'California wine country, vineyard rows, rustic outdoor dining')
- mood: string (e.g. 'romantic but grounded, intimate not posed')
- coupleEnergy: string (e.g. 'casual elegance, backs to camera, linen')
- midjourneyStyleString: string (a complete locked Midjourney style string ready to append to any prompt)
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
