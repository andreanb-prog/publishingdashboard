'use client'
// app/dashboard/metrics/page.tsx
import { useEffect, useState } from 'react'
import { DarkPage, DarkSectionHeader } from '@/components/DarkPage'
import type { Analysis } from '@/types'

const BOOK_COLORS = ['#fb7185', '#fbbf24', '#a78bfa', '#38bdf8', '#34d399', '#f97316', '#818cf8', '#2dd4bf']
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

function TrendArrow({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0) return <span style={{ color: '#78716c' }}>—</span>
  const pct = ((curr - prev) / prev) * 100
  const up  = pct >= 0
  return (
    <span className="text-[12px] font-bold ml-2" style={{ color: up ? '#34d399' : '#fb7185' }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 140, height = 32 }: {
  data: number[]; color: string; width?: number; height?: number
}) {
  if (data.length < 2) {
    return <span className="text-[11px]" style={{ color: '#57534e' }}>Not enough data</span>
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
        <div className="text-[12.5px] font-semibold" style={{ color: '#d6d3d1' }}>{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[20px] font-bold" style={{ color: barColor }}>
            {pct.toFixed(0)}%
          </span>
          <span className="text-[11px]" style={{ color: '#78716c' }}>{fmtInt(count)} pages</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#292524' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
      </div>
      {benchmark && (
        <div className="text-[10.5px] mt-1" style={{ color: '#57534e' }}>
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
    <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
      <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#78716c' }}>
        {title}
      </div>
      {value && (
        <div className="font-mono text-[28px] font-bold leading-none mb-1"
          style={{ color: valueColor || '#fbbf24' }}>
          {value}
        </div>
      )}
      {sub && (
        <div className="text-[11px] mb-3" style={{ color: '#78716c' }}>{sub}</div>
      )}
      {children}
      <div className="mt-3 pt-3 text-[11.5px] leading-relaxed"
        style={{ color: '#a8a29e', borderTop: '1px solid #292524' }}>
        💬 {coach}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [analyses,    setAnalyses]    = useState<Analysis[]>([])
  const [loading,     setLoading]     = useState(true)
  const [arcSent,     setArcSent]     = useState('')
  const [arcReceived, setArcReceived] = useState('')

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.json())
      .then(d => {
        const rows: Analysis[] = (d.analyses ?? [])
          .map((a: { data?: Analysis }) => a.data)
          .filter((x: unknown): x is Analysis => !!x && typeof x === 'object' && 'month' in (x as object))
        setAnalyses(rows)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const analysis     = analyses[0] ?? null
  const prevAnalysis = analyses[1] ?? null
  const kdp  = analysis?.kdp
  const meta = analysis?.meta
  const ml   = analysis?.mailerLite

  // ── KENP velocity ──────────────────────────────────────────────────────────
  const allDailyKENP = (kdp?.dailyKENP ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))
  const last7vals = allDailyKENP.slice(-7).map(d => d.value)
  const prev7vals = allDailyKENP.slice(-14, -7).map(d => d.value)
  const avg7      = last7vals.length ? last7vals.reduce((s, v) => s + v, 0) / last7vals.length : 0
  const avgPrev7  = prev7vals.length ? prev7vals.reduce((s, v) => s + v, 0) / prev7vals.length : 0

  // ── Revenue per subscriber ─────────────────────────────────────────────────
  const revPerSub = (kdp && ml && ml.listSize > 0)
    ? kdp.totalRoyaltiesUSD / ml.listSize
    : null

  // ── Cost per KENP ──────────────────────────────────────────────────────────
  const costPerKENP = (meta && kdp && kdp.totalKENP > 0)
    ? meta.totalSpend / kdp.totalKENP
    : null

  // ── Book-level metrics — sorted by KENP desc (most reads = Book 1) ─────────
  const booksSorted = [...(kdp?.books ?? [])].sort((a, b) => b.kenp - a.kenp)

  // ── Read-through funnel ────────────────────────────────────────────────────
  const readThrough = booksSorted.map((book, i) => ({
    book,
    pct:   i === 0 ? 100 : booksSorted[0].kenp > 0 ? (book.kenp / booksSorted[0].kenp) * 100 : 0,
    color: BOOK_COLORS[i] || '#78716c',
  }))

  // ── Borrow rate vs buy rate ────────────────────────────────────────────────
  const booksWithBorrow = booksSorted.map((book, i) => {
    const estimatedBorrows = Math.round(book.kenp / AVG_ROMANCE_PAGES)
    const total    = book.units + estimatedBorrows
    const borrowPct = total > 0 ? (estimatedBorrows / total) * 100 : 0
    return { book, estimatedBorrows, borrowPct, color: BOOK_COLORS[i] || '#78716c' }
  })

  // ── Email campaigns ────────────────────────────────────────────────────────
  const campaigns     = ml?.campaigns ?? []
  const swapCampaigns = campaigns.filter(c => /swap/i.test(c.name))
  const ownCampaigns  = campaigns.filter(c => !/swap/i.test(c.name))
  const avgSwapUnsub  = swapCampaigns.length
    ? swapCampaigns.reduce((s, c) => s + c.unsubscribes, 0) / swapCampaigns.length
    : null
  const avgOwnUnsub   = ownCampaigns.length
    ? ownCampaigns.reduce((s, c) => s + c.unsubscribes, 0) / ownCampaigns.length
    : null
  const sortedByOpen  = [...campaigns].sort((a, b) => b.openRate - a.openRate)
  const bestCampaign  = sortedByOpen[0]
  const worstCampaign = sortedByOpen[sortedByOpen.length - 1]

  // ── Subscriber acquisition cost ────────────────────────────────────────────
  const prevListSize = prevAnalysis?.mailerLite?.listSize ?? null
  const newSubs      = (ml && prevListSize != null) ? ml.listSize - prevListSize : null
  const subAcqCost   = (meta && newSubs != null && newSubs > 0)
    ? meta.totalSpend / newSubs
    : null

  // ── Ad trends (monthly from historical analyses) ───────────────────────────
  const ctrHistory = analyses.map(a => a.meta?.avgCTR ?? 0).reverse()
  const cpcHistory = analyses.map(a => a.meta?.avgCPC ?? 0).reverse()
  const bestAd     = meta?.bestAd
  const worstAd    = meta?.ads?.length
    ? [...meta.ads].sort((a, b) => a.ctr - b.ctr)[0]
    : null

  // ── Days since last upload ─────────────────────────────────────────────────
  const daysSince = analysis?.generatedAt
    ? Math.floor((Date.now() - new Date(analysis.generatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // ── ARC calculator ─────────────────────────────────────────────────────────
  const arcPct = (arcSent && arcReceived && parseInt(arcSent) > 0)
    ? (parseInt(arcReceived) / parseInt(arcSent)) * 100
    : null

  if (loading) {
    return (
      <DarkPage title="📊 Advanced Metrics" subtitle="Deep performance analysis across all channels">
        <div className="text-center py-16">
          <div className="animate-pulse font-serif text-lg" style={{ color: '#fafaf9' }}>
            Reading your data…
          </div>
        </div>
      </DarkPage>
    )
  }

  return (
    <DarkPage title="📊 Advanced Metrics" subtitle="Deep performance analysis across all channels">

      {/* ── SELL-THROUGH & REVENUE HEALTH ──────────────────────────────────── */}
      <DarkSectionHeader title="Sell-Through & Revenue Health" badge="KDP + Ads" badgeColor="#fbbf24" />

      <div className="grid grid-cols-3 gap-4 mb-5">

        {/* KENP velocity */}
        <MetricCard
          title="Page Read Velocity"
          value={avg7 > 0 ? `${avg7.toFixed(0)}/day` : '—'}
          valueColor={avg7 > 0 ? statusColor(avg7, 500, 200) : '#78716c'}
          sub="7-day rolling average KENP reads"
          coach={avg7 > 0
            ? avg7 >= 500
              ? `Strong velocity — ${avg7.toFixed(0)} pages/day means readers are actively inside your books. Keep ad spend consistent.`
              : avg7 >= 200
              ? `Moderate velocity at ${avg7.toFixed(0)} pages/day. A refreshed KU description or new cover can re-energize borrows.`
              : `Low velocity at ${avg7.toFixed(0)} pages/day. Consider a Countdown Deal or price promo to resurface your books in KU.`
            : 'Upload your KDP report to see KENP read velocity.'}
        >
          {avg7 > 0 && prev7vals.length > 0 && (
            <div className="mb-2 flex items-center">
              <span className="text-[11px]" style={{ color: '#78716c' }}>vs previous 7 days</span>
              <TrendArrow curr={avg7} prev={avgPrev7} />
            </div>
          )}
          {allDailyKENP.length >= 2 && (
            <div className="mt-2">
              <Sparkline data={allDailyKENP.slice(-14).map(d => d.value)} color="#fbbf24" />
            </div>
          )}
        </MetricCard>

        {/* Revenue per subscriber */}
        <MetricCard
          title="Revenue Per Subscriber"
          value={revPerSub != null ? `$${revPerSub.toFixed(2)}` : '—'}
          valueColor={revPerSub != null ? statusColor(revPerSub, 0.5, 0.25) : '#78716c'}
          sub={`Royalties ÷ ${ml?.listSize?.toLocaleString() ?? '?'} subscribers · Benchmark $0.50+`}
          coach={revPerSub != null
            ? revPerSub >= 0.5
              ? `$${revPerSub.toFixed(2)}/subscriber is healthy. Your list is earning — keep nurturing it with regular sends.`
              : revPerSub >= 0.25
              ? `$${revPerSub.toFixed(2)}/subscriber is below the $0.50 benchmark. Try more direct-to-book emails to warm up inactive subscribers.`
              : `$${revPerSub.toFixed(2)}/subscriber needs attention. Schedule a "readers who haven't bought Book 2" targeted send.`
            : 'Upload both KDP and MailerLite data to calculate revenue per subscriber.'}
        />

        {/* Cost per KENP */}
        <MetricCard
          title="Cost Per KENP Read"
          value={costPerKENP != null ? `$${costPerKENP.toFixed(4)}` : '—'}
          valueColor={costPerKENP != null ? statusColor(costPerKENP, 0.003, 0.007, false) : '#78716c'}
          sub="Ad spend ÷ KENP reads · Benchmark under $0.003"
          coach={costPerKENP != null
            ? costPerKENP <= 0.003
              ? `$${costPerKENP.toFixed(4)}/page is excellent — your ads are driving reads efficiently, below the $0.003 benchmark.`
              : costPerKENP <= 0.007
              ? `$${costPerKENP.toFixed(4)}/page is acceptable. Tighten targeting or pause low-CTR ads to bring this down.`
              : `$${costPerKENP.toFixed(4)}/page is above benchmark. Your ads may not be converting to KU borrows — review creative and audience.`
            : 'Upload both KDP and Meta Ads data to calculate cost per KENP read.'}
        />
      </div>

      {/* Book-level estimated revenue */}
      {booksSorted.length > 0 && (
        <div className="rounded-xl p-5 mb-7" style={{ background: '#1c1917', border: '1px solid #292524' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-4" style={{ color: '#78716c' }}>
            Estimated Revenue Per Book — Sales + KU
          </div>
          <div className="space-y-3">
            {booksSorted.map((book, i) => {
              const color            = BOOK_COLORS[i] || '#78716c'
              const estimatedBorrows = Math.round(book.kenp / AVG_ROMANCE_PAGES)
              const kuEst            = estimatedBorrows * 0.0045 * AVG_ROMANCE_PAGES
              const total            = book.royalties + kuEst
              const maxTotal         = booksSorted.reduce((mx, b) => {
                const e = Math.round(b.kenp / AVG_ROMANCE_PAGES) * 0.0045 * AVG_ROMANCE_PAGES
                return Math.max(mx, b.royalties + e)
              }, 1)
              return (
                <div key={book.asin || i} className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold truncate" style={{ color: '#d6d3d1' }}>
                      {book.shortTitle}
                    </div>
                    <div className="text-[11px]" style={{ color: '#57534e' }}>
                      {book.units} paid units · {fmtInt(book.kenp)} KENP · ~{estimatedBorrows} KU borrows
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-[18px]" style={{ color }}>
                      ${total.toFixed(2)}
                    </div>
                    <div className="text-[10px]" style={{ color: '#57534e' }}>
                      ${book.royalties.toFixed(2)} sales + ${kuEst.toFixed(2)} KU est.
                    </div>
                  </div>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: '#292524' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min((total / maxTotal) * 100, 100)}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 text-[11.5px] leading-relaxed"
            style={{ color: '#a8a29e', borderTop: '1px solid #292524' }}>
            💬 KU earnings estimated at ~$0.0045/page. Your actual rate varies monthly with the KDP Select Global Fund — check your KDP dashboard for exact KU royalties.
          </div>
        </div>
      )}

      {/* ── LIST & EMAIL PERFORMANCE ────────────────────────────────────────── */}
      <DarkSectionHeader title="List & Email Performance" badge="MailerLite" badgeColor="#34d399" />

      <div className="grid grid-cols-3 gap-4 mb-7">

        {/* Unsub rate by campaign type */}
        <MetricCard
          title="Unsubs: Swap vs Own Sends"
          coach={avgSwapUnsub != null && avgOwnUnsub != null
            ? avgSwapUnsub > avgOwnUnsub * 1.5
              ? `Swap emails average ${(avgSwapUnsub - avgOwnUnsub).toFixed(1)} more unsubs than your own content — that's normal. Focus on swaps with closely matched sub-genre authors.`
              : `Your swap and own-send unsub rates are similar — your swap partners are well-matched to your audience. Keep targeting the same sub-genre.`
            : campaigns.length === 0
            ? 'Upload your MailerLite data and run analysis to see campaign breakdown.'
            : 'Tag your swap campaigns with "Swap" in the name to split this metric.'}
        >
          {(avgSwapUnsub != null || avgOwnUnsub != null) && (
            <div className="space-y-3 mb-2">
              {avgSwapUnsub != null && (
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#78716c' }}>
                    <span>🔁 Swap campaigns ({swapCampaigns.length})</span>
                    <span className="font-mono font-bold" style={{ color: '#fb7185' }}>
                      {avgSwapUnsub.toFixed(1)} avg
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#292524' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(avgSwapUnsub * 5, 100)}%`, background: '#fb7185' }} />
                  </div>
                </div>
              )}
              {avgOwnUnsub != null && (
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#78716c' }}>
                    <span>✉️ Own sends ({ownCampaigns.length})</span>
                    <span className="font-mono font-bold" style={{ color: '#34d399' }}>
                      {avgOwnUnsub.toFixed(1)} avg
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#292524' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(avgOwnUnsub * 5, 100)}%`, background: '#34d399' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </MetricCard>

        {/* Subscriber acquisition cost */}
        <MetricCard
          title="Subscriber Acquisition Cost"
          value={subAcqCost != null ? `$${subAcqCost.toFixed(2)}` : '—'}
          valueColor={subAcqCost != null ? statusColor(subAcqCost, 1, 3, false) : '#78716c'}
          sub={newSubs != null
            ? `${newSubs >= 0 ? '+' : ''}${newSubs} subscribers vs last month`
            : 'Need 2 months of MailerLite data'}
          coach={subAcqCost != null
            ? subAcqCost <= 1
              ? `$${subAcqCost.toFixed(2)}/subscriber is excellent — your ads are building your list cost-effectively.`
              : subAcqCost <= 3
              ? `$${subAcqCost.toFixed(2)}/subscriber is reasonable. If each subscriber buys even one book you're profitable. Test a dedicated lead magnet ad.`
              : `$${subAcqCost.toFixed(2)}/subscriber is high. Consider a reader magnet funnel instead of relying on general book ads.`
            : newSubs === null
            ? 'Upload two months of MailerLite data to calculate subscriber growth cost.'
            : newSubs != null && newSubs <= 0
            ? 'Your list shrank or stayed flat this month. Focus on a lead magnet to restart growth before increasing ad spend.'
            : 'Upload Meta Ads data alongside MailerLite to calculate cost per new subscriber.'}
        />

        {/* Best vs worst campaign */}
        <MetricCard
          title="Campaign Open Rate: Best vs Worst"
          coach={bestCampaign
            ? `"${bestCampaign.name}" had a ${bestCampaign.openRate}% open rate${worstCampaign && worstCampaign !== bestCampaign ? ` vs "${worstCampaign.name}" at ${worstCampaign.openRate}%` : ''}. Study what made that subject line work and replicate the pattern.`
            : 'Upload MailerLite data to compare campaign performance.'}
        >
          {bestCampaign && (
            <div className="space-y-3 mb-2">
              <div>
                <div className="text-[10px] font-bold tracking-[1px] uppercase mb-1"
                  style={{ color: '#34d399' }}>Best</div>
                <div className="text-[12px] font-semibold truncate mb-0.5" style={{ color: '#d6d3d1' }}
                  title={bestCampaign.name}>{bestCampaign.name}</div>
                <div className="font-mono text-[18px] font-bold" style={{ color: '#34d399' }}>
                  {bestCampaign.openRate}% open
                </div>
              </div>
              {worstCampaign && worstCampaign !== bestCampaign && (
                <div className="pt-3" style={{ borderTop: '1px solid #292524' }}>
                  <div className="text-[10px] font-bold tracking-[1px] uppercase mb-1"
                    style={{ color: '#fb7185' }}>Needs Work</div>
                  <div className="text-[12px] font-semibold truncate mb-0.5" style={{ color: '#d6d3d1' }}
                    title={worstCampaign.name}>{worstCampaign.name}</div>
                  <div className="font-mono text-[18px] font-bold" style={{ color: '#fb7185' }}>
                    {worstCampaign.openRate}% open
                  </div>
                </div>
              )}
            </div>
          )}
        </MetricCard>
      </div>

      {/* ── AD PERFORMANCE ──────────────────────────────────────────────────── */}
      <DarkSectionHeader title="Ad Performance" badge="Meta Ads" badgeColor="#38bdf8" />

      <div className="grid grid-cols-3 gap-4 mb-7">

        {/* CTR trend */}
        <MetricCard
          title="CTR Trend (Monthly)"
          value={meta ? `${meta.avgCTR}%` : '—'}
          valueColor={meta ? statusColor(meta.avgCTR, 1.5, 0.8) : '#78716c'}
          sub="Average click-through rate · Benchmark 1%+"
          coach={meta
            ? meta.avgCTR >= 1.5
              ? `${meta.avgCTR}% CTR is excellent — your creatives are resonating with romance readers.`
              : meta.avgCTR >= 0.8
              ? `${meta.avgCTR}% CTR is near the 1% benchmark. Test 2–3 new hook angles to find a creative that breaks through.`
              : `${meta.avgCTR}% CTR is below 1%. Lead with emotion over plot — show the feeling, not the synopsis.`
            : 'Upload Meta Ads data to see your CTR trend.'}
        >
          {ctrHistory.filter(v => v > 0).length >= 2 && (
            <div className="mt-2">
              <div className="text-[10px] mb-1" style={{ color: '#57534e' }}>
                Last {ctrHistory.length} months
              </div>
              <Sparkline data={ctrHistory} color="#38bdf8" />
            </div>
          )}
        </MetricCard>

        {/* CPC trend */}
        <MetricCard
          title="CPC Trend (Monthly)"
          value={meta ? `$${meta.avgCPC}` : '—'}
          valueColor={meta ? statusColor(meta.avgCPC, 0.5, 1.0, false) : '#78716c'}
          sub="Average cost per click · Benchmark under $0.50"
          coach={meta
            ? meta.avgCPC <= 0.5
              ? `$${meta.avgCPC} CPC is efficient. Reinvest savings into scaling your best ad.`
              : meta.avgCPC <= 1.0
              ? `$${meta.avgCPC} CPC is reasonable for romance. If it creeps above $1, pause and retest.`
              : `$${meta.avgCPC} CPC is high. Cut your lowest-CTR ads first — they're dragging your average cost up.`
            : 'Upload Meta Ads data to see your CPC trend.'}
        >
          {cpcHistory.filter(v => v > 0).length >= 2 && (
            <div className="mt-2">
              <div className="text-[10px] mb-1" style={{ color: '#57534e' }}>
                Last {cpcHistory.length} months
              </div>
              <Sparkline data={cpcHistory} color="#fbbf24" />
            </div>
          )}
        </MetricCard>

        {/* Best vs worst ad */}
        <MetricCard
          title="Best vs Worst Ad"
          coach={bestAd && worstAd && bestAd !== worstAd
            ? `"${bestAd.name}" is your winner at ${bestAd.ctr}% CTR. Cut "${worstAd.name}" at ${worstAd.ctr}% CTR and put that budget behind the winner.`
            : meta?.ads?.length === 1
            ? `You have one ad running. Add 2–3 more variations to find your best performer.`
            : 'Upload Meta Ads data to compare your ad performance.'}
        >
          {bestAd && (
            <div className="space-y-3 mb-2">
              <div>
                <div className="text-[10px] font-bold tracking-[1px] uppercase mb-1"
                  style={{ color: '#34d399' }}>Best</div>
                <div className="text-[12px] font-semibold truncate mb-0.5" style={{ color: '#d6d3d1' }}
                  title={bestAd.name}>{bestAd.name}</div>
                <div className="font-mono text-[16px] font-bold" style={{ color: '#34d399' }}>
                  {bestAd.ctr}% CTR · ${bestAd.cpc} CPC
                </div>
              </div>
              {worstAd && worstAd !== bestAd && (
                <div className="pt-3" style={{ borderTop: '1px solid #292524' }}>
                  <div className="text-[10px] font-bold tracking-[1px] uppercase mb-1"
                    style={{ color: '#fb7185' }}>Weakest</div>
                  <div className="text-[12px] font-semibold truncate mb-0.5" style={{ color: '#d6d3d1' }}
                    title={worstAd.name}>{worstAd.name}</div>
                  <div className="font-mono text-[16px] font-bold" style={{ color: '#fb7185' }}>
                    {worstAd.ctr}% CTR · ${worstAd.cpc} CPC
                  </div>
                </div>
              )}
            </div>
          )}
        </MetricCard>
      </div>

      {/* ── SERIES & CATALOG HEALTH ─────────────────────────────────────────── */}
      <DarkSectionHeader title="Series & Catalog Health" badge="KDP" badgeColor="#a78bfa" />

      <div className="grid grid-cols-2 gap-4 mb-7">

        {/* Read-through funnel */}
        <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-4" style={{ color: '#78716c' }}>
            Series Read-Through Rate
          </div>
          {readThrough.length >= 2 ? (
            <>
              <FunnelBar
                label={`${readThrough[0].book.shortTitle} — Book 1`}
                pct={100}
                count={readThrough[0].book.kenp}
                color={readThrough[0].color}
              />
              {readThrough.slice(1).map((rt, i) => (
                <FunnelBar
                  key={rt.book.asin || i}
                  label={`${rt.book.shortTitle} — Book ${i + 2}`}
                  pct={rt.pct}
                  count={rt.book.kenp}
                  color={rt.color}
                  benchmark={40}
                />
              ))}
              <div className="mt-3 pt-3 text-[11.5px] leading-relaxed"
                style={{ color: '#a8a29e', borderTop: '1px solid #292524' }}>
                💬 {readThrough[1]
                  ? readThrough[1].pct >= 40
                    ? `${readThrough[1].pct.toFixed(0)}% of Book 1 readers went on to read Book 2 — above the 40% romance benchmark. Your series hook is working.`
                    : `${readThrough[1].pct.toFixed(0)}% of Book 1 readers continued to Book 2. Add a direct link to Book 2 at the end of Book 1, or strengthen the cliffhanger.`
                  : 'Read-through calculated from KENP ratios. More reads means more accurate data.'}
              </div>
            </>
          ) : (
            <div className="text-[12.5px] py-6 text-center" style={{ color: '#57534e' }}>
              {readThrough.length === 1
                ? 'Only one book detected. Add more books to your KDP data to see series read-through.'
                : 'Upload KDP data with multiple books to see your series read-through funnel.'}
            </div>
          )}
        </div>

        {/* Borrow rate vs buy rate */}
        <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-4" style={{ color: '#78716c' }}>
            Borrow Rate vs Buy Rate (Estimated)
          </div>
          {booksWithBorrow.length > 0 ? (
            <>
              {booksWithBorrow.map(({ book, estimatedBorrows, borrowPct, color }, i) => (
                <div key={book.asin || i} className="mb-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[12.5px] font-semibold" style={{ color: '#d6d3d1' }}>
                        {book.shortTitle}
                      </span>
                    </div>
                    <span className="text-[11px]" style={{ color: '#78716c' }}>
                      {book.units} paid · ~{estimatedBorrows} KU
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: '#292524' }}>
                    <div className="h-full"
                      style={{ width: `${100 - borrowPct}%`, background: color, opacity: 0.9 }} />
                    <div className="h-full"
                      style={{ width: `${borrowPct}%`, background: '#57534e' }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px]" style={{ color: '#57534e' }}>
                    <span style={{ color }}>{(100 - borrowPct).toFixed(0)}% paid sales</span>
                    <span>{borrowPct.toFixed(0)}% KU borrows (est.)</span>
                  </div>
                </div>
              ))}
              <div className="mt-2 pt-3 text-[11.5px] leading-relaxed"
                style={{ color: '#a8a29e', borderTop: '1px solid #292524' }}>
                💬 KU borrows estimated from KENP ÷ 300 pages. A high borrow rate means readers prefer your books in KU — keep your series enrolled in KDP Select.
              </div>
            </>
          ) : (
            <div className="text-[12.5px] py-6 text-center" style={{ color: '#57534e' }}>
              Upload KDP data to see borrow vs buy rates per book.
            </div>
          )}
        </div>
      </div>

      {/* ── OPERATIONAL INDICATORS ──────────────────────────────────────────── */}
      <DarkSectionHeader title="Operational Indicators" badge="Housekeeping" badgeColor="#78716c" />

      <div className="grid grid-cols-2 gap-4 mb-8">

        {/* Days since last upload */}
        <MetricCard
          title="Days Since Last Upload"
          value={daysSince != null ? `${daysSince}` : '—'}
          valueColor={daysSince != null ? statusColor(daysSince, 7, 14, false) : '#78716c'}
          sub={analysis?.generatedAt
            ? `Last analyzed ${new Date(analysis.generatedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}`
            : 'No analysis found yet'}
          coach={daysSince != null
            ? daysSince <= 7
              ? 'Your data is fresh — great habit. Uploading weekly gives you trends before they become problems.'
              : daysSince <= 14
              ? `It's been ${daysSince} days. Monthly uploads are the minimum — weekly is better for catching ad fatigue early.`
              : `It's been ${daysSince} days since your last upload. Stale data means stale decisions. Set a Monday reminder to upload your latest files.`
            : 'Upload your first data set to start tracking freshness.'}
        />

        {/* ARC conversion calculator */}
        <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
          <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-4" style={{ color: '#78716c' }}>
            ARC Conversion Rate Calculator
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold tracking-[1px] uppercase block mb-1.5"
                style={{ color: '#57534e' }}>
                ARCs Sent
              </label>
              <input
                type="number"
                min="0"
                value={arcSent}
                onChange={e => setArcSent(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 rounded-lg text-[13px] font-mono outline-none"
                style={{ background: '#292524', border: '1px solid #3c3836', color: '#fafaf9' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold tracking-[1px] uppercase block mb-1.5"
                style={{ color: '#57534e' }}>
                Reviews Received
              </label>
              <input
                type="number"
                min="0"
                value={arcReceived}
                onChange={e => setArcReceived(e.target.value)}
                placeholder="e.g. 12"
                className="w-full px-3 py-2 rounded-lg text-[13px] font-mono outline-none"
                style={{ background: '#292524', border: '1px solid #3c3836', color: '#fafaf9' }}
              />
            </div>
          </div>
          {arcPct != null && !isNaN(arcPct) && (
            <div className="rounded-lg px-4 py-3 mb-4 text-center" style={{
              background: 'rgba(0,0,0,0.25)',
              border: `1px solid ${statusColor(arcPct, 25, 15)}40`,
            }}>
              <div className="font-mono text-[34px] font-bold leading-none"
                style={{ color: statusColor(arcPct, 25, 15) }}>
                {arcPct.toFixed(1)}%
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#78716c' }}>conversion rate</div>
            </div>
          )}
          <div className="text-[11.5px] leading-relaxed"
            style={{ color: '#a8a29e', borderTop: '1px solid #292524', paddingTop: 12 }}>
            💬 {arcPct != null && !isNaN(arcPct)
              ? arcPct >= 25
                ? `${arcPct.toFixed(1)}% is above the 15–25% normal range — your ARC readers are engaged and following through.`
                : arcPct >= 15
                ? `${arcPct.toFixed(1)}% is within the normal 15–25% range. Follow up personally with non-reviewers 2 weeks post-launch.`
                : `${arcPct.toFixed(1)}% is below the 15–25% benchmark. Use a smaller, curated ARC list of readers who have reviewed before.`
              : '15–25% is a normal conversion rate for romance ARC programs. Enter your numbers above to see where you stand.'}
          </div>
        </div>
      </div>

    </DarkPage>
  )
}
