'use client'
// app/dashboard/kdp/page.tsx
import { Suspense, useEffect, useState, useMemo } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { BarChart } from '@/components/ui'
import type { Analysis, DailyData, RoasLog } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: Date) { return d.toISOString().split('T')[0] }

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDisplayRange(start: string, end: string): string {
  if (!start || !end) return ''
  return `${formatShortDate(start)} – ${formatShortDate(end)}`
}

function sumValues(arr: DailyData[]) { return arr.reduce((s, d) => s + d.value, 0) }

type Preset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date()
  switch (preset) {
    case 'last7':
      return { start: fmt(new Date(today.getTime() - 6 * 86400000)), end: fmt(today) }
    case 'last30':
      return { start: fmt(new Date(today.getTime() - 29 * 86400000)), end: fmt(today) }
    case 'last90':
      return { start: fmt(new Date(today.getTime() - 89 * 86400000)), end: fmt(today) }
    case 'thisMonth':
      return { start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: fmt(today) }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last  = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: fmt(first), end: fmt(last) }
    }
    default:
      return { start: '', end: '' }
  }
}

// Shift a date range back by exactly its own length (for comparison period)
function getPreviousPeriod(start: string, end: string): { start: string; end: string } {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevEnd   = new Date(s.getTime() - 86400000)
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000)
  return { start: fmt(prevStart), end: fmt(prevEnd) }
}

// ── Date Range Picker ─────────────────────────────────────────────────────────
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'last7',     label: 'Last 7 days' },
  { key: 'last30',    label: 'Last 30 days' },
  { key: 'last90',    label: 'Last 90 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom',    label: 'Custom' },
]

function DateRangePicker({
  preset, onPreset, customStart, customEnd, onCustomStart, onCustomEnd,
}: {
  preset: Preset
  onPreset: (p: Preset) => void
  customStart: string
  customEnd: string
  onCustomStart: (v: string) => void
  onCustomEnd: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <span className="text-[10.5px] font-bold uppercase tracking-[1.2px] mr-1" style={{ color: '#57534e' }}>
        Range:
      </span>
      {PRESETS.map(p => (
        <button
          key={p.key}
          onClick={() => onPreset(p.key)}
          className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all duration-150"
          style={{
            background: preset === p.key ? '#e9a020' : 'rgba(255,255,255,0.05)',
            color:      preset === p.key ? '#0d1f35' : '#a8a29e',
            border:     `1px solid ${preset === p.key ? '#e9a020' : 'transparent'}`,
          }}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 mt-1 w-full ml-[62px]">
          <input
            type="date"
            value={customStart}
            onChange={e => onCustomStart(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[11.5px] font-mono"
            style={{ background: '#1c1917', border: '1px solid #44403c', color: '#d6d3d1' }}
          />
          <span style={{ color: '#57534e' }}>→</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => onCustomEnd(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[11.5px] font-mono"
            style={{ background: '#1c1917', border: '1px solid #44403c', color: '#d6d3d1' }}
          />
        </div>
      )}
    </div>
  )
}

// ── Daily Bars Chart (with date labels + comparison overlay) ──────────────────
function DailyBarsChart({
  data,
  compareData,
  roasLogs = [],
  color = '#fb7185',
  height = 72,
  showAdStrip = false,
  compareMode = false,
}: {
  data: DailyData[]
  compareData?: DailyData[]
  roasLogs?: RoasLog[]
  color?: string
  height?: number
  showAdStrip?: boolean
  compareMode?: boolean
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const spendByDate = useMemo(() => {
    const m = new Map<string, number>()
    roasLogs.forEach(r => {
      const date = new Date(r.date).toISOString().split('T')[0]
      m.set(date, (m.get(date) ?? 0) + r.spend)
    })
    return m
  }, [roasLogs])

  const n = data.length
  // Smart label spacing: aim for ~8-10 labels max
  const labelEvery = n <= 10 ? 1 : n <= 20 ? 2 : n <= 40 ? 5 : n <= 90 ? 7 : 10

  const max = Math.max(...data.map(d => d.value), compareData ? Math.max(...compareData.map(d => d.value)) : 0, 1)

  // Correlation (for ad strip mode)
  const withAds    = data.filter(d => (spendByDate.get(d.date) ?? 0) > 0)
  const withoutAds = data.filter(d => !((spendByDate.get(d.date) ?? 0) > 0))
  const avg = (arr: DailyData[]) => arr.length ? arr.reduce((s, d) => s + d.value, 0) / arr.length : 0
  const avgWith    = avg(withAds)
  const avgWithout = avg(withoutAds)
  const correlation = showAdStrip && withAds.length > 0 && avgWithout > 0
    ? Math.round(((avgWith - avgWithout) / avgWithout) * 100)
    : null

  if (n === 0) return <div className="text-[12px] py-6 text-center" style={{ color: '#57534e' }}>No data for this range</div>

  return (
    <div>
      <div className="relative">
        {/* Bars row */}
        <div className="flex items-end gap-[2px]" style={{ height }}>
          {data.map((d, i) => {
            const spend     = spendByDate.get(d.date) ?? 0
            const barPct    = Math.max((d.value / max) * 100, 3)
            const cmpValue  = compareData?.[i]?.value ?? 0
            const cmpPct    = Math.max((cmpValue / max) * 100, 0)
            const isHovered = hoveredIdx === i

            return (
              <div
                key={i}
                className="relative flex-1 flex items-end"
                style={{ height: '100%', minWidth: 2 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Comparison ghost bar (behind) */}
                {compareMode && compareData && cmpPct > 0 && (
                  <div
                    className="absolute w-full rounded-t-sm"
                    style={{
                      height: `${cmpPct}%`,
                      bottom: 0,
                      background: 'transparent',
                      border: `1px solid ${color}`,
                      borderBottom: 'none',
                      opacity: 0.35,
                      boxSizing: 'border-box',
                    }}
                  />
                )}

                {/* Current bar */}
                <div
                  className="w-full rounded-t-sm transition-opacity duration-100"
                  style={{
                    height: `${barPct}%`,
                    background: color,
                    opacity: isHovered ? 1 : 0.72,
                    position: 'relative',
                    zIndex: 1,
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-20 rounded-lg px-3 py-2.5 text-[11.5px]
                               whitespace-nowrap pointer-events-none shadow-xl"
                    style={{
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0c0a09',
                      border: '1px solid #44403c',
                      color: '#fafaf9',
                    }}
                  >
                    <div className="font-semibold mb-1" style={{ color: '#a8a29e' }}>
                      {formatShortDate(d.date)}
                    </div>
                    <div style={{ color }}>
                      {d.value.toLocaleString()} {showAdStrip ? `unit${d.value !== 1 ? 's' : ''} sold` : 'reads'}
                    </div>
                    {showAdStrip && spend > 0 && (
                      <div style={{ color: '#34d399' }}>${spend.toFixed(2)} ad spend</div>
                    )}
                    {showAdStrip && spend === 0 && (
                      <div style={{ color: '#57534e' }}>No ads running</div>
                    )}
                    {compareMode && compareData?.[i] && (
                      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #292524', color: '#78716c' }}>
                        Prev period: {compareData[i].value.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Ad spend strip */}
        {showAdStrip && (
          <div className="flex gap-[2px] mt-[3px]">
            {data.map((d, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: 3, minWidth: 2, background: (spendByDate.get(d.date) ?? 0) > 0 ? '#34d399' : 'transparent' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Date labels */}
      <div className="flex mt-1.5" style={{ overflow: 'hidden' }}>
        {data.map((d, i) => {
          const show = i === 0 || i === n - 1 || i % labelEvery === 0
          return (
            <div
              key={i}
              className="flex-1 text-center"
              style={{
                minWidth: 2,
                fontSize: '9.5px',
                color: show ? '#57534e' : 'transparent',
                transform: 'rotate(-35deg)',
                transformOrigin: 'center top',
                whiteSpace: 'nowrap',
                lineHeight: 1,
                paddingTop: 2,
              }}
            >
              {show ? formatShortDate(d.date) : ''}
            </div>
          )
        })}
      </div>

      {/* Ad correlation insight */}
      {showAdStrip && correlation !== null && (
        <div
          className="mt-4 rounded-lg px-4 py-3 text-[12.5px] leading-snug"
          style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}
        >
          <span style={{ color: '#34d399' }}>
            Days with ads:{' '}
            <strong>{correlation >= 0 ? '+' : ''}{correlation}% {correlation >= 0 ? 'higher' : 'lower'} sales</strong>
          </span>
          <span style={{ color: '#78716c' }}> than days without ads</span>
          {withAds.length > 0 && withoutAds.length > 0 && (
            <span style={{ color: '#57534e' }}> ({avgWith.toFixed(1)} avg vs {avgWithout.toFixed(1)} avg)</span>
          )}
        </div>
      )}

      {/* Legends */}
      <div className="flex items-center gap-4 mt-3 text-[10.5px]" style={{ color: '#78716c' }}>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2, opacity: 0.8 }} />
          {showAdStrip ? 'Units sold' : 'KENP reads'}
        </span>
        {showAdStrip && (
          <>
            <span style={{ color: '#44403c' }}>|</span>
            <span className="flex items-center gap-1.5">
              <span style={{ display: 'inline-block', width: 14, height: 3, background: '#34d399', borderRadius: 2 }} />
              Ad spend active
            </span>
          </>
        )}
        {compareMode && (
          <>
            <span style={{ color: '#44403c' }}>|</span>
            <span className="flex items-center gap-1.5">
              <span style={{
                display: 'inline-block', width: 10, height: 10,
                border: `1.5px solid ${color}`, borderRadius: 2, opacity: 0.4,
              }} />
              Previous period
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function KDPPage() {
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([])
  const [roasLogs,    setRoasLogs]    = useState<RoasLog[]>([])
  const [preset,      setPreset]      = useState<Preset>('thisMonth')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [compareMode, setCompareMode] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze').then(r => r.json()).catch(() => ({})),
      fetch('/api/roas').then(r => r.json()).catch(() => ({ logs: [] })),
    ]).then(([analyzeData, roasData]) => {
      const analyses: Analysis[] = (analyzeData.analyses ?? []).map(
        (a: any) => a.data ?? a
      )
      setAllAnalyses(analyses)
      setRoasLogs(roasData.logs ?? [])
    })
  }, [])

  // Merge daily data from all analyses, sorted chronologically
  const allDailyUnits = useMemo(() => {
    const merged: DailyData[] = []
    allAnalyses.forEach(a => { if (a.kdp?.dailyUnits) merged.push(...a.kdp.dailyUnits) })
    return merged.sort((a, b) => a.date.localeCompare(b.date))
  }, [allAnalyses])

  const allDailyKENP = useMemo(() => {
    const merged: DailyData[] = []
    allAnalyses.forEach(a => { if (a.kdp?.dailyKENP) merged.push(...a.kdp.dailyKENP) })
    return merged.sort((a, b) => a.date.localeCompare(b.date))
  }, [allAnalyses])

  // Resolve active date range
  const range = useMemo((): { start: string; end: string } => {
    if (preset === 'custom') return { start: customStart, end: customEnd }
    return getPresetRange(preset)
  }, [preset, customStart, customEnd])

  const filteredUnits = useMemo(() =>
    range.start && range.end
      ? allDailyUnits.filter(d => d.date >= range.start && d.date <= range.end)
      : allDailyUnits,
  [allDailyUnits, range])

  const filteredKENP = useMemo(() =>
    range.start && range.end
      ? allDailyKENP.filter(d => d.date >= range.start && d.date <= range.end)
      : allDailyKENP,
  [allDailyKENP, range])

  // Previous period for comparison
  const prevPeriod = useMemo(() => {
    if (!range.start || !range.end) return null
    return getPreviousPeriod(range.start, range.end)
  }, [range])

  const compareUnits = useMemo(() => {
    if (!compareMode || !prevPeriod) return undefined
    return allDailyUnits.filter(d => d.date >= prevPeriod.start && d.date <= prevPeriod.end)
  }, [compareMode, allDailyUnits, prevPeriod])

  const compareKENP = useMemo(() => {
    if (!compareMode || !prevPeriod) return undefined
    return allDailyKENP.filter(d => d.date >= prevPeriod.start && d.date <= prevPeriod.end)
  }, [compareMode, allDailyKENP, prevPeriod])

  // Filtered totals for KPI strip
  const filteredTotalUnits = useMemo(() => sumValues(filteredUnits), [filteredUnits])
  const filteredTotalKENP  = useMemo(() => sumValues(filteredKENP),  [filteredKENP])

  // Use latest analysis for per-book data and royalties
  const analysis = allAnalyses[0] ?? null
  const kdp   = analysis?.kdp
  const coach = (analysis as any)?.kdpCoach

  const handlePreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
  }

  return (
    <DarkPage title="📚 KDP — Sales & Royalties" subtitle="Kindle Direct Publishing · Units sold, KENP reads, royalties">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {!kdp ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📚</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No KDP data yet</div>
          <p className="text-sm mb-4">Upload your KDP Excel report to see your analysis</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>
            Upload Files →
          </a>
        </div>
      ) : (
        <>
          <DarkKPIStrip cols={5} items={[
            { label: 'Total Royalties',  value: `$${kdp.totalRoyaltiesUSD}`,         sub: 'USD this month',         color: '#fb7185' },
            { label: 'Units (range)',    value: filteredTotalUnits.toLocaleString(),   sub: 'eBooks + paperback',     color: '#38bdf8' },
            { label: 'KENP (range)',     value: filteredTotalKENP.toLocaleString(),    sub: `~$${Math.round(filteredTotalKENP * 0.0045)} est. KU earnings`, color: '#fbbf24' },
            { label: 'MOLR Units',       value: kdp.books.find(b => b.asin === 'B0GSC2RTF8')?.units || 0,  sub: 'My Off-Limits Roommate',  color: '#34d399' },
            { label: 'FDMBP Units',      value: kdp.books.find(b => b.asin === 'B0GQD4J6VT')?.units || 0,  sub: 'Fake Dating Billionaire', color: '#a78bfa' },
          ]} />

          {coach && <DarkCoachBox color="#fbbf24">{coach}</DarkCoachBox>}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>Units by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.units, formatted: `${b.units}` }))}
                color="#fb7185"
              />
            </div>
            <div className="rounded-xl p-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#d6d3d1' }}>KENP by Book</h3>
              <BarChart
                items={kdp.books.map(b => ({ label: b.shortTitle, value: b.kenp, formatted: b.kenp.toLocaleString() }))}
                color="#fbbf24"
              />
            </div>
          </div>

          {/* Date range picker */}
          <DateRangePicker
            preset={preset}
            onPreset={handlePreset}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={setCustomStart}
            onCustomEnd={setCustomEnd}
          />

          {/* Range label + compare toggle */}
          <div className="flex items-center justify-between mb-4">
            {range.start && range.end ? (
              <div className="text-[11.5px]" style={{ color: '#78716c' }}>
                Viewing:{' '}
                <span style={{ color: '#d6d3d1', fontWeight: 600 }}>
                  {formatDisplayRange(range.start, range.end)}
                </span>
                {filteredUnits.length > 0 && (
                  <span style={{ color: '#57534e' }}>
                    {' · '}{filteredUnits.length} days · {filteredTotalUnits.toLocaleString()} units
                  </span>
                )}
              </div>
            ) : <div />}

            <button
              onClick={() => setCompareMode(m => !m)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all duration-150"
              style={{
                background: compareMode ? 'rgba(233,160,32,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${compareMode ? 'rgba(233,160,32,0.4)' : 'transparent'}`,
                color: compareMode ? '#e9a020' : '#78716c',
              }}
            >
              <span>{compareMode ? '◉' : '○'}</span>
              Compare to previous period
            </button>
          </div>

          {/* Daily Units chart */}
          <div className="rounded-xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[13.5px] font-semibold" style={{ color: '#d6d3d1' }}>Daily Units Sold</h3>
              {compareMode && prevPeriod && (
                <span className="text-[10.5px]" style={{ color: '#57534e' }}>
                  vs {formatDisplayRange(prevPeriod.start, prevPeriod.end)}
                </span>
              )}
            </div>
            <p className="text-[11px] mb-4" style={{ color: '#a8a29e' }}>
              {filteredUnits.length > 0 ? (
                <>
                  Peak day:{' '}
                  {[...filteredUnits].sort((a, b) => b.value - a.value)[0]?.date &&
                    formatShortDate([...filteredUnits].sort((a, b) => b.value - a.value)[0].date)}{' '}—{' '}
                  {[...filteredUnits].sort((a, b) => b.value - a.value)[0]?.value} units
                  {' · '}Hover any bar for details
                </>
              ) : 'No data for this date range'}
            </p>
            <DailyBarsChart
              data={filteredUnits}
              compareData={compareUnits}
              roasLogs={roasLogs}
              color="#fb7185"
              height={72}
              showAdStrip
              compareMode={compareMode}
            />
          </div>

          {/* Daily KENP chart */}
          {filteredKENP.length > 0 && (
            <div className="rounded-xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[13.5px] font-semibold" style={{ color: '#d6d3d1' }}>Daily KENP Reads</h3>
                {compareMode && prevPeriod && (
                  <span className="text-[10.5px]" style={{ color: '#57534e' }}>
                    vs {formatDisplayRange(prevPeriod.start, prevPeriod.end)}
                  </span>
                )}
              </div>
              <p className="text-[11px] mb-4" style={{ color: '#a8a29e' }}>
                Kindle Unlimited page reads · est. $0.0045/page
              </p>
              <DailyBarsChart
                data={filteredKENP}
                compareData={compareKENP}
                color="#fbbf24"
                height={64}
                compareMode={compareMode}
              />
            </div>
          )}
        </>
      )}
    </DarkPage>
  )
}
