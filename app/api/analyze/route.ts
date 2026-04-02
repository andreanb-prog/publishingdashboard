// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropic, CLAUDE_MODEL, COACHING_SYSTEM_PROMPT } from '@/lib/anthropic'
import { db } from '@/lib/db'
import type { KDPData, MetaData, MailerLiteData, PinterestData, Analysis } from '@/types'

export async function POST(req: NextRequest) {
  console.log('=== ANALYZE POST CALLED ===')
  const session = await getServerSession(authOptions)
  console.log('Session:', session?.user?.id)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('=== STEP 1: parsing body ===')
    const body = await req.json()
    const { kdp, meta, mailerLite, pinterest, month } = body as {
      kdp?: KDPData
      meta?: MetaData
      mailerLite?: MailerLiteData
      pinterest?: PinterestData
      month: string
    }
    console.log('=== STEP 2: body parsed ===', { month, hasKdp: !!kdp, hasMeta: !!meta })

    // Fetch last 3 months of stored analyses for trend context
    console.log('=== STEP 3: fetching historical ===')
    const historical = await db.analysis.findMany({
      where: { userId: session.user.id, month: { lt: month } },
      orderBy: { month: 'desc' },
      take: 3,
    })
    console.log('=== STEP 4: historical fetched ===', historical.length, 'records')

    const dataSummary = buildDataSummary({ kdp, meta, mailerLite, pinterest })
    const historySummary = buildHistorySummary(historical)

    console.log('=== STEP 5: calling Claude API ===')
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
  },
  "executiveSummary": {
    "headlineStat": "bold summary like '49 books sold · $70 royalties · your best month yet'",
    "whatsWorking": ["up to 4 bullet points of what's going well, bold the key term"],
    "whereToStrengthen": ["up to 4 bullet points of areas to improve, bold the key term"],
    "topActions": [
      {"label": "short action label", "href": "/dashboard/kdp"},
      {"label": "short action label", "href": "/dashboard/meta"},
      {"label": "short action label", "href": "/dashboard/upload"}
    ]
  },
  "crossChannelPlan": {
    "scale": ["things working well to double down on — bold key terms"],
    "fix": ["things that need attention or repair — bold key terms"],
    "cut": ["things to stop doing or reduce — bold key terms"],
    "test": ["new experiments to try next month — bold key terms"]
  }
}`,
        },
      ],
    })

    console.log('=== STEP 6: Claude responded ===')
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let coachingData
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      coachingData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      coachingData = null
    }

    if (!coachingData) {
      console.log('=== STEP 6 FAILED: could not parse Claude response ===')
      return NextResponse.json({ error: 'Failed to parse coaching response' }, { status: 500 })
    }
    console.log('=== STEP 7: coaching data parsed OK ===')

    // ── Confidence scoring gate ───────────────────────────────────────
    // Don't show confidence/impact scores unless we have enough data
    const isNewUser = historical.length === 0
    const totalAds = meta?.ads?.length ?? 0
    // Approximate days of data from month range (full month = ~30 days)
    const daysOfData = kdp || meta ? 30 : 0
    const confidenceReady = !isNewUser && daysOfData >= 14 && totalAds >= 3

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
      executiveSummary: coachingData.executiveSummary || undefined,
      crossChannelPlan: coachingData.crossChannelPlan || undefined,
      // Channel-specific coach paragraphs — used by deep-dive pages
      kdpCoach:      coachingData.insights?.kdp       || '',
      metaCoach:     coachingData.insights?.meta      || '',
      emailCoach:    coachingData.insights?.email     || '',
      pinterestCoach:coachingData.insights?.pinterest || '',
      swapsCoach:    coachingData.insights?.swaps     || '',
      confidenceReady,
      confidenceNote: confidenceReady ? null : 'Confidence scoring unlocks after 14 days of data.',
      generatedAt: new Date().toISOString(),
    }

    console.log('=== ABOUT TO SAVE ===', { userId: session.user.id, month })

    // findFirst + update/create avoids any upsert constraint edge cases
    const existing = await db.analysis.findFirst({
      where: { userId: session.user.id, month },
    })
    console.log('=== EXISTING RECORD ===', existing?.id ?? 'none — will create')

    let saved
    if (existing) {
      saved = await db.analysis.update({
        where: { id: existing.id },
        data: { data: analysis as any },
      })
    } else {
      saved = await db.analysis.create({
        data: {
          userId: session.user.id,
          month,
          data: analysis as any,
        },
      })
    }

    console.log('=== SAVED ===', saved.id)

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

  // Fetch recent records — enough to backfill any missing channel data per-channel
  const recentRecords = await db.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  })

  // First 6 for history charts/tables
  const analyses = recentRecords.slice(0, 6)

  // Latest record for the main analysis blob (optionally filtered by month)
  const record = month
    ? (recentRecords.find(r => r.month === month) ?? null)
    : (recentRecords[0] ?? null)
  let analysis = (record?.data ?? null) as any

  // Backfill KDP from the most recent analysis that has it — this ensures the dashboard
  // shows KDP data even if the user's latest analysis was run with only Meta/Pinterest files
  let kdpLastUploadedAt: string | null = null
  const kdpRecord = recentRecords.find(r => (r.data as any)?.kdp)
  if (kdpRecord) {
    kdpLastUploadedAt = kdpRecord.createdAt.toISOString()
    if (!analysis?.kdp) {
      analysis = analysis
        ? { ...analysis, kdp: (kdpRecord.data as any).kdp }
        : (kdpRecord.data as any)
    }
  }

  console.log('[GET] records:', recentRecords.length, '| latest record id:', record?.id ?? 'NONE')
  console.log('[GET] kdp:', analysis?.kdp ? `units=${analysis.kdp.totalUnits}` : 'MISSING')
  console.log('[GET] meta:', analysis?.meta ? `spend=${analysis.meta.totalSpend}` : 'MISSING')
  console.log('[GET] mailerLite:', analysis?.mailerLite ? `list=${analysis.mailerLite.listSize}` : 'MISSING')
  console.log('[GET] pinterest:', analysis?.pinterest ? `impressions=${analysis.pinterest.totalImpressions}` : 'MISSING')
  console.log('[GET] kdpLastUploadedAt:', kdpLastUploadedAt)

  return NextResponse.json({ analyses, analysis: analysis || null, kdpLastUploadedAt })
}
