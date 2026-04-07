'use client'
// app/dashboard/meta/page.tsx
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import ChartJS from 'chart.js/auto'
import { ChartLegend } from '@/components/ChartLegend'
import { CHART_COLORS, BASE_CHART_OPTIONS, barDataset } from '@/lib/chartConfig'
import { DarkPage, DarkKPIStrip, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { InsightCallouts } from '@/components/InsightCallout'
import { GoalSection } from '@/components/GoalSection'
import { SortablePage } from '@/components/SortablePage'
import { fmtPct, fmtCurrency } from '@/lib/utils'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis, MetaAd } from '@/types'


// ── Date range helpers ────────────────────────────────────────────────────────
function fmt(d: Date) { return d.toISOString().split('T')[0] }

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayRange(start: string, end: string): string {
  if (!start || !end) return ''
  return `${formatShortDate(start)} \u2013 ${formatShortDate(end)}`
}

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
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all duration-150"
            style={{
              background: preset === p.key ? '#E9A020' : '#FFF8F0',
              color:      preset === p.key ? 'white' : '#1E2D3D',
              border:     `0.5px solid ${preset === p.key ? '#E9A020' : '#EEEBE6'}`,
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
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-[Plus_Jakarta_Sans]"
            />
            <span style={{ color: '#6B7280' }}>→</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => onCustomEnd(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-[Plus_Jakarta_Sans]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Column definitions ────────────────────────────────────────────────────────
type ColKey =
  | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc'
  | 'uniqueClicks' | 'uniqueCtr' | 'frequency' | 'reach'
  | 'results' | 'costPerResult' | 'status'

const ALL_COLUMNS: { key: ColKey; label: string; defaultOn: boolean; sortable: boolean }[] = [
  { key: 'spend',         label: 'Spend',           defaultOn: true,  sortable: true  },
  { key: 'impressions',   label: 'Impressions',     defaultOn: false, sortable: true  },
  { key: 'clicks',        label: 'Clicks',          defaultOn: true,  sortable: true  },
  { key: 'ctr',           label: 'CTR',             defaultOn: true,  sortable: true  },
  { key: 'cpc',           label: 'CPC',             defaultOn: true,  sortable: true  },
  { key: 'uniqueClicks',  label: 'Unique Clicks',   defaultOn: false, sortable: true  },
  { key: 'uniqueCtr',     label: 'Unique CTR',      defaultOn: false, sortable: true  },
  { key: 'frequency',     label: 'Frequency',       defaultOn: false, sortable: true  },
  { key: 'reach',         label: 'Reach',           defaultOn: false, sortable: true  },
  { key: 'results',       label: 'Results',         defaultOn: false, sortable: true  },
  { key: 'costPerResult', label: 'Cost per Result', defaultOn: false, sortable: true  },
  { key: 'status',        label: 'Status',          defaultOn: true,  sortable: false },
]

const DEFAULT_COLS = new Set<ColKey>(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.key))

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<MetaAd['status'], { bg: string; text: string; label: string }> = {
  SCALE:    { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', label: 'Scale it' },
  WATCH:    { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: 'Keep watching' },
  CUT:      { bg: 'rgba(251,113,133,0.12)', text: '#fb7185', label: 'Cut this' },
  DELETE:   { bg: 'rgba(251,113,133,0.15)', text: '#fb7185', label: 'Delete' },
  LOW_DATA: { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', label: 'Need more data' },
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc'

function getSortValue(ad: MetaAd, key: ColKey): number {
  switch (key) {
    case 'spend': return ad.spend
    case 'impressions': return ad.impressions
    case 'clicks': return ad.clicks
    case 'ctr': return ad.ctr
    case 'cpc': return ad.cpc
    case 'reach': return ad.reach
    case 'uniqueClicks': return ad.uniqueClicks ?? -1
    case 'uniqueCtr': return ad.uniqueCtr ?? -1
    case 'frequency': return ad.frequency ?? -1
    case 'results': return ad.results ?? -1
    case 'costPerResult': return ad.costPerResult ?? -1
    default: return 0
  }
}


// ── Rescue Panel ──────────────────────────────────────────────────────────────
function RescuePanel({ ad }: { ad: MetaAd }) {
  const isZeroClicks = ad.clicks === 0
  const problemText  = isZeroClicks
    ? `zero clicks despite ${fmtCurrency(ad.spend)} in spend`
    : `a CTR of just ${fmtPct(ad.ctr)} — well below the 1% threshold`

  const steps = [
    {
      num: '1',
      title: 'See what\'s actually getting clicks right now',
      body: 'The Facebook Ad Library shows you every live ad. Search for books in your genre and look for ads that have been running 30+ days — longevity means they\'re working. Save screenshots of the top 3.',
      link: { label: 'Open Ad Library →', href: 'https://www.facebook.com/ads/library' },
    },
    {
      num: '2',
      title: 'Upload those screenshots for analysis',
      body: 'Drop competitor screenshots into the Upload page. Your AI coach will break down what\'s working in your genre — hook type, image style, emotional pull — that you might not be doing yet.',
      link: { label: 'Upload competitor ads →', href: '/dashboard?upload=1' },
    },
    {
      num: '3',
      title: 'Come back with 2 new hook variations',
      body: 'Most winning book ads lead with a strong emotional hook specific to your genre\'s tropes. Try a different angle than what you\'re running — a fresh hook often unlocks clicks overnight.',
      link: null,
    },
  ]

  const resources = [
    { label: 'Reedsy Book Marketing Experts',     href: 'https://reedsy.com/experts/book-marketing' },
    { label: 'Kindlepreneur Facebook Ads Guide',   href: 'https://kindlepreneur.com/facebook-ads-for-books/' },
    { label: 'Facebook Ad Library',               href: 'https://www.facebook.com/ads/library' },
  ]

  return (
    <div className="rounded-xl p-5 mt-4" style={{
      background: 'rgba(251,113,133,0.04)',
      border: '1px solid rgba(251,113,133,0.18)',
    }}>
      <div className="flex items-start gap-3 mb-5">
        <span className="text-xl flex-shrink-0 mt-0.5">💛</span>
        <div>
          <div className="font-semibold text-[13.5px] mb-1.5" style={{ color: '#1E2D3D' }}>
            {ad.name} isn&apos;t getting traction yet — that&apos;s fixable
          </div>
          <p className="text-[12.5px] leading-relaxed m-0" style={{ color: '#6B7280' }}>
            This ad has {problemText}. That&apos;s not a failure — it&apos;s data.
            Readers scroll fast. Most ads need 2–3 creative iterations to find their hook.
            Here&apos;s a clear path forward.
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: '#6B7280' }}>
          Guided next steps
        </div>
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.num} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                style={{ background: 'rgba(233,160,32,0.15)', color: '#e9a020' }}>
                {step.num}
              </div>
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>{step.title}</div>
                <p className="text-[12px] leading-relaxed m-0 mb-1.5" style={{ color: '#6B7280' }}>{step.body}</p>
                {step.link && (
                  <a href={step.link.href}
                    target={step.link.href.startsWith('http') ? '_blank' : undefined}
                    rel={step.link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-[11.5px] font-semibold no-underline hover:underline"
                    style={{ color: '#e9a020' }}>
                    {step.link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg px-4 py-3" style={{ background: '#F9F9F9', border: '1px solid #EEEBE6' }}>
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-2" style={{ color: '#6B7280' }}>
          Still stuck? Real humans who can help
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {resources.map(r => (
            <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer"
              className="text-[11.5px] no-underline hover:underline" style={{ color: '#6B7280' }}>
              {r.label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── CTR bar ───────────────────────────────────────────────────────────────────
function CTRBar({ ctr, maxCTR }: { ctr: number; maxCTR: number }) {
  const barColor = ctr >= 15 ? '#34d399' : ctr >= 8 ? '#fbbf24' : '#fb7185'
  const pct      = maxCTR > 0 ? (ctr / maxCTR) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="font-mono font-bold text-[16px] leading-none" style={{ color: barColor }}>
          {ctr.toFixed(1)}%
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden flex-1 min-w-[48px]" style={{ background: '#EEEBE6' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  )
}

// ── Missing data cell with info icon ─────────────────────────────────────────
function MissingCell({ colName }: { colName: string }) {
  return (
    <span
      title={`Add '${colName}' to your Ads Manager export columns to see this data.`}
      className="inline-flex items-center gap-1 text-[13px] cursor-help"
      style={{ color: '#6B7280' }}
    >
      —
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-50">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

// ── Sortable column header ───────────────────────────────────────────────────
function SortHeader({
  label,
  sortable,
  active,
  dir,
  onClick,
}: {
  label: string
  sortable: boolean
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  if (!sortable) {
    return (
      <span className="text-[11px] font-bold tracking-[0.5px]" style={{ color: '#6B7280' }}>
        {label}
      </span>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-bold tracking-[0.5px] bg-transparent border-none cursor-pointer"
      style={{ color: active ? '#1E2D3D' : '#6B7280', padding: 0 }}
    >
      {label}
      <span className="text-[9px] leading-none" style={{ color: active ? '#e9a020' : '#D6D3D1' }}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  )
}

// ── Column picker panel ───────────────────────────────────────────────────────
function ColumnPicker({
  activeCols,
  onToggle,
  onReset,
  onClose,
}: {
  activeCols: Set<ColKey>
  onToggle: (key: ColKey) => void
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute right-0 top-9 z-20 rounded-xl p-4 shadow-2xl"
      style={{
        background: 'white',
        border: '1px solid #E7E5E4',
        minWidth: 210,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] mb-3" style={{ color: '#6B7280' }}>
        Show columns
      </div>
      {ALL_COLUMNS.map(col => {
        const isActive = activeCols.has(col.key)
        return (
          <label key={col.key} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => onToggle(col.key)}
              className="w-3.5 h-3.5 rounded"
              style={{ accentColor: '#e9a020' }}
            />
            <span className="text-[12.5px]" style={{ color: isActive ? '#1E2D3D' : '#6B7280' }}>
              {col.label}
            </span>
          </label>
        )
      })}
      <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid #EEEBE6' }}>
        <button
          onClick={onReset}
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: '#F5F5F4', color: '#6B7280' }}
        >
          Reset defaults
        </button>
        <button
          onClick={onClose}
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: 'rgba(233,160,32,0.1)', color: '#e9a020' }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Meta Performance Chart (uses lib/chartConfig) ────────────────────────────
// Shows spend per ad as bars (coral) + CTR as a line overlay (teal, secondary y-axis)
function MetaPerformanceChart({ ads }: { ads: import('@/types').MetaAd[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!canvasRef.current || ads.length === 0) return
    const ctx2d = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    const labels = ads.map(a => a.name.length > 20 ? a.name.substring(0, 20) + '…' : a.name)
    const spends = ads.map(a => a.spend)
    const ctrs   = ads.map(a => a.ctr)

    chartRef.current = new ChartJS(ctx2d, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { ...barDataset(spends, CHART_COLORS.coral, 'Spend ($)'), yAxisID: 'y' },
          {
            type: 'line' as any,
            label: 'CTR (%)',
            data: ctrs,
            borderColor: CHART_COLORS.teal,
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: CHART_COLORS.teal,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: BASE_CHART_OPTIONS.animation,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...BASE_CHART_OPTIONS.plugins.tooltip,
            callbacks: {
              title: (items: any[]) => ads[items[0]?.dataIndex]?.name ?? '',
              label: (item: any) =>
                item.datasetIndex === 0
                  ? ` Spend: ${fmtCurrency(item.raw)}`
                  : ` CTR: ${fmtPct(item.raw)}`,
            },
          },
        },
        scales: {
          x: {
            ...BASE_CHART_OPTIONS.scales.x,
            ticks: { ...BASE_CHART_OPTIONS.scales.x.ticks, maxRotation: 30 },
          },
          y: {
            ...BASE_CHART_OPTIONS.scales.y,
            position: 'left' as const,
            title: { display: true, text: 'Spend ($)', font: { size: 9 }, color: 'rgba(30,45,61,0.4)' },
          },
          y2: {
            ...BASE_CHART_OPTIONS.scales.y,
            position: 'right' as const,
            grid: { display: false },
            title: { display: true, text: 'CTR (%)', font: { size: 9 }, color: 'rgba(30,45,61,0.4)' },
          },
        },
      } as any,
    })
    // Native browser tooltip: update canvas.title to full ad name on hover
    const canvas = canvasRef.current
    function onMouseMove(e: MouseEvent) {
      const chart = chartRef.current
      if (!chart || !canvas) return
      const els = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false)
      canvas.title = els.length > 0 ? (ads[els[0].index]?.name ?? '') : ''
    }
    canvas.addEventListener('mousemove', onMouseMove)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      chartRef.current?.destroy()
    }
  }, [ads])

  if (ads.length === 0) return null

  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
      <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: '#1E2D3D' }}>Ad Performance Overview</h3>
      <div style={{ minHeight: 220, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      <ChartLegend items={[
        { color: CHART_COLORS.coral, label: 'Spend',  type: 'square' },
        { color: CHART_COLORS.teal,  label: 'CTR (%)', type: 'line'  },
      ]} />
    </div>
  )
}

// ── Build a live insight from real Meta numbers ───────────────────────────────
// Always derived from live data so stale cached metaCoach never shows.
function buildMetaCoach(meta: NonNullable<Analysis['meta']>): string {
  const best = meta.bestAd
  const totalAds = meta.ads.length
  const activeAds = meta.ads.filter(a => a.status === 'SCALE' || a.status === 'WATCH').length

  const s1 = `You spent $${meta.totalSpend} across ${totalAds} ad${totalAds !== 1 ? 's' : ''} this period, generating ${meta.totalClicks.toLocaleString()} clicks at an average ${meta.avgCTR}% CTR and $${meta.avgCPC} CPC.`

  let s2 = ''
  if (best && best.ctr >= 1.5) {
    s2 = `Your best ad ("${best.name}") is running at ${best.ctr}% CTR — above benchmark. Go to Meta Ads Manager and increase the daily budget on this ad by 20% to scale what's working.`
  } else if (best && best.ctr > 0) {
    s2 = `Your best ad ("${best.name}") is at ${best.ctr}% CTR — below the 1.5% benchmark. Go to Meta Ads Manager, duplicate this ad, and test a new visual or opening line to push CTR above 1.5%.`
  } else {
    s2 = `None of your ads have recorded clicks yet. Go to Meta Ads Manager and confirm your campaigns are active and the pixel is firing correctly.`
  }

  const cutAds = meta.ads.filter(a => a.status === 'CUT' || a.status === 'DELETE')
  let s3 = ''
  if (cutAds.length > 0) {
    s3 = `Pause the ${cutAds.length} underperforming ad${cutAds.length !== 1 ? 's' : ''} flagged for cutting — consolidating spend into your ${activeAds} active ad${activeAds !== 1 ? 's' : ''} will lower your average CPC immediately.`
  } else if (activeAds > 0) {
    s3 = `With ${activeAds} active ad${activeAds !== 1 ? 's' : ''} running, monitor daily — if CPC climbs above $${(meta.avgCPC * 1.5).toFixed(2)}, pause and refresh the creative.`
  }

  return [s1, s2, s3].filter(Boolean).join(' ')
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MetaPage() {
  const [coachTitle]               = useState(() => getCoachTitle())
  const [analysis,   setAnalysis]  = useState<Analysis | null>(null)
  const [goals,      setGoals]     = useState<Record<string, number>>({})
  const [activeCols, setActiveCols] = useState<Set<ColKey>>(DEFAULT_COLS)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sortKey,    setSortKey]   = useState<ColKey | null>(null)
  const [sortDir,    setSortDir]   = useState<SortDir>('desc')
  const [loading,    setLoading]   = useState(true)
  const [syncing,    setSyncing]   = useState(false)
  const [dateLoading, setDateLoading] = useState(false)
  const [metaLastSync, setMetaLastSync] = useState<string | null>(null)
  const [metaOverride, setMetaOverride] = useState<import('@/types').MetaData | null>(null)

  // Date range state
  const [preset,      setPreset]      = useState<Preset>('last30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [activeRange, setActiveRange] = useState<{ start: string; end: string }>(() => getPresetRange('last30'))

  const pickerRef  = useRef<HTMLDivElement>(null)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadMetaData() {
    return fetch('/api/analyze')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (d.analysis) setAnalysis(d.analysis as Analysis)
        if (d.metaLastSync) setMetaLastSync(d.metaLastSync)
      })
      .catch(() => {})
  }

  const fetchDateRange = useCallback((start: string, end: string) => {
    if (!start || !end) return
    setDateLoading(true)
    fetch(`/api/meta/data?startDate=${start}&endDate=${end}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setMetaOverride(d.data ?? null)
      })
      .catch(() => {})
      .finally(() => setDateLoading(false))
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setAnalysis(prev => prev ? { ...prev, meta: data.data } : { meta: data.data } as any)
          setMetaOverride(null) // clear override so cached data shows fresh sync
        }
        setMetaLastSync(new Date().toISOString())
        window.dispatchEvent(new Event('meta:synced'))
      }
    } catch { /* ignore */ }
    setSyncing(false)
  }

  useEffect(() => {
    Promise.all([
      loadMetaData(),
      fetch('/api/prefs')
        .then(r => r.json())
        .then(d => {
          const saved = d.columnPrefs?.meta
          if (Array.isArray(saved) && saved.length > 0) {
            setActiveCols(new Set<ColKey>(saved as ColKey[]))
          }
          if (d.goals) setGoals(d.goals)
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false))

    // Refresh data when a sync completes from the ConnectionStatus popover
    function onSynced() { loadMetaData() }
    window.addEventListener('meta:synced', onSynced)
    return () => window.removeEventListener('meta:synced', onSynced)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') {
      const range = getPresetRange(p)
      setActiveRange(range)
      fetchDateRange(range.start, range.end)
    }
  }

  function handleCustomStart(v: string) {
    setCustomStart(v)
    if (v && customEnd) {
      setActiveRange({ start: v, end: customEnd })
      fetchDateRange(v, customEnd)
    }
  }

  function handleCustomEnd(v: string) {
    setCustomEnd(v)
    if (customStart && v) {
      setActiveRange({ start: customStart, end: v })
      fetchDateRange(customStart, v)
    }
  }

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  function toggleCol(key: ColKey) {
    setActiveCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      persistCols(next)
      return next
    })
  }

  function resetCols() {
    setActiveCols(DEFAULT_COLS)
    persistCols(DEFAULT_COLS)
  }

  function persistCols(cols: Set<ColKey>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'meta', columns: Array.from(cols) }),
      }).catch(() => {})
    }, 600)
  }

  function handleSort(key: ColKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const meta       = metaOverride ?? analysis?.meta
  const rescueAds  = meta?.ads.filter(ad => ad.clicks === 0 || ad.ctr < 1) ?? []
  const maxCTR     = meta ? Math.max(...meta.ads.map(a => a.ctr), 1) : 1
  const activeColDefs = ALL_COLUMNS.filter(c => activeCols.has(c.key))

  // Sort ads
  const sortedAds = meta ? [...meta.ads].sort((a, b) => {
    if (!sortKey) return 0
    const va = getSortValue(a, sortKey)
    const vb = getSortValue(b, sortKey)
    return sortDir === 'desc' ? vb - va : va - vb
  }) : []

  // Goal comparison for KPI strip
  const ctrGoal = goals.meta_ctr
  const cpcGoal = goals.meta_cpc

  function renderCell(ad: MetaAd, key: ColKey) {
    switch (key) {
      case 'spend':
        return <span className="font-mono text-[14px]" style={{ color: '#6B7280' }}>{fmtCurrency(ad.spend)}</span>
      case 'impressions':
        return <span className="font-mono text-[14px]" style={{ color: '#1E2D3D' }}>{ad.impressions.toLocaleString()}</span>
      case 'clicks':
        return <span className="font-mono font-bold text-[16px]" style={{ color: ad.clicks === 0 ? '#fb7185' : '#34d399' }}>{ad.clicks}</span>
      case 'ctr':
        return <CTRBar ctr={ad.ctr} maxCTR={maxCTR} />
      case 'cpc':
        return <span className="font-mono text-[14px]" style={{ color: '#6B7280' }}>{ad.cpc > 0 ? fmtCurrency(ad.cpc) : '—'}</span>
      case 'reach':
        return <span className="font-mono text-[14px]" style={{ color: '#1E2D3D' }}>{ad.reach > 0 ? ad.reach.toLocaleString() : '—'}</span>
      case 'uniqueClicks':
        return ad.uniqueClicks != null
          ? <span className="font-mono text-[14px]" style={{ color: '#1E2D3D' }}>{ad.uniqueClicks.toLocaleString()}</span>
          : <MissingCell colName="Unique clicks" />
      case 'uniqueCtr':
        return ad.uniqueCtr != null
          ? <span className="font-mono text-[14px]" style={{ color: '#6B7280' }}>{fmtPct(ad.uniqueCtr)}</span>
          : <MissingCell colName="Unique CTR" />
      case 'frequency':
        return ad.frequency != null
          ? <span className="font-mono text-[14px]" style={{ color: '#6B7280' }}>{ad.frequency.toFixed(1)}×</span>
          : <MissingCell colName="Frequency" />
      case 'results':
        return ad.results != null
          ? <span className="font-mono text-[14px]" style={{ color: '#34d399' }}>{ad.results.toLocaleString()}</span>
          : <MissingCell colName="Results" />
      case 'costPerResult':
        return ad.costPerResult != null
          ? <span className="font-mono text-[14px]" style={{ color: '#6B7280' }}>${ad.costPerResult.toFixed(2)}</span>
          : <MissingCell colName="Cost per result" />
      case 'status': {
        const s = STATUS_STYLE[ad.status]
        return (
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
            style={{ background: s.bg, color: s.text }}>
            {s.label}
          </span>
        )
      }
      default:
        return <span style={{ color: '#6B7280' }}>—</span>
    }
  }

  if (loading) {
    return (
      <DarkPage title="Meta Ads" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan">
        <PageSkeleton cols={4} rows={3} />
      </DarkPage>
    )
  }

  return (
    <DarkPage title="Meta Ads" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan">
      <Suspense fallback={null}><FreshBanner /></Suspense>

      {/* Date range picker — always shown */}
      <div className="mb-4">
        <DateRangePicker
          preset={preset}
          onPreset={handlePreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStart={handleCustomStart}
          onCustomEnd={handleCustomEnd}
        />
        {activeRange.start && activeRange.end && (
          <p className="mt-2 text-[11.5px]" style={{ color: '#6B7280' }}>
            {dateLoading
              ? 'Loading…'
              : `Showing data: ${formatDisplayRange(activeRange.start, activeRange.end)}`}
          </p>
        )}
      </div>

      {!meta ? (
        <div className="text-center py-16" style={{ color: '#6B7280' }}>
          <div className="text-4xl mb-4">📣</div>
          <div className="font-sans text-xl mb-2" style={{ color: '#1E2D3D' }}>No Meta data yet</div>
          <p className="text-sm mb-4">Connect your Meta Ads account and click Sync now to see your ad data</p>
          <a href="/dashboard?upload=1" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Upload Files →</a>
        </div>
      ) : (
        <>
          <GoalSection
            page="meta"
            currentValues={{
              meta_ctr:         meta.avgCTR,
              meta_cpc:         meta.avgCPC,
              meta_impressions: meta.totalImpressions,
              meta_spend:       meta.totalSpend,
            }}
          />

          {/* Sync bar */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: syncing ? 'rgba(96,165,250,0.08)' : 'rgba(96,165,250,0.12)',
                border: '1px solid rgba(96,165,250,0.3)',
                color: '#60A5FA',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            {metaLastSync && (
              <span className="text-[11px]" style={{ color: '#6B7280' }}>
                Last synced: {new Date(metaLastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* KPI strip with goal comparison */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
            {[
              {
                label: 'Total Spend',
                value: fmtCurrency(meta.totalSpend),
                sub: 'This period',
                color: '#fb7185',
              },
              {
                label: 'Best CTR',
                value: fmtPct(meta.bestAd?.ctr || 0),
                sub: ctrGoal ? `Goal: ${ctrGoal}%` : (meta.bestAd?.name || '—'),
                color: '#34d399',
                vsGoal: ctrGoal ? (meta.bestAd?.ctr || 0) >= ctrGoal : undefined,
              },
              {
                label: 'Avg CPC',
                value: fmtCurrency(meta.avgCPC),
                sub: cpcGoal ? `Goal: ${fmtCurrency(cpcGoal)}` : 'Cost per click',
                color: '#fbbf24',
                vsGoal: cpcGoal ? meta.avgCPC <= cpcGoal : undefined,
              },
              {
                label: 'Total Clicks',
                value: meta.totalClicks.toLocaleString(),
                sub: `${fmtCurrency(meta.avgCPC)} avg CPC`,
                color: '#38bdf8',
              },
              {
                label: 'Impressions',
                value: meta.totalImpressions.toLocaleString(),
                sub: `${fmtPct(meta.avgCTR)} avg CTR`,
                color: '#a78bfa',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-4 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${item.color}06, white 60%)`, border: '1px solid #EEEBE6', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${item.color}40, ${item.color})` }} />
                <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2"
                  style={{ color: '#6B7280' }}>
                  {item.label}
                </div>
                <div className="text-[32px] font-semibold leading-none tracking-tight mb-1.5"
                  style={{ color: item.color }}>
                  {item.value}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: '#6B7280' }}>{item.sub}</span>
                  {item.vsGoal !== undefined && (
                    <span className="text-[10px] font-bold" style={{ color: item.vsGoal ? '#34d399' : '#fb7185' }}>
                      {item.vsGoal ? '✓ on target' : '✗ below goal'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Spend vs CTR chart — barDataset + line overlay from lib/chartConfig */}
          {meta.ads.length > 0 && <MetaPerformanceChart ads={sortedAds.length > 0 ? sortedAds : meta.ads} />}

          {analysis && <InsightCallouts analysis={{ ...analysis, mailerLite: undefined, pinterest: undefined }} page="meta" />}
          {meta && (meta.totalSpend ?? 0) > 0 && (
            <DarkCoachBox color="#fb7185" title={coachTitle}>
              {buildMetaCoach(meta)}
            </DarkCoachBox>
          )}


          <SortablePage
            page="meta"
            theme="light"
            sections={[
              {
                id: 'ads-table',
                content: (
                  <div>
                    {/* ── Ads table with column picker ────────────────────── */}
                    <div className="relative mb-5" ref={pickerRef}>
            {/* Header row: label + customize button */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: '#6B7280' }}>
                Ad Performance
              </div>
              <button
                onClick={() => setPickerOpen(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                style={{
                  background: pickerOpen ? 'rgba(233,160,32,0.1)' : '#F5F5F4',
                  border:     `1px solid ${pickerOpen ? 'rgba(233,160,32,0.4)' : '#E7E5E4'}`,
                  color:      pickerOpen ? '#e9a020' : '#6B7280',
                }}
              >
                ⊞ Customize columns
              </button>
            </div>

            {/* Column picker dropdown */}
            {pickerOpen && (
              <ColumnPicker
                activeCols={activeCols}
                onToggle={toggleCol}
                onReset={resetCols}
                onClose={() => setPickerOpen(false)}
              />
            )}

            {/* Table */}
            <div className="rounded-xl overflow-x-auto"
              style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#F5F5F4' }}>
                    <th className="text-left px-5 py-3">
                      <SortHeader
                        label="Ad Name"
                        sortable={false}
                        active={false}
                        dir="desc"
                        onClick={() => {}}
                      />
                    </th>
                    {activeColDefs.map(col => (
                      <th key={col.key} className="text-left px-5 py-3">
                        <SortHeader
                          label={col.label}
                          sortable={col.sortable}
                          active={sortKey === col.key}
                          dir={sortKey === col.key ? sortDir : 'desc'}
                          onClick={() => col.sortable && handleSort(col.key)}
                        />
                      </th>
                    ))}
                    {/* + Add column button */}
                    <th className="py-3 pr-3 text-right" style={{ width: 44 }}>
                      <button
                        onClick={() => setPickerOpen(p => !p)}
                        title="Add column"
                        className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[14px] font-bold"
                        style={{
                          background: '#F5F5F4',
                          color:      '#6B7280',
                          border:     '1px solid #E7E5E4',
                        }}
                      >
                        +
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAds.map((ad, i) => {
                    const isDead      = ad.clicks === 0 || ad.ctr < 1
                    const needsRescue = isDead
                    return (
                      <tr
                        key={i}
                        className="border-t transition-colors hover:bg-stone-50"
                        style={{
                          borderColor: 'rgba(0,0,0,0.06)',
                          opacity: isDead ? 0.55 : 1,
                        }}
                      >
                        {/* Ad Name — always shown */}
                        <td className="px-5 py-4">
                          <div>
                            <span
                              className="block truncate text-[13px] font-semibold leading-snug"
                              style={{ color: '#1E2D3D', maxWidth: 220 }}
                              title={ad.name}
                            >
                              {ad.name}
                            </span>
                            {needsRescue && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(251,113,133,0.15)', color: '#fb7185' }}>
                                needs rescue
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dynamic columns */}
                        {activeColDefs.map(col => (
                          <td key={col.key} className="px-5 py-4">
                            {renderCell(ad, col.key)}
                          </td>
                        ))}

                        {/* Empty cell under + button */}
                        <td />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

                    {/* Rescue panels */}
                    {rescueAds.length > 0 && (
                      <div className="mb-5">
                        <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-3" style={{ color: '#6B7280' }}>
                          Ads needing attention ({rescueAds.length})
                        </div>
                        <div className="space-y-4">
                          {rescueAds.map((ad, i) => <RescuePanel key={i} ad={ad} />)}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'action-grid',
                content: (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                      {
                        type: 'scale', title: '↑ Scale', color: '#34d399',
                        bg: 'rgba(52,211,153,0.05)', border: 'rgba(52,211,153,0.2)',
                        items: [
                          'Put $10+/day behind your best ad only',
                          'You have a proven winner — fund it',
                          `${meta.bestAd?.name || 'Best ad'} at ${meta.bestAd?.ctr || 0}% CTR — extraordinary`,
                        ],
                      },
                      {
                        type: 'cut', title: '✕ Cut Now', color: '#fb7185',
                        bg: 'rgba(251,113,133,0.05)', border: 'rgba(251,113,133,0.2)',
                        items: meta.worstAds.map(a =>
                          `${a.name} — ${a.clicks === 0 ? 'zero clicks in 30 days' : 'underperforming'}`
                        ),
                      },
                      {
                        type: 'fix', title: '⚠ Fix', color: '#fbbf24',
                        bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.2)',
                        items: [
                          `Increase daily budget from $${(meta.totalSpend / 30).toFixed(2)}/day to $10+/day`,
                          'Facebook needs volume to optimize',
                          'One winner + real budget = results',
                        ],
                      },
                      {
                        type: 'test', title: '◇ Test Next', color: '#38bdf8',
                        bg: 'rgba(56,189,248,0.05)', border: 'rgba(56,189,248,0.2)',
                        items: [
                          'Test a new hook angle your best ad doesn\'t use',
                          'Carousel version of your top performer',
                          'Check Ad Library for what\'s working in your genre',
                        ],
                      },
                    ].map(card => (
                      <div key={card.type} className="rounded-xl p-4"
                        style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                        <h3 className="text-[11px] font-bold uppercase tracking-[1px] mb-3"
                          style={{ color: card.color }}>{card.title}</h3>
                        <ul className="list-none p-0 space-y-1.5">
                          {card.items.map((item, j) => (
                            <li key={j} className="text-[12px] leading-snug" style={{ color: '#374151' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </DarkPage>
  )
}
