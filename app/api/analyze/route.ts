// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, CLAUDE_MODEL, COACHING_SYSTEM_PROMPT } from '@/lib/anthropic'
import { db } from '@/lib/db'
import type { KDPData, MetaData, MailerLiteData, PinterestData, Analysis } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { kdp, meta, mailerLite, pinterest, month } = body as {
      kdp?: KDPData
      meta?: MetaData
      mailerLite?: MailerLiteData
      pinterest?: PinterestData
      month: string
    }

    // Fetch last 3 months of stored analyses for trend context
    const historical = await db.analysis.findMany({
      where: { userId: session.user.id, month: { lt: month } },
      orderBy: { month: 'desc' },
      take: 3,
    })

    const dataSummary = buildDataSummary({ kdp, meta, mailerLite, pinterest })
    const historySummary = buildHistorySummary(historical)

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: COACHING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this publishing marketing data and produce a complete coaching session.

${dataSummary}${historySummary}

Respond with a JSON object in exactly this structure (no markdown, raw JSON only):
{
  "overview": {
    "headline": "one sentence summary of the month",
    "subline": "one supporting sentence",
    "mood": "POSITIVE"
  },
  "channelScores": [
    {
      "channel": "kdp",
      "status": "GREEN",
      "headline": "key number",
      "subline": "one plain-English sentence",
      "metric": "$70.93",
      "badge": "Growing"
    }
  ],
  "actionPlan": [
    {
      "priority": 1,
      "type": "RED",
      "title": "action title",
      "body": "plain English explanation with specific numbers from the data",
      "action": "CTA text",
      "channel": "meta"
    }
  ],
  "insights": {
    "kdp": "2-3 sentence KDP coaching paragraph",
    "meta": "2-3 sentence Meta coaching paragraph",
    "email": "2-3 sentence email coaching paragraph",
    "pinterest": "2-3 sentence Pinterest coaching paragraph",
    "swaps": "2-3 sentence swaps coaching paragraph"
  }
}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let coachingData
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      coachingData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      coachingData = null
    }

    if (!coachingData) {
      return NextResponse.json({ error: 'Failed to parse coaching response' }, { status: 500 })
    }

    const analysis: Analysis & Record<string, unknown> = {
      month,
      kdp:        kdp        ?? undefined,
      meta:       meta       ?? undefined,
      mailerLite: mailerLite ?? undefined,
      pinterest:  pinterest  ?? undefined,
      overallVerdict: coachingData.overview?.headline || coachingData.overview?.subline || '',
      insights:      coachingData.actionPlan  || [],
      channelScores: coachingData.channelScores || [],
      actionPlan:    coachingData.actionPlan  || [],
      // Channel-specific coach paragraphs — used by deep-dive pages
      kdpCoach:      coachingData.insights?.kdp       || '',
      metaCoach:     coachingData.insights?.meta      || '',
      emailCoach:    coachingData.insights?.email     || '',
      pinterestCoach:coachingData.insights?.pinterest || '',
      swapsCoach:    coachingData.insights?.swaps     || '',
      generatedAt: new Date().toISOString(),
    }

    console.log('Session userId:', session.user.id)
    console.log('[POST] upserting id:', `${session.user.id}-${month}`, '| kdp:', !!kdp, '| meta:', !!meta, '| mailerLite:', !!mailerLite, '| pinterest:', !!pinterest)

    const saved = await db.analysis.upsert({
      where: { id: `${session.user.id}-${month}` },
      update: { data: analysis as any },
      create: {
        id: `${session.user.id}-${month}`,
        userId: session.user.id,
        month,
        data: analysis as any,
      },
    })

    console.log('[POST] upserted successfully, id:', saved.id, '| month:', saved.month)

    return NextResponse.json({ success: true, analysis, coaching: coachingData })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function buildDataSummary({ kdp, meta, mailerLite, pinterest }: {
  kdp?: KDPData; meta?: MetaData; mailerLite?: MailerLiteData; pinterest?: PinterestData
}): string {
  const parts: string[] = []

  if (kdp) {
    parts.push(`## KDP Data (${kdp.month})
Total royalties: $${kdp.totalRoyaltiesUSD.toFixed(2)} USD
Total units sold: ${kdp.totalUnits}
Total KENP reads: ${kdp.totalKENP.toLocaleString()}
Books: ${kdp.books.map(b => `${b.shortTitle}: ${b.units} units, ${b.kenp} KENP`).join(' | ')}`)
  }

  if (meta) {
    parts.push(`## Meta Ads Data
Total spend: $${meta.totalSpend} | Clicks: ${meta.totalClicks} | Avg CTR: ${meta.avgCTR}%
Best ad: ${meta.bestAd?.name} (${meta.bestAd?.ctr}% CTR, $${meta.bestAd?.cpc} CPC)
All ads: ${meta.ads.map(a => `${a.name}: $${a.spend}, ${a.clicks} clicks, ${a.ctr}% CTR — ${a.status}`).join(' | ')}`)
  }

  if (mailerLite) {
    parts.push(`## Email Data
List: ${mailerLite.listSize} subscribers | Open rate: ${mailerLite.openRate}% | Click rate: ${mailerLite.clickRate}% | Unsubscribes: ${mailerLite.unsubscribes}`)
  }

  if (pinterest) {
    parts.push(`## Pinterest Data
Impressions: ${pinterest.totalImpressions} | Saves: ${pinterest.totalSaves} | Pins: ${pinterest.pinCount} | Account age: ${pinterest.accountAge}`)
  }

  return parts.join('\n\n')
}

function buildHistorySummary(historical: { month: string; data: unknown }[]): string {
  if (!historical.length) return ''

  const lines: string[] = ['\n\n## Your Last 3 Months (for spotting trends)']
  for (const row of historical) {
    const d = row.data as Analysis
    const parts: string[] = [`### ${row.month}`]
    if (d.kdp) parts.push(`KDP: $${d.kdp.totalRoyaltiesUSD} royalties, ${d.kdp.totalUnits} units, ${d.kdp.totalKENP?.toLocaleString()} KENP`)
    if (d.meta) parts.push(`Meta: $${d.meta.totalSpend} spend, ${d.meta.totalClicks} clicks, ${d.meta.avgCTR}% CTR`)
    if (d.mailerLite) parts.push(`Email: ${d.mailerLite.listSize} subscribers, ${d.mailerLite.openRate}% open rate`)
    if (d.pinterest) parts.push(`Pinterest: ${d.pinterest.totalImpressions} impressions, ${d.pinterest.pinCount} pins`)
    lines.push(parts.join('\n'))
  }
  lines.push('Use this history to identify trends and call them out in your coaching.')

  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  console.log('[GET] session userId:', session.user.id)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  // findFirst for the single latest record — used by Overview banner and KDP/Meta deep dives
  const record = await db.analysis.findFirst({
    where: { userId: session.user.id, ...(month ? { month } : {}) },
    orderBy: { createdAt: 'desc' },
  })
  const analysis = (record?.data ?? null) as any

  // findMany for historical data — used by charts and history tables
  const analyses = await db.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  console.log('[GET] records:', analyses.length, '| latest record id:', record?.id ?? 'NONE')
  console.log('[GET] kdp:', analysis?.kdp ? `units=${analysis.kdp.totalUnits} kenp=${analysis.kdp.totalKENP}` : 'MISSING')

  return NextResponse.json({ analyses, analysis: analysis || null })
}
