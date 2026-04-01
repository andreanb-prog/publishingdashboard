'use client'
// app/dashboard/metrics/page.tsx
import { useEffect, useState, useMemo } from 'react'
import { DarkPage, DarkSectionHeader } from '@/components/DarkPage'
import type { Analysis, DailyData, RankLog, RoasLog } from '@/types'

// ── Colour palette ─────────────────────────────────────────────────────────────
const BOOK_COLORS = [
  '#fb7185', // rose   – Book 1
  '#fbbf24', // amber  – Book 2
  '#a78bfa', // purple – Book 3
  '#38bdf8', // sky    – Book 4
  '#34d399', // emerald– Book 5
  '#f97316', // orange – Book 6
  '#818cf8', // indigo – Book 7
  '#2dd4bf', // teal   – Book 8
]

const AVG_ROMANCE_PAGES = 300

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, prefix = '', suffix = '', decimals = 1): string {
  if (!isFinite(n) || isNaN(n)) return '—'
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`
}

function sumValues(arr: DailyData[]) {
  return arr.reduce((s, d) => s + d.value, 0)
}

// Resolve "Apr 1" → "2026-04-01" (assumes year 2026 for named months)
function parseSwapDate(label: string): string {
  const d = new Date(`${label} 2026`)
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
}

// ── Small UI pieces ────────────────────────────────────────────────────────────
function TrendArrow({ curr, prev }: { curr: number; prev: number }) {
  if (!curr || !prev || prev === 0) return <span style={{ color: '#57534e' }}>—</span>
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const up = pct >= 0
  return (
    <span className="text-[12px] font-bold" style={{ color: up ? '#34d399' : '#fb7185' }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function BenchmarkBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: met ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
        color: met ? '#34d399' : '#fb7185',
      }}>
      {met ? '🟢' : '🔴'} {label}
    </span>
  )
}

function MetricCard({
  label, value, sub, benchmarkMet, benchmarkLabel, callout, color = '#e9a020', trend,
}: {
  label: string
  value: string
  sub?: string
  benchmarkMet?: boolean
  benchmarkLabel?: string
  callout?: string
  color?: string
  trend?: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-2" style={{ background: '#1c1917', border: '1px solid #292524' }}>
      <div className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: '#57534e' }}>
        {label}
      </div>
      <div className="flex items-end gap-2.5">
        <div className="font-serif text-[30px] leading-none" style={{ color }}>
          {value}
        </div>
        {trend && <div className="mb-0.5">{trend}</div>}
      </div>
      {sub && <div className="text-[11.5px]" style={{ color: '#78716c' }}>{sub}</div>}
      {benchmarkLabel !== undefined && benchmarkMet !== undefined && (
        <BenchmarkBadge met={benchmarkMet} label={benchmarkLabel} />
      )}
      {callout && (
        <div className="text-[12px] leading-relaxed pt-2.5" style={{ color: '#a8a29e', borderTop: '1px solid #1f1f1c' }}>
          {callout}
        </div>
      )}
    </div>
  )
}

// ── Read-through funnel ────────────────────────────────────────────────────────
function ReadThroughFunnel({
  books,
}: {
  books: { shortTitle: string; kenp: number; color: string }[]
}) {
  const base = books[0]?.kenp || 1
  return (
    <div className="space-y-4">
      {books.map((book, i) => {
        const pct = Math.round((book.kenp / base) * 100)
        const readThrough = i === 0 ? null : pct
        const rtColor = !readThrough ? '#a8a29e' : readThrough >= 40 ? '#34d399' : readThrough >= 25 ? '#fbbf24' : '#fb7185'
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${book.color}22`, color: book.color }}>
                  Book {i + 1}
                </span>
                <span className="text-[12.5px] font-semibold" style={{ color: '#d6d3d1' }}>
                  {book.shortTitle}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11.5px]" style={{ color: '#78716c' }}>
                  {book.kenp.toLocaleString()} reads
                </span>
                {readThrough !== null && (
                  <span className="font-bold text-[13px] w-12 text-right" style={{ color: rtColor }}>
                    {pct}%
                  </span>
                )}
                {readThrough === null && (
                  <span className="text-[11px] w-12 text-right" style={{ color: '#57534e' }}>base</span>
                )}
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#292524' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: book.color }}
              />
            </div>
            {i > 0 && i < books.length - 1 && (
              <div className="text-center mt-1.5 text-[11px]" style={{ color: '#44403c' }}>↓</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Campaign comparison bar ────────────────────────────────────────────────────
function CampaignCompareBar({
  leftLabel, leftValue, leftCount,
  rightLabel, rightValue, rightCount,
  unit = '',
  lowerIsBetter = false,
}: {
  leftLabel: string; leftValue: number; leftCount: number
  rightLabel: string; rightValue: number; rightCount: number
  unit?: string; lowerIsBetter?: boolean
}) {
  const max = Math.max(leftValue, rightValue, 0.01)
  const leftBetter = lowerIsBetter ? leftValue <= rightValue : leftValue >= rightValue
  return (
    <div className="space-y-3">
      {[
        { label: leftLabel, value: leftValue, count: leftCount, better: leftBetter },
        { label: rightLabel, value: rightValue, count: rightCount, better: !leftBetter },
      ].map((row, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px]" style={{ color: '#d6d3d1' }}>
              {row.label}
              <span className="ml-2 text-[10.5px]" style={{ color: '#57534e' }}>
                ({row.count} campaign{row.count !== 1 ? 's' : ''})
              </span>
            </span>
            <span className="font-mono font-bold text-[12.5px]"
              style={{ color: row.better ? '#34d399' : '#fb7185' }}>
              {fmt(row.value, '', unit)}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#292524' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${(row.value / max) * 100}%`,
                background: row.better ? '#34d399' : '#fb7185',
              }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MetricsPage() {
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([])
  const [rankLogs,    setRankLogs]    = useState<RankLog[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.json()).catch(() => ({})),
      fetch('/api/rank').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, rankData]) => {
      const analyses: Analysis[] = (analyzeData.analyses ?? []).map((a: any) => a.data ?? a)
      setAllAnalyses(analyses)
      setRankLogs(rankData.logs ?? [])
    })
  }, [])

  const analysis = allAnalyses[0] ?? null
  const kdp      = analysis?.kdp
  const meta     = analysis?.meta
  const ml       = analysis?.mailerLite

  // ── Merge daily KENP across all months ──────────────────────────────────────
  const allDailyKENP = useMemo(() => {
    const merged: DailyData[] = []
    allAnalyses.forEach(a => { if (a.kdp?.dailyKENP) merged.push(...a.kdp.dailyKENP) })
    return merged.sort((a, b) => a.date.localeCompare(b.date))
  }, [allAnalyses])

  // ── KENP velocity: 7-day rolling averages ────────────────────────────────────
  const { kenp7, kenpPrev7 } = useMemo(() => {
    if (allDailyKENP.length < 7) return { kenp7: 0, kenpPrev7: 0 }
    const last14 = allDailyKENP.slice(-14)
    const last7  = last14.slice(-7)
    const prev7  = last14.slice(0, 7)
    return {
      kenp7:     sumValues(last7) / 7,
      kenpPrev7: prev7.length === 7 ? sumValues(prev7) / 7 : 0,
    }
  }, [allDailyKENP])

  // ── Revenue per subscriber ───────────────────────────────────────────────────
  const revenuePerSub = useMemo(() => {
    if (!kdp?.totalRoyaltiesUSD || !ml?.listSize) return null
    return kdp.totalRoyaltiesUSD / ml.listSize
  }, [kdp, ml])

  // ── Cost per KENP read ───────────────────────────────────────────────────────
  const costPerKENP = useMemo(() => {
    if (!meta?.totalSpend || !kdp?.totalKENP) return null
    return meta.totalSpend / kdp.totalKENP
  }, [meta, kdp])

  // ── Books sorted by KENP (desc) for series ordering ─────────────────────────
  const booksForSeries = useMemo(() => {
    if (!kdp?.books?.length) return []
    return [...kdp.books]
      .filter(b => b.kenp > 0)
      .sort((a, b) => b.kenp - a.kenp)
      .map((b, i) => ({ ...b, color: BOOK_COLORS[i] || '#a8a29e' }))
  }, [kdp])

  // ── Read-through rate ────────────────────────────────────────────────────────
  const readThrough = useMemo(() => {
    if (booksForSeries.length < 2) return null
    return Math.round((booksForSeries[1].kenp / booksForSeries[0].kenp) * 100)
  }, [booksForSeries])

  // ── Per-book royalty & borrow rate ──────────────────────────────────────────
  const bookStats = useMemo(() => {
    if (!kdp?.books?.length) return []
    return [...kdp.books]
      .sort((a, b) => b.kenp - a.kenp)
      .map((b, i) => {
        const kuBorrows     = b.kenp / AVG_ROMANCE_PAGES
        const totalActivity = b.units + kuBorrows
        const borrowRate    = totalActivity > 0 ? (kuBorrows / totalActivity) * 100 : 0
        const kuEarnings    = b.kenp * 0.0045
        const unitEarnings  = b.royalties > 0 ? b.royalties - kuEarnings : 0
        return {
          ...b,
          color:       BOOK_COLORS[i] || '#a8a29e',
          borrowRate:  Math.round(borrowRate),
          kuEarnings:  Math.round(kuEarnings * 100) / 100,
          unitEarnings: Math.round(Math.max(unitEarnings, 0) * 100) / 100,
        }
      })
  }, [kdp])

  // ── Email: swap vs non-swap campaigns ───────────────────────────────────────
  const campaignSplit = useMemo(() => {
    if (!ml?.campaigns?.length) return null
    const swap    = ml.campaigns.filter(c => /swap/i.test(c.name))
    const nonSwap = ml.campaigns.filter(c => !/swap/i.test(c.name))
    const avg = (arr: typeof ml.campaigns, key: keyof typeof ml.campaigns[0]) =>
      arr.length ? arr.reduce((s, c) => s + (c[key] as number), 0) / arr.length : 0
    return {
      swap:        { count: swap.length,    avgOpen: avg(swap, 'openRate'),    avgClick: avg(swap, 'clickRate'),    avgUnsub: avg(swap, 'unsubscribes') },
      nonSwap:     { count: nonSwap.length, avgOpen: avg(nonSwap, 'openRate'), avgClick: avg(nonSwap, 'clickRate'), avgUnsub: avg(nonSwap, 'unsubscribes') },
    }
  }, [ml])

  // ── Best/worst campaign ──────────────────────────────────────────────────────
  const campaignRanked = useMemo(() => {
    if (!ml?.campaigns?.length) return null
    const sorted = [...ml.campaigns].sort((a, b) => b.openRate - a.openRate)
    return { best: sorted[0], worst: sorted[sorted.length - 1] }
  }, [ml])

  // ── Rank lift per swap ───────────────────────────────────────────────────────
  const swapDates = ['Apr 1', 'Apr 6', 'Apr 9', 'Apr 13', 'Apr 18', 'Apr 21', 'Apr 30']
    .map(parseSwapDate).filter(Boolean)

  const rankLifts = useMemo(() => {
    if (!rankLogs.length || !swapDates.length) return []
    return swapDates.flatMap(swapDate => {
      const sd = new Date(swapDate + 'T00:00:00')
      const before = rankLogs.filter(r => {
        const d = new Date(r.date)
        const diff = (sd.getTime() - d.getTime()) / 86400000
        return diff >= 1 && diff <= 7
      })
      const after = rankLogs.filter(r => {
        const d = new Date(r.date)
        const diff = (d.getTime() - sd.getTime()) / 86400000
        return diff >= 0 && diff <= 7
      })
      if (!before.length || !after.length) return []
      const avgBefore = before.reduce((s, r) => s + r.rank, 0) / before.length
      const avgAfter  = after.reduce((s, r) => s + r.rank, 0) / after.length
      const lift      = avgBefore - avgAfter // positive = rank improved (lower number)
      return [{ date: swapDate, lift: Math.round(lift) }]
    })
  }, [rankLogs]) // eslint-disable-line react-hooks/exhaustive-deps

  const avgRankLift = rankLifts.length
    ? Math.round(rankLifts.reduce((s, r) => s + r.lift, 0) / rankLifts.length)
    : null

  const noData = !kdp && !ml && !meta

  return (
    <DarkPage title="📊 Advanced Metrics" subtitle="Calculated from your real data · No guessing">
      {noData ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📊</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No data yet</div>
          <p className="text-sm mb-4">Upload your KDP, Meta, and MailerLite files to unlock these metrics</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Upload Files →</a>
        </div>
      ) : (
        <>
          {/* ─── 1. Sell-Through & Revenue Health ─────────────────────────── */}
          <DarkSectionHeader title="Sell-Through & Revenue Health" badge="Monthly" badgeColor="#fb7185" />

          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* KENP velocity */}
            <MetricCard
              label="KENP Read Velocity"
              color="#fbbf24"
              value={allDailyKENP.length >= 7 ? fmt(kenp7, '', '/day') : '—'}
              sub="7-day rolling average page reads"
              trend={kenpPrev7 > 0 ? <TrendArrow curr={kenp7} prev={kenpPrev7} /> : undefined}
              benchmarkMet={kenp7 > kenpPrev7}
              benchmarkLabel={kenp7 > kenpPrev7 ? 'Accelerating' : 'Slowing'}
              callout={
                allDailyKENP.length >= 14
                  ? `Your KU readers are ${kenp7 > kenpPrev7 ? 'reading faster than last week — great sign' : 'reading a little slower this week — normal after a launch spike'}.`
                  : 'Upload more months to see velocity trends.'
              }
            />

            {/* Revenue per subscriber */}
            <MetricCard
              label="Revenue per Subscriber"
              color="#34d399"
              value={revenuePerSub != null ? fmt(revenuePerSub, '$') : '—'}
              sub={`$${kdp?.totalRoyaltiesUSD} royalties ÷ ${ml?.listSize?.toLocaleString()} subscribers`}
              benchmarkMet={revenuePerSub != null && revenuePerSub >= 0.50}
              benchmarkLabel={revenuePerSub != null
                ? revenuePerSub >= 0.50 ? 'Above $0.50 benchmark' : 'Below $0.50 — grow list or royalties'
                : 'Need KDP + MailerLite data'}
              callout={revenuePerSub != null
                ? revenuePerSub >= 0.50
                  ? `Your list is working hard — each subscriber is worth $${fmt(revenuePerSub)} in royalties this month.`
                  : `Each subscriber is generating $${fmt(revenuePerSub)} this month. Growing your list or boosting KU reads will lift this number.`
                : undefined}
            />

            {/* Cost per KENP read */}
            <MetricCard
              label="Cost per KENP Read"
              color="#38bdf8"
              value={costPerKENP != null ? `$${fmt(costPerKENP, '', '', 4)}` : '—'}
              sub={`$${meta?.totalSpend} ad spend ÷ ${kdp?.totalKENP?.toLocaleString()} KENP reads`}
              benchmarkMet={costPerKENP != null && costPerKENP < 0.003}
              benchmarkLabel={costPerKENP != null
                ? costPerKENP < 0.003 ? 'Under $0.003 — efficient' : 'Over $0.003 — ads not driving KU reads'
                : 'Need Meta + KDP data'}
              callout={costPerKENP != null
                ? costPerKENP < 0.003
                  ? 'Your ads are cost-effectively driving KU reads alongside direct sales.'
                  : 'Your ad spend isn\'t converting to KU page reads as efficiently as it could — the hook might be attracting buyers more than borrows.'
                : undefined}
            />
          </div>

          {/* Per-book royalty + borrow rate */}
          {bookStats.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-8" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #292524' }}>
                <div className="text-[12.5px] font-semibold" style={{ color: '#d6d3d1' }}>
                  Revenue & Borrow Rate by Book
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: '#57534e' }}>
                  KU borrows estimated from KENP ÷ {AVG_ROMANCE_PAGES} avg pages
                </div>
              </div>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ background: '#161412' }}>
                    {['Book', 'Units Sold', 'KENP Reads', 'Est. KU Borrows', 'Borrow Rate', 'KU Earnings', 'Total Royalties'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.8px]"
                        style={{ color: '#57534e' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookStats.map((b, i) => {
                    const kuBorrows = Math.round(b.kenp / AVG_ROMANCE_PAGES)
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: `${b.color}22`, color: b.color }}>
                              Book {i + 1}
                            </span>
                            <span className="text-[12px]" style={{ color: '#d6d3d1' }}>{b.shortTitle}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>{b.units}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: b.color }}>{b.kenp.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: '#78716c' }}>~{kuBorrows}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#292524' }}>
                              <div className="h-full rounded-full" style={{ width: `${b.borrowRate}%`, background: b.color }} />
                            </div>
                            <span className="font-mono text-[11.5px]" style={{ color: '#d6d3d1' }}>{b.borrowRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: '#fbbf24' }}>
                          ${b.kuEarnings}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: '#34d399' }}>
                          {b.royalties > 0 ? `$${b.royalties}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── 2. Series Health ───────────────────────────────────────────── */}
          <DarkSectionHeader title="Series Health" badge="Read-Through" badgeColor="#a78bfa" />

          <div className="grid grid-cols-2 gap-5 mb-8">
            {/* Funnel */}
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <div className="text-[12.5px] font-semibold mb-1" style={{ color: '#d6d3d1' }}>
                Series Read-Through Funnel
              </div>
              <div className="text-[11px] mb-4" style={{ color: '#57534e' }}>
                Based on KENP reads · Benchmark: 40%+ is healthy for romance series
              </div>

              {booksForSeries.length >= 2 ? (
                <>
                  <ReadThroughFunnel books={booksForSeries} />
                  {readThrough !== null && (
                    <div className="mt-5 rounded-lg px-4 py-3 text-[12.5px] leading-snug"
                      style={{
                        background: readThrough >= 40 ? 'rgba(52,211,153,0.07)' : 'rgba(251,191,36,0.07)',
                        border: `1px solid ${readThrough >= 40 ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                      }}>
                      <span style={{ color: readThrough >= 40 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                        Book 1 → Book 2: {readThrough}% read-through
                      </span>
                      <span style={{ color: '#78716c' }}>
                        {' · '}
                        {readThrough >= 40
                          ? `${readThrough - 40}pp above the 40% series average — your hook is carrying readers forward.`
                          : `${40 - readThrough}pp below the 40% benchmark — a Book 1 ending that leaves readers wanting more can close this gap.`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[12px] py-8 text-center" style={{ color: '#57534e' }}>
                  Need at least 2 books with KENP reads to show read-through
                </div>
              )}
            </div>

            {/* Read-through explanation + quick tips */}
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <div className="text-[12.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>
                What moves read-through?
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: '🎣',
                    title: 'Book 1 ending hook',
                    body: 'The last 10% of Book 1 is your biggest conversion tool. A satisfying-but-wanting-more ending drives borrows of Book 2.',
                  },
                  {
                    icon: '📖',
                    title: 'Back matter links',
                    body: 'A "What happens next?" teaser chapter from Book 2 in your Book 1 back matter can lift read-through 15–25%.',
                  },
                  {
                    icon: '💌',
                    title: 'Email bridge',
                    body: 'A "Book 2 is live!" email to your list within 24 hours of launch captures your warmest readers first.',
                  },
                  {
                    icon: '💰',
                    title: 'Free days on Book 1',
                    body: 'A Kindle Countdown or free promo on Book 1 creates a wave of new readers who then borrow Book 2.',
                  },
                ].map(tip => (
                  <div key={tip.title} className="flex gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{tip.icon}</span>
                    <div>
                      <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: '#d6d3d1' }}>{tip.title}</div>
                      <div className="text-[11.5px] leading-relaxed" style={{ color: '#78716c' }}>{tip.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── 3. Email Performance ───────────────────────────────────────── */}
          <DarkSectionHeader title="Email Performance" badge="MailerLite" badgeColor="#34d399" />

          {!ml ? (
            <div className="rounded-xl p-6 mb-8 text-center" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <p className="text-[12.5px]" style={{ color: '#57534e' }}>
                Connect MailerLite in Settings to see email metrics
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 mb-8">
              {/* Swap vs non-swap */}
              <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
                <div className="text-[12.5px] font-semibold mb-1" style={{ color: '#d6d3d1' }}>
                  Swap Emails vs Your Own Emails
                </div>
                <div className="text-[11px] mb-5" style={{ color: '#57534e' }}>
                  Campaigns with "swap" in the name vs everything else
                </div>

                {campaignSplit && campaignSplit.swap.count > 0 && campaignSplit.nonSwap.count > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-[1px] mb-3" style={{ color: '#57534e' }}>
                        Open Rate
                      </div>
                      <CampaignCompareBar
                        leftLabel="Swap sends"    leftValue={campaignSplit.swap.avgOpen}    leftCount={campaignSplit.swap.count}
                        rightLabel="Your content" rightValue={campaignSplit.nonSwap.avgOpen} rightCount={campaignSplit.nonSwap.count}
                        unit="%"
                      />
                    </div>
                    <div>
                      <div className="text-[10.5px] font-bold uppercase tracking-[1px] mb-3" style={{ color: '#57534e' }}>
                        Unsubscribes per Campaign
                      </div>
                      <CampaignCompareBar
                        leftLabel="Swap sends"    leftValue={campaignSplit.swap.avgUnsub}    leftCount={campaignSplit.swap.count}
                        rightLabel="Your content" rightValue={campaignSplit.nonSwap.avgUnsub} rightCount={campaignSplit.nonSwap.count}
                        lowerIsBetter
                      />
                    </div>
                    {campaignSplit.swap.avgUnsub > campaignSplit.nonSwap.avgUnsub * 1.5 && (
                      <div className="rounded-lg px-4 py-3 text-[12px] leading-snug"
                        style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#a8a29e' }}>
                        Swap sends are causing{' '}
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                          {(campaignSplit.swap.avgUnsub / Math.max(campaignSplit.nonSwap.avgUnsub, 0.1)).toFixed(1)}×
                        </span>
                        {' '}more unsubscribes than your own emails — batch swaps together to limit the damage.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] py-6 text-center" style={{ color: '#57534e' }}>
                    {ml.campaigns.length === 0
                      ? 'No campaign data yet'
                      : 'Label swap campaigns with "Swap" in the name to see this comparison'}
                  </div>
                )}
              </div>

              {/* Best vs worst campaign */}
              <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
                <div className="text-[12.5px] font-semibold mb-1" style={{ color: '#d6d3d1' }}>
                  Highest vs Lowest Open Rate
                </div>
                <div className="text-[11px] mb-5" style={{ color: '#57534e' }}>
                  From your recent {ml.campaigns.length} campaigns
                </div>

                {campaignRanked ? (
                  <div className="space-y-4">
                    {[
                      { label: '🏆 Best performer', campaign: campaignRanked.best, color: '#34d399' },
                      { label: '📉 Lowest performer', campaign: campaignRanked.worst, color: '#fb7185' },
                    ].map(row => (
                      <div key={row.label} className="rounded-lg p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #292524' }}>
                        <div className="text-[10px] font-bold uppercase tracking-[1px] mb-1.5" style={{ color: '#57534e' }}>
                          {row.label}
                        </div>
                        <div className="text-[13px] font-semibold mb-2" style={{ color: '#d6d3d1' }}>
                          {row.campaign.name}
                        </div>
                        <div className="flex gap-4 text-[11.5px]">
                          <span>
                            <span style={{ color: row.color, fontWeight: 700 }}>{row.campaign.openRate}%</span>
                            <span style={{ color: '#57534e' }}> open</span>
                          </span>
                          <span>
                            <span style={{ color: '#a8a29e', fontWeight: 600 }}>{row.campaign.clickRate}%</span>
                            <span style={{ color: '#57534e' }}> click</span>
                          </span>
                          <span>
                            <span style={{ color: '#57534e' }}>{row.campaign.unsubscribes} unsubs</span>
                          </span>
                        </div>
                      </div>
                    ))}
                    {campaignRanked.best.name !== campaignRanked.worst.name && (
                      <div className="text-[12px] leading-relaxed pt-1" style={{ color: '#78716c' }}>
                        The subject line in "{campaignRanked.best.name}" outperformed "{campaignRanked.worst.name}"
                        by{' '}
                        <span style={{ color: '#34d399', fontWeight: 600 }}>
                          {(campaignRanked.best.openRate - campaignRanked.worst.openRate).toFixed(1)}pp
                        </span>
                        {' '}— reverse-engineer what made it work.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] py-6 text-center" style={{ color: '#57534e' }}>No campaign data</div>
                )}
              </div>
            </div>
          )}

          {/* ─── 4. Promo ROI ───────────────────────────────────────────────── */}
          <DarkSectionHeader title="Promo ROI — Rank Lift" badge="Rank Tracker" badgeColor="#38bdf8" />

          <div className="rounded-xl p-5 mb-8" style={{ background: '#1c1917', border: '1px solid #292524' }}>
            {rankLifts.length > 0 ? (
              <>
                <div className="flex items-start gap-6 mb-5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5" style={{ color: '#57534e' }}>
                      Average Rank Improvement After Swap Send
                    </div>
                    <div className="font-serif text-[36px] leading-none"
                      style={{ color: avgRankLift && avgRankLift > 0 ? '#34d399' : '#fb7185' }}>
                      {avgRankLift && avgRankLift > 0 ? `+${avgRankLift}` : avgRankLift ?? '—'}
                    </div>
                    <div className="text-[11.5px] mt-1" style={{ color: '#78716c' }}>
                      spots (lower BSR number = better rank)
                    </div>
                  </div>
                  <div className="flex-1 text-[12px] leading-relaxed self-center" style={{ color: '#a8a29e' }}>
                    Calculated from rank logs within 7 days before and after each swap date.
                    More rank log entries = more accurate lift estimates.
                  </div>
                </div>

                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #292524' }}>
                      {['Swap Date', 'Rank Lift'].map(h => (
                        <th key={h} className="text-left pb-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                          style={{ color: '#57534e' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankLifts.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="py-2.5 font-mono" style={{ color: '#a8a29e' }}>{r.date}</td>
                        <td className="py-2.5 font-mono font-bold"
                          style={{ color: r.lift > 0 ? '#34d399' : '#fb7185' }}>
                          {r.lift > 0 ? `+${r.lift}` : r.lift} spots
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-2xl mb-3">📈</div>
                <div className="text-[13px] font-semibold mb-1.5" style={{ color: '#d6d3d1' }}>
                  No rank lift data yet
                </div>
                <p className="text-[12px] max-w-sm mx-auto" style={{ color: '#57534e' }}>
                  Log your BSR before and after swap sends in the{' '}
                  <a href="/dashboard/rank" className="no-underline hover:underline" style={{ color: '#e9a020' }}>
                    Rank Tracker
                  </a>
                  {' '}to calculate your average rank improvement per promo.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </DarkPage>
  )
}
