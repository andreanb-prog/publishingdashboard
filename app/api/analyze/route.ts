// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { anthropic, CLAUDE_MODEL, COACHING_SYSTEM_PROMPT } from '@/lib/anthropic'
import { db } from '@/lib/db'
import type { KDPData, MetaData, MailerLiteData, PinterestData, Analysis } from '@/types'

// ── KDP data quality validation ───────────────────────────────────────────────
type KdpDataQuality = 'OK' | 'SUSPECT_DATA' | 'INCOMPLETE_DATA'

function validateKdpData(kdp: KDPData): KdpDataQuality {
  const { totalRoyaltiesUSD, totalUnits, books } = kdp

  // Zero books parsed → the file is definitely wrong/empty
  if ((books?.length ?? 0) === 0 && totalUnits > 10) return 'INCOMPLETE_DATA'

  if (totalUnits > 0) {
    const royaltiesPerUnit = totalRoyaltiesUSD / totalUnits
    // royaltiesPerUnit < $0.30 with > 10 units means even 99¢ @ 35% ($0.347)
    // can't explain it — strongly suggests only a single row was parsed instead of summing all
    if (royaltiesPerUnit < 0.30 && totalUnits > 10) return 'SUSPECT_DATA'
  }

  // totalRoyalties < $1 with > 5 units → almost certainly a partial parse
  if (totalRoyaltiesUSD < 1.00 && totalUnits > 5) return 'SUSPECT_DATA'

  return 'OK'
}

// ── Fingerprint: skip Claude if the same data was already analyzed ────────────
function makeFingerprint(kdp?: KDPData, meta?: MetaData, pinterest?: PinterestData): string {
  const parts = [
    kdp       ? `k:${kdp.totalUnits}:${kdp.totalKENP}:${kdp.totalRoyaltiesUSD}`    : '',
    meta      ? `m:${meta.totalSpend}:${meta.totalClicks}:${meta.ads?.length ?? 0}` : '',
    pinterest ? `p:${pinterest.totalImpressions}:${pinterest.pinCount}`             : '',
  ]
  return parts.filter(Boolean).join('|')
}

export async function POST(req: NextRequest) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body eagerly so it's available inside the async stream worker
  let body: { kdp?: KDPData; meta?: MetaData; mailerLite?: MailerLiteData; pinterest?: PinterestData; month: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  const { kdp, meta, mailerLite, pinterest, month } = body

  // ── SSE stream setup ──────────────────────────────────────────────────────
  const encoder  = new TextEncoder()
  const transform = new TransformStream<Uint8Array, Uint8Array>()
  const writer   = transform.writable.getWriter()

  const send = async (data: Record<string, unknown>) => {
    try { await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch { /* client gone */ }
  }

  // Run analysis asynchronously while streaming progress events to the client
  ;(async () => {
    try {
      console.log('=== ANALYZE POST (SSE) ===', { userId: session.user.id, month, hasKdp: !!kdp, hasMeta: !!meta, hasPin: !!pinterest, hasML: !!mailerLite })

      // ── Load existing record once — used for fingerprint cache AND data preservation ──
      const existingRecord = await db.analysis.findFirst({ where: { userId: session.user.id, month } })
      const existingData   = (existingRecord?.data as any) ?? {}

      // ── Cache / skip-unchanged check ──────────────────────────────────────
      const fp = makeFingerprint(kdp, meta, pinterest)
      if (existingRecord) {
        if (existingData?.fingerprint === fp && fp !== '' && (existingData?.channelScores?.length ?? 0) > 0) {
          console.log('=== FINGERPRINT HIT — returning cached analysis ===')
          await send({ type: 'complete', analysis: existingData, cached: true })
          return
        }
      }

      // Stage 3: Saving your data (history + pre-Claude work)
      await send({ type: 'stage', stage: 3 })

      const historical = await db.analysis.findMany({
        where: { userId: session.user.id, month: { lt: month } },
        orderBy: { month: 'desc' },
        take: 3,
      })
      console.log('=== historical fetched ===', historical.length, 'records')

      // ── KDP data quality gate — abort before Claude if data looks partial ────
      if (kdp) {
        const kdpQuality = validateKdpData(kdp)
        if (kdpQuality !== 'OK') {
          console.warn('[analyze] KDP data quality check failed:', kdpQuality, {
            totalUnits: kdp.totalUnits,
            totalRoyaltiesUSD: kdp.totalRoyaltiesUSD,
            books: kdp.books?.length ?? 0,
          })
          await send({ type: 'kdpDataQuality', quality: kdpQuality })
          return
        }
      }

      const dataSummary   = buildDataSummary({ kdp, meta, mailerLite, pinterest })
      const historySummary = buildHistorySummary(historical)

      // Stage 4: Running AI analysis
      await send({ type: 'stage', stage: 4 })
      console.log('=== calling Claude API ===')

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: COACHING_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze this publishing marketing data and produce a complete coaching session.

${dataSummary}${historySummary}

COPY QUALITY RULES — follow these in every field of the JSON response:
- NEVER write "hooks" without specifying: ad hook, blurb hook, or opening hook.
- NEVER write "readers" without specifying: KU readers, buyers, or email subscribers.
- NEVER use "explore" or "consider" as CTAs. Use: send, test, cut, scale, fix, upload, pause, launch, schedule.
- Every action item must name a specific action AND a specific platform (e.g. "Go to Meta Ads Manager and pause the low-CTR ads", not "consider adjusting your ads").
- NEVER end an insight with a hedge like "you know your readers best" — end with the action.
- ALWAYS be specific about numbers: use the actual metric values from the data (e.g. "your CTR is 0.8%", "you sold 14 units"). NEVER say "your numbers are low" or "your engagement is poor" without naming the exact figure.
- COACHING TONE: Every actionPlan title and body MUST follow the pattern: "[What we're seeing] — [what it might mean] — [what to check or do]". NEVER lead with a conclusion (e.g. "Fix KDP royalty crisis") before verification. The product is a supportive coach, not a panic button. Write "Your royalties look lower than expected — this sometimes happens with 99¢ launch pricing or a partial upload. Check your KDP export covers the full month." NOT "Fix KDP royalty crisis".
- 99¢ PRICING RULE: royaltiesPerUnit = totalRoyalties ÷ unitsSold. If royaltiesPerUnit is between $0.20–$0.50, the author is almost certainly using 99¢ pricing (35% royalty = $0.347/unit). Do NOT flag this as a crisis or urgent issue. Only flag a royalty problem if royaltiesPerUnit < $0.20 AND unitsSold > 20.

Respond with a JSON object in exactly this structure (no markdown, raw JSON only):
{
  "storySentence": "one sentence in plain human voice using the actual numbers — references at least 2 metrics, sounds like a person not a dashboard, ends with energy not a hedge, never uses the word 'data' or 'metrics'. Example: '1,326 readers chose your books this month — and 3,115 of them didn't stop reading.'",
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
      "badge": "Growing",
      "storyBullets": {
        "win": "one sentence in plain human voice — what's working right now, with the actual number",
        "trend": "one sentence — what's moving and which direction, with the actual metric",
        "nextAction": "one sentence — single specific next action starting with a verb, naming the platform"
      }
    }
  ],
  "actionPlan": [
    {
      "priority": 1,
      "type": "RED",
      "title": "action title following the pattern: [what we're seeing] — [what to do]",
      "body": "plain English explanation following the pattern: [what we're seeing] — [what it might mean] — [what to check or do]. Must include the actual metric value. Must end with the specific action, never a hedge.",
      "action": "Start with Send/Test/Cut/Scale/Fix/Upload/Pause/Launch/Schedule + specific platform (e.g. 'Go to Meta Ads Manager and pause the low-CTR ad')",
      "channel": "meta",
      "confidence": "high | medium | low — high: multiple data signals agree and the finding is clear; medium: one signal, reasonable but not certain; low: thin data or ambiguous — do not frame as urgent"
    }
  ],
  "insights": {
    "kdp": "2-3 sentence KDP coaching paragraph — must end with a specific action on a named platform, not a hedge",
    "meta": "2-3 sentence Meta coaching paragraph — must end with a specific action on a named platform, not a hedge",
    "email": "2-3 sentence email coaching paragraph — must end with a specific action on a named platform, not a hedge",
    "pinterest": "2-3 sentence Pinterest coaching paragraph — must end with a specific action on a named platform, not a hedge",
    "swaps": "2-3 sentence swaps coaching paragraph — must end with a specific action on a named platform, not a hedge"
  },
  "executiveSummary": {
    "headlineStat": "bold summary like '49 books sold · $70 royalties · your best month yet'",
    "whatsWorking": ["up to 4 bullet points of what's going well, bold the key term"],
    "whereToStrengthen": ["up to 4 bullet points of areas to improve — each must name the specific platform to act on, bold the key term"],
    "topActions": [
      {"label": "action label starting with Send/Test/Cut/Scale/Fix/Upload", "href": "/dashboard/kdp"},
      {"label": "action label starting with Send/Test/Cut/Scale/Fix/Upload", "href": "/dashboard/meta"},
      {"label": "action label starting with Send/Test/Cut/Scale/Fix/Upload", "href": "/dashboard?upload=1"}
    ]
  },
  "crossChannelPlan": {
    "scale": ["specific things working well — name the platform and the action, bold key terms"],
    "fix": ["specific things that need repair — name the platform and the action, bold key terms"],
    "cut": ["specific things to stop or reduce — name the platform and the action, bold key terms"],
    "test": ["specific new experiments to try — name the platform and the action, bold key terms"]
  }
}`,
          },
        ],
      })

      console.log('=== Claude responded ===')
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      let coachingData
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        coachingData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      } catch { coachingData = null }

      if (!coachingData) {
        console.log('=== could not parse Claude response ===')
        await send({ type: 'error', message: 'Failed to parse coaching response' })
        return
      }

      // ── Preserve existing channel data — never wipe unless new upload has ≥1 valid row ──
      // Also protect existing data from bad parses: if new KDP has dramatically fewer
      // units than existing (>50% reduction), treat it as a corrupted/wrong-file parse
      // and keep the existing record instead.
      const existingKdp = existingData.kdp as KDPData | undefined
      // Accept any KDP upload that has at least one meaningful metric — units, KENP reads,
      // royalties, or even just a book list. This ensures KU-heavy months (all KENP, no paid
      // unit purchases) are not silently discarded.
      const newKdpValid = kdp && (
        (kdp.totalUnits ?? 0) > 0 ||
        (kdp.totalKENP ?? 0) > 0 ||
        (kdp.totalRoyaltiesUSD ?? 0) > 0 ||
        (kdp.books?.length ?? 0) > 0
      )
      // Downgrade check: treat as suspicious only when BOTH units AND KENP dropped by >50%.
      // This allows KU-heavy months (0 paid units but high KENP) to be saved correctly.
      const newKdpIsDowngrade = newKdpValid && existingKdp &&
        kdp.totalUnits < existingKdp.totalUnits * 0.5 &&
        (kdp.totalKENP ?? 0) <= (existingKdp.totalKENP ?? 0)
      const kdpToSave = (newKdpValid && !newKdpIsDowngrade)
        ? kdp : (existingKdp ?? undefined)

      const metaToSave = (meta && (meta.ads?.length > 0 || meta.totalClicks > 0))
        ? meta : (existingData.meta ?? undefined)
      const pinToSave = (pinterest && (pinterest.pinCount > 0 || pinterest.totalImpressions > 0))
        ? pinterest : (existingData.pinterest ?? undefined)
      const mlToSave = mailerLite ?? existingData.mailerLite ?? undefined

      console.log('=== channel preservation ===', {
        kdp:       kdpToSave  ? `${kdpToSave.totalUnits} units`  : 'none',
        meta:      metaToSave ? `${metaToSave.totalClicks} clicks` : 'none',
        pinterest: pinToSave  ? `${pinToSave.pinCount} pins`      : 'none',
      })

      // ── Confidence scoring gate ───────────────────────────────────────────
      const isNewUser      = historical.length === 0
      const totalAds       = metaToSave?.ads?.length ?? 0
      const daysOfData     = kdpToSave || metaToSave ? 30 : 0
      const confidenceReady = !isNewUser && daysOfData >= 14 && totalAds >= 3

      const kdpUploadedAt = (newKdpValid && !newKdpIsDowngrade)
        ? new Date().toISOString()
        : ((existingData as any).kdpUploadedAt ?? undefined)

      const analysis: Analysis & Record<string, unknown> = {
        month,
        kdp:        kdpToSave  ?? undefined,
        meta:       metaToSave ?? undefined,
        mailerLite: mlToSave   ?? undefined,
        pinterest:  pinToSave  ?? undefined,
        kdpUploadedAt,
        fingerprint: fp,
        storySentence:   coachingData.storySentence || undefined,
        overallVerdict:  coachingData.overview?.headline || coachingData.overview?.subline || '',
        insights:        coachingData.actionPlan  || [],
        channelScores:   coachingData.channelScores || [],
        actionPlan:      coachingData.actionPlan  || [],
        executiveSummary: coachingData.executiveSummary || undefined,
        crossChannelPlan: coachingData.crossChannelPlan || undefined,
        kdpCoach:       coachingData.insights?.kdp       || '',
        metaCoach:      coachingData.insights?.meta      || '',
        emailCoach:     coachingData.insights?.email     || '',
        pinterestCoach: coachingData.insights?.pinterest || '',
        swapsCoach:     coachingData.insights?.swaps     || '',
        confidenceReady,
        confidenceNote: confidenceReady ? null : 'Confidence scoring unlocks after 14 days of data.',
        generatedAt: new Date().toISOString(),
      }

      console.log('=== saving ===', { userId: session.user.id, month })

      // Use the already-loaded existingRecord — no second DB round-trip needed
      if (existingRecord) {
        await db.analysis.update({ where: { id: existingRecord.id }, data: { data: analysis as any } })
      } else {
        await db.analysis.create({ data: { userId: session.user.id, month, data: analysis as any } })
      }

      console.log('=== saved ===')
      await send({ type: 'complete', analysis, success: true })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Analysis error (SSE):', errMsg, error)
      await send({ type: 'error', message: errMsg })
    } finally {
      try { writer.close() } catch { /* already closed */ }
    }
  })()

  return new Response(transform.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
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
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  console.log('[GET] session userId:', session.user.id)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  // Optional date-range filter — convert YYYY-MM-DD dates to month strings for WHERE clause
  const fromDate = searchParams.get('from')  // e.g. "2026-03-21"
  const toDate   = searchParams.get('to')    // e.g. "2026-04-20"
  const fromMonth = fromDate ? fromDate.substring(0, 7) : null  // "2026-03"
  const toMonth   = toDate   ? toDate.substring(0, 7)   : null  // "2026-04"
  const monthFilter = fromMonth && toMonth
    ? { month: { gte: fromMonth, lte: toMonth } }
    : {}

  // Fetch recent records — enough to backfill any missing channel data per-channel
  const [recentRecords, userRow] = await Promise.all([
    db.analysis.findMany({
      where: { userId: session.user.id, ...monthFilter },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    db.$queryRawUnsafe<{ metaLastSync: Date | null }[]>(
      `SELECT "metaLastSync" FROM "User" WHERE "id" = $1 LIMIT 1`,
      session.user.id
    ).then(rows => rows[0] ?? null),
  ])

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
    if (!analysis?.kdp) {
      analysis = analysis
        ? { ...analysis, kdp: (kdpRecord.data as any).kdp }
        : (kdpRecord.data as any)
    }
  }

  // Prefer UploadLog for last upload timestamp — it's set at parse time, not analysis time
  try {
    const kdpLog = await db.uploadLog.findFirst({
      where: { userId: session.user.id, fileType: 'kdp' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (kdpLog) {
      kdpLastUploadedAt = kdpLog.createdAt.toISOString()
    } else if (kdpRecord) {
      // Fallback for uploads before UploadLog existed
      kdpLastUploadedAt = (kdpRecord.data as any)?.kdpUploadedAt ?? kdpRecord.createdAt.toISOString()
    }
  } catch {
    // UploadLog table may not exist yet in older environments
    if (kdpRecord) {
      kdpLastUploadedAt = (kdpRecord.data as any)?.kdpUploadedAt ?? kdpRecord.createdAt.toISOString()
    }
  }

  console.log('[GET] records:', recentRecords.length, '| latest record id:', record?.id ?? 'NONE')
  console.log('[GET] kdp:', analysis?.kdp ? `units=${analysis.kdp.totalUnits}` : 'MISSING')
  console.log('[GET] meta:', analysis?.meta ? `spend=${analysis.meta.totalSpend}` : 'MISSING')
  console.log('[GET] mailerLite:', analysis?.mailerLite ? `list=${analysis.mailerLite.listSize}` : 'MISSING')
  console.log('[GET] pinterest:', analysis?.pinterest ? `impressions=${analysis.pinterest.totalImpressions}` : 'MISSING')
  console.log('[GET] kdpLastUploadedAt:', kdpLastUploadedAt)

  const metaLastSync = userRow?.metaLastSync ? userRow.metaLastSync.toISOString() : null
  return NextResponse.json({ analyses, analysis: analysis || null, kdpLastUploadedAt, metaLastSync })
}
