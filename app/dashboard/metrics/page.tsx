'use client'
// app/dashboard/metrics/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage, DarkSectionHeader } from '@/components/DarkPage'
import { BOOK_COLORS } from '@/lib/bookColors'
import type { Analysis, RankLog, RoasLog } from '@/types'
const AVG_ROMANCE_PAGES = 300

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtInt(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString()
}

function statusColor(value: number, good: number, bad: number, higherIsBetter = true): string {
  if (higherIsBetter) {
    if (value >= good) return '#34d399'
    if (value >= bad)  return '#fbbf24'
    return '#fb7185'
  } else {
    if (value <= good) return '#34d399'
    if (value <= bad)  return '#fbbf24'
    return '#fb7185'
  }
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 140, height = 32 }: {
  data: number[]; color: string; width?: number; height?: number
}) {
  if (data.length < 2) {
    return <span className="text-[11px]" style={{ color: '#9CA3AF' }}>Not enough data</span>
  }
  const min   = Math.min(...data)
  const max   = Math.max(...data)
  const range = max - min || 1
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Funnel bar ────────────────────────────────────────────────────────────────
function FunnelBar({ label, pct, count, color, benchmark }: {
  label: string; pct: number; count: number; color: string; benchmark?: number
}) {
  const barColor = benchmark
    ? (pct >= benchmark ? '#34d399' : pct >= benchmark * 0.7 ? '#fbbf24' : '#fb7185')
    : color
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[12.5px] font-semibold" style={{ color: '#1E2D3D' }}>{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-semibold tracking-tight" style={{ color: barColor }}>
            {pct.toFixed(0)}%
          </span>
          <span className="text-[11px]" style={{ color: '#6B7280' }}>{fmtInt(count)} pages</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#EEEBE6' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
      {benchmark && (
        <div className="text-[10.5px] mt-1" style={{ color: '#9CA3AF' }}>
          Benchmark: {benchmark}%+ is strong for romance
        </div>
      )}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ title, value, valueColor, sub, coach, children }: {
  title: string
  value?: string
  valueColor?: string
  sub?: string
  coach: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
        {title}
      </div>
      {value && (
        <div className="text-[32px] font-semibold leading-none tracking-tight mb-1"
          style={{ color: valueColor || '#E9A020' }}>
          {value}
        </div>
      )}
      {sub && (
        <div className="text-[11px] mb-3" style={{ color: '#6B7280' }}>{sub}</div>
      )}
      {children}
      <div className="mt-3 pt-3 text-[11.5px] leading-relaxed"
        style={{ color: '#6B7280', borderTop: '1px solid #EEEBE6' }}>
        💬 {coach}
      </div>
    </div>
  )
}

// ── Reader Funnel ────────────────────────────────────────────────────────────
type FunnelStage = {
  label: string; value: string; raw: number; sub: string; available: boolean
  leakPct?: number; leakStatus?: 'green' | 'amber' | 'red'; leakNote?: string
}

function ReaderFunnel({ meta, kdp, ml, booksSorted }: {
  meta?: Analysis['meta']; kdp?: Analysis['kdp']; ml?: Analysis['mailerLite']
  booksSorted: NonNullable<Analysis['kdp']>['books']
}) {
  const impressions = meta?.totalImpressions ?? 0
  const clicks = meta?.totalClicks ?? 0
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
  const totalUnits = kdp?.totalUnits ?? 0
  const estimatedBorrows = kdp ? Math.round((kdp.totalKENP ?? 0) / AVG_ROMANCE_PAGES) : 0
  const readers = totalUnits + estimatedBorrows
  const costPerClick = meta && clicks > 0 ? meta.totalSpend / clicks : 0
  const costPerReader = meta && readers > 0 ? meta.totalSpend / readers : 0
  const listSize = ml?.listSize ?? 0
  const costPerSub = meta && listSize > 0 ? meta.totalSpend / listSize : 0
  const b1kenp = booksSorted[0]?.kenp ?? 0
  const b2kenp = booksSorted[1]?.kenp ?? 0
  const readThroughPct = b1kenp > 0 && booksSorted.length > 1 ? (b2kenp / b1kenp) * 100 : 0

  const stages: FunnelStage[] = [
    { label: 'Ad Impressions', value: impressions > 0 ? impressions.toLocaleString() : '—', raw: impressions, sub: 'Source: Meta ads', available: !!meta },
    { label: 'Clicks', value: clicks > 0 ? clicks.toLocaleString() : '—', raw: clicks, sub: `${ctr.toFixed(1)}% CTR`, available: !!meta, leakPct: impressions > 0 ? 100 - ctr : undefined, leakStatus: ctr >= 2 ? 'green' : ctr >= 1 ? 'amber' : 'red', leakNote: ctr < 1 ? 'Low CTR — your ad creative may need a stronger hook' : undefined },
    { label: 'Book Page Visits', value: clicks > 0 ? `~${clicks.toLocaleString()}` : '—', raw: clicks, sub: 'Estimated from clicks', available: !!meta },
    { label: 'Readers', value: readers > 0 ? readers.toLocaleString() : '—', raw: readers, sub: readers > 0 ? `${totalUnits} units + ~${estimatedBorrows} KU · $${costPerReader.toFixed(2)}/reader` : 'Source: KDP', available: !!kdp, leakPct: clicks > 0 ? (1 - readers / clicks) * 100 : undefined, leakStatus: clicks > 0 ? (readers / clicks >= 0.3 ? 'green' : readers / clicks >= 0.15 ? 'amber' : 'red') : undefined, leakNote: clicks > 0 && readers / clicks < 0.15 ? 'Low conversion — improve your blurb or cover' : undefined },
    { label: 'Series Continuation', value: readThroughPct > 0 ? `${readThroughPct.toFixed(0)}% read-through` : '—', raw: readThroughPct, sub: booksSorted.length > 1 ? 'Book 2 vs Book 1 KENP' : 'Need 2+ books', available: booksSorted.length > 1, leakPct: readThroughPct > 0 ? 100 - readThroughPct : undefined, leakStatus: readThroughPct >= 60 ? 'green' : readThroughPct >= 35 ? 'amber' : 'red', leakNote: readThroughPct > 0 && readThroughPct < 35 ? 'Low read-through — check back matter links' : undefined },
    { label: 'Email Subscribers', value: listSize > 0 ? listSize.toLocaleString() : '0', raw: listSize, sub: listSize === 0 && readers > 0 ? `${readers.toLocaleString()} readers never captured — YOUR LEAK` : listSize > 0 ? `$${costPerSub.toFixed(2)}/subscriber` : 'Source: MailerLite', available: true, leakStatus: listSize === 0 && readers > 0 ? 'red' : listSize > 0 ? 'green' : undefined, leakNote: listSize === 0 && readers > 0 ? 'No email capture — build a reader magnet immediately' : undefined },
  ]

  const LEAK_COLORS = { green: { bg: 'rgba(52,211,153,0.08)', color: '#34d399', label: 'Healthy' }, amber: { bg: 'rgba(251,191,36,0.08)', color: '#fbbf24', label: 'Monitor' }, red: { bg: 'rgba(251,113,133,0.08)', color: '#fb7185', label: 'Leak' } }

  const metrics = [
    { label: 'Cost per Click', value: costPerClick > 0 ? `$${costPerClick.toFixed(2)}` : '—', color: '#38bdf8' },
    { label: 'Cost per Reader', value: costPerReader > 0 ? `$${costPerReader.toFixed(2)}` : '—', color: '#34d399' },
    { label: 'Cost per Subscriber', value: costPerSub > 0 ? `$${costPerSub.toFixed(2)}` : '—', color: '#a78bfa' },
    { label: 'Readers This Month', value: readers > 0 ? readers.toLocaleString() : '—', color: '#e9a020' },
  ]

  const coachLines: string[] = []
  if (listSize === 0 && readers > 0) coachLines.push(`Your biggest leak: ${readers} readers but none captured to email.`)
  if (ctr > 0 && ctr < 1) coachLines.push(`Ad CTR of ${ctr.toFixed(1)}% is below 1% — creative needs a stronger hook.`)
  if (ctr >= 2) coachLines.push(`${ctr.toFixed(1)}% CTR is strong.`)
  if (readThroughPct >= 60) coachLines.push(`${readThroughPct.toFixed(0)}% read-through is excellent.`)
  if (coachLines.length === 0) coachLines.push('Upload your KDP and Meta data to see your full funnel.')

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-1.5" style={{ color: '#9CA3AF' }}>{m.label}</div>
            <div className="text-[28px] font-semibold leading-none tracking-tight" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5 md:p-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const widthPct = 100 - (i * 12)
            const leak = stage.leakStatus ? LEAK_COLORS[stage.leakStatus] : null
            return (
              <div key={stage.label}>
                <div className="mx-auto" style={{ maxWidth: `${widthPct}%` }}>
                  <div className="rounded-lg px-4 py-3 md:px-5 md:py-4"
                    style={{ background: stage.available ? '#F9F9F8' : '#FAFAFA', border: stage.available ? '1px solid #EEEBE6' : '1px dashed #D6D3D1', opacity: stage.available ? 1 : 0.6 }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-[10px] font-bold tracking-[1px] uppercase mb-0.5" style={{ color: '#9CA3AF' }}>{stage.label}</div>
                        <div className="text-[22px] md:text-[26px] font-semibold leading-none tracking-tight" style={{ color: stage.available ? '#1E2D3D' : '#9CA3AF' }}>{stage.value}</div>
                      </div>
                      <div className="text-[11px] text-right" style={{ color: '#6B7280' }}>{stage.sub}</div>
                    </div>
                    {!stage.available && <div className="mt-2 text-[11px]" style={{ color: '#e9a020' }}>Upload data to fill this stage →</div>}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-1.5">
                    <span className="text-[16px]" style={{ color: '#EEEBE6' }}>▼</span>
                    {leak && stage.leakPct != null && stage.leakPct > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: leak.bg, color: leak.color }}>{stage.leakPct.toFixed(0)}% drop · {leak.label}</span>
                    )}
                  </div>
                )}
                {stage.leakNote && (
                  <div className="mx-auto mb-1" style={{ maxWidth: `${widthPct}%` }}>
                    <div className="rounded-lg px-3 py-2 text-[11.5px]" style={{ background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)', color: '#fb7185' }}>💬 {stage.leakNote}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-5 pt-4 text-[12.5px] leading-relaxed" style={{ borderTop: '1px solid #EEEBE6', color: '#374151' }}>
          <span className="font-bold" style={{ color: '#e9a020' }}>Funnel analysis:</span> {coachLines.join(' ')}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [analyses,    setAnalyses]    = useState<Analysis[]>([])
  const [rankLogs,    setRankLogs]    = useState<RankLog[]>([])
  const [roasLogs,    setRoasLogs]    = useState<RoasLog[]>([])
  const [loading,     setLoading]     = useState(true)
  const [arcSent,     setArcSent]     = useState('')
  const [arcReceived, setArcReceived] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.json()).catch(() => ({})),
      fetch('/api/rank').then(r => r.ok ? r.json() : { logs: [] }).catch(() => ({ logs: [] })),
      fetch('/api/roas').then(r => r.ok ? r.json() : { logs: [] }).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, rankData, roasData]) => {
      const rows: Analysis[] = (analyzeData.analyses ?? [])
        .map((a: { data?: Analysis }) => a.data)
        .filter((x: unknown): x is Analysis => !!x && typeof x === 'object' && 'month' in (x as object))
      setAnalyses(rows)
      setRankLogs(rankData.logs ?? [])
      setRoasLogs(roasData.logs ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const analysis     = analyses[0] ?? null
  const prevAnalysis = analyses[1] ?? null
  const kdp  = analysis?.kdp
  const meta = analysis?.meta
  const ml   = analysis?.mailerLite

  const booksSorted = [...(kdp?.books ?? [])].sort((a, b) => b.kenp - a.kenp)
  const readThrough = booksSorted.map((book, i) => ({
    book,
    pct:   i === 0 ? 100 : booksSorted[0].kenp > 0 ? (book.kenp / booksSorted[0].kenp) * 100 : 0,
    color: BOOK_COLORS[i] || '#9CA3AF',
  }))

  // ── Cross-channel correlation data ─────────────────────────────────────────
  // Ad Spend vs Rank: did spending move rank?
  const spendHistory = analyses.map(a => a.meta?.totalSpend ?? 0).reverse()
  const recentRankByMonth = analyses.map(a => {
    const month = a.month
    const logsInMonth = rankLogs.filter(l => l.date.toString().startsWith(month))
    return logsInMonth.length > 0 ? Math.min(...logsInMonth.map(l => l.rank)) : null
  }).reverse()

  // Email open rate vs KDP units correlation
  const emailOpenHistory = analyses.map(a => a.mailerLite?.openRate ?? 0).reverse()
  const unitsHistory = analyses.map(a => a.kdp?.totalUnits ?? 0).reverse()

  // Swap → KENP: compare KENP in months with swaps vs without
  const kenpHistory = analyses.map(a => a.kdp?.totalKENP ?? 0).reverse()

  // Series Health Score
  const readThroughScore = readThrough.length >= 2 ? Math.min(readThrough[1].pct / 40 * 100, 100) : 0
  const bestRank = rankLogs.length ? Math.min(...rankLogs.slice(-30).map(l => l.rank)) : null
  const rankScore = bestRank ? (bestRank <= 50000 ? 100 : bestRank <= 200000 ? 60 : 20) : 0
  const listGrowth = prevAnalysis?.mailerLite && ml ? ml.listSize - prevAnalysis.mailerLite.listSize : 0
  const listScore = listGrowth > 50 ? 100 : listGrowth > 10 ? 60 : listGrowth > 0 ? 30 : 0
  const seriesHealth = Math.round((readThroughScore + rankScore + listScore) / 3)
  const seriesHealthColor = seriesHealth >= 70 ? '#34d399' : seriesHealth >= 40 ? '#fbbf24' : '#fb7185'

  // ARC calculator
  const arcPct = (arcSent && arcReceived && parseInt(arcSent) > 0)
    ? (parseInt(arcReceived) / parseInt(arcSent)) * 100
    : null

  if (loading) {
    return (
      <DarkPage title="Advanced Metrics" subtitle="Cross-channel insights that no single page can show">
        <div className="text-center py-16">
          <div className="animate-pulse text-lg" style={{ color: '#1E2D3D' }}>Reading your data…</div>
        </div>
      </DarkPage>
    )
  }

  return (
    <DarkPage title="Advanced Metrics" subtitle="Cross-channel insights that no single page can show">

      {/* ── 1. READER FUNNEL CHECKER ───────────────────────────────────────── */}
      <DarkSectionHeader title="Reader Funnel Checker" badge="Full pipeline" badgeColor="#fb7185" />
      <ReaderFunnel meta={meta} kdp={kdp} ml={ml} booksSorted={booksSorted} />

      {/* ── 2. CROSS-CHANNEL CORRELATIONS ──────────────────────────────────── */}
      <DarkSectionHeader title="Cross-Channel Correlations" badge="Multi-source" badgeColor="#38bdf8" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">

        {/* Ad Spend → Rank Correlation */}
        <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
            Ad Spend → Rank Correlation
          </div>
          <div className="text-[12.5px] mb-3" style={{ color: '#1E2D3D' }}>
            Did spending move your rank?
          </div>
          {spendHistory.filter(v => v > 0).length >= 2 && (
            <div className="mb-3">
              <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Spend trend</div>
              <Sparkline data={spendHistory} color="#fb7185" />
            </div>
          )}
          {recentRankByMonth.filter((v): v is number => v != null).length >= 2 && (
            <div className="mb-3">
              <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Best rank trend (lower = better)</div>
              <Sparkline data={recentRankByMonth.map(v => v != null ? -v : 0)} color="#34d399" />
            </div>
          )}
          <div className="text-[11.5px] leading-relaxed pt-3" style={{ borderTop: '1px solid #EEEBE6', color: '#6B7280' }}>
            💬 {spendHistory.filter(v => v > 0).length >= 2
              ? 'Compare the shapes above — if spend goes up and rank improves (lower number), your ads are driving discoverability.'
              : 'Need 2+ months of Meta ads data and rank logs to see this correlation.'}
          </div>
        </div>

        {/* Email → Sales Correlation */}
        <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
            Email → Sales Correlation
          </div>
          <div className="text-[12.5px] mb-3" style={{ color: '#1E2D3D' }}>
            Did high open-rate emails move units?
          </div>
          {emailOpenHistory.filter(v => v > 0).length >= 2 && (
            <div className="mb-3">
              <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Open rate trend</div>
              <Sparkline data={emailOpenHistory} color="#34d399" />
            </div>
          )}
          {unitsHistory.filter(v => v > 0).length >= 2 && (
            <div className="mb-3">
              <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>Units sold trend</div>
              <Sparkline data={unitsHistory} color="#e9a020" />
            </div>
          )}
          <div className="text-[11.5px] leading-relaxed pt-3" style={{ borderTop: '1px solid #EEEBE6', color: '#6B7280' }}>
            💬 {emailOpenHistory.filter(v => v > 0).length >= 2
              ? 'When email opens spike and units follow, your list is converting. Months where opens are high but units flat may mean you need stronger CTAs in your emails.'
              : 'Need 2+ months of MailerLite and KDP data to see this correlation.'}
          </div>
        </div>

        {/* Swap → KENP Correlation */}
        <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
            Swap → KENP Correlation
          </div>
          <div className="text-[12.5px] mb-3" style={{ color: '#1E2D3D' }}>
            Did your swaps cause KENP spikes?
          </div>
          {kenpHistory.filter(v => v > 0).length >= 2 && (
            <div className="mb-3">
              <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>KENP trend (monthly)</div>
              <Sparkline data={kenpHistory} color="#a78bfa" width={200} />
            </div>
          )}
          <div className="text-[11.5px] leading-relaxed pt-3" style={{ borderTop: '1px solid #EEEBE6', color: '#6B7280' }}>
            💬 {kenpHistory.filter(v => v > 0).length >= 2
              ? 'Look for KENP spikes in months with active swaps. A swap with a larger list should produce a visible bump in borrows within 1–2 weeks.'
              : 'Need 2+ months of KDP data to spot swap-driven KENP patterns. Keep logging your swaps!'}
          </div>
        </div>

        {/* Series Health Score */}
        <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
            Series Health Score
          </div>
          <div className="text-[12.5px] mb-3" style={{ color: '#1E2D3D' }}>
            Read-through + rank + list growth combined
          </div>
          <div className="text-center mb-4">
            <div className="text-[48px] font-semibold leading-none tracking-tight" style={{ color: seriesHealthColor }}>
              {seriesHealth}
            </div>
            <div className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>out of 100</div>
          </div>
          <div className="space-y-2 mb-3">
            {[
              { label: 'Read-through', score: readThroughScore, note: readThrough.length >= 2 ? `${readThrough[1].pct.toFixed(0)}% Book 1 → 2` : 'Need 2+ books' },
              { label: 'Best Rank', score: rankScore, note: bestRank ? `#${bestRank.toLocaleString()}` : 'No rank data' },
              { label: 'List Growth', score: listScore, note: `${listGrowth >= 0 ? '+' : ''}${listGrowth} subscribers` },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="text-[11px] w-24" style={{ color: '#6B7280' }}>{item.label}</div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#EEEBE6' }}>
                  <div className="h-full rounded-full" style={{ width: `${item.score}%`, background: item.score >= 70 ? '#34d399' : item.score >= 40 ? '#fbbf24' : '#fb7185' }} />
                </div>
                <div className="text-[10px] w-28 text-right" style={{ color: '#9CA3AF' }}>{item.note}</div>
              </div>
            ))}
          </div>
          <div className="text-[11.5px] leading-relaxed pt-3" style={{ borderTop: '1px solid #EEEBE6', color: '#6B7280' }}>
            💬 {seriesHealth >= 70
              ? 'Your series is healthy across all three dimensions. Keep the momentum.'
              : seriesHealth >= 40
              ? 'Some areas need attention. Focus on the lowest-scoring component first.'
              : 'Multiple areas need work. Start with the biggest gap — usually email capture or read-through.'}
          </div>
        </div>
      </div>

      {/* ── 3. SERIES READ-THROUGH FUNNEL ──────────────────────────────────── */}
      <DarkSectionHeader title="Series Read-Through Funnel" badge="Cross-book" badgeColor="#a78bfa" />

      <div className="rounded-xl p-5 mb-7" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        {readThrough.length >= 2 ? (
          <>
            {readThrough.map((rt, i) => (
              <FunnelBar
                key={rt.book.asin || i}
                label={`${rt.book.shortTitle} — Book ${i + 1}`}
                pct={rt.pct}
                count={rt.book.kenp}
                color={rt.color}
                benchmark={i > 0 ? 40 : undefined}
              />
            ))}
            <div className="mt-3 pt-3 text-[11.5px] leading-relaxed" style={{ color: '#6B7280', borderTop: '1px solid #EEEBE6' }}>
              💬 {readThrough[1].pct >= 40
                ? `${readThrough[1].pct.toFixed(0)}% of Book 1 readers continued to Book 2 — above the 40% benchmark. Your series hook is working.`
                : `${readThrough[1].pct.toFixed(0)}% continued to Book 2. Strengthen your cliffhanger and add a direct link at the end of Book 1.`}
            </div>
          </>
        ) : (
          <div className="text-[12.5px] py-6 text-center" style={{ color: '#9CA3AF' }}>
            Upload KDP data with 2+ books to see your series read-through funnel.
          </div>
        )}
      </div>

      {/* ── 4. ARC CALCULATOR ──────────────────────────────────────────────── */}
      <DarkSectionHeader title="ARC Conversion Calculator" badge="Tool" badgeColor="#9CA3AF" />

      <div className="rounded-xl p-5 mb-7 max-w-md" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold tracking-[1px] uppercase block mb-1.5" style={{ color: '#6B7280' }}>ARCs Sent</label>
            <input type="number" min="0" value={arcSent} onChange={e => setArcSent(e.target.value)} placeholder="e.g. 50"
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: 'white', border: '1px solid #D6D3D1', color: '#1E2D3D' }} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold tracking-[1px] uppercase block mb-1.5" style={{ color: '#6B7280' }}>Reviews Received</label>
            <input type="number" min="0" value={arcReceived} onChange={e => setArcReceived(e.target.value)} placeholder="e.g. 12"
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none" style={{ background: 'white', border: '1px solid #D6D3D1', color: '#1E2D3D' }} />
          </div>
        </div>
        {arcPct != null && !isNaN(arcPct) && (
          <div className="rounded-lg px-4 py-3 mb-4 text-center" style={{ background: '#F5F5F4', border: `1px solid ${statusColor(arcPct, 25, 15)}40` }}>
            <div className="text-[34px] font-semibold leading-none tracking-tight" style={{ color: statusColor(arcPct, 25, 15) }}>{arcPct.toFixed(1)}%</div>
            <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>conversion rate</div>
          </div>
        )}
        <div className="text-[11.5px] leading-relaxed" style={{ color: '#6B7280', borderTop: '1px solid #EEEBE6', paddingTop: 12 }}>
          💬 {arcPct != null && !isNaN(arcPct)
            ? arcPct >= 25 ? `${arcPct.toFixed(1)}% is above the 15–25% normal range — your ARC readers are engaged.`
              : arcPct >= 15 ? `${arcPct.toFixed(1)}% is within normal range. Follow up with non-reviewers 2 weeks post-launch.`
              : `${arcPct.toFixed(1)}% is below benchmark. Use a smaller, curated ARC list.`
            : '15–25% is normal for romance ARC programs. Enter your numbers above.'}
        </div>
      </div>

    </DarkPage>
  )
}
