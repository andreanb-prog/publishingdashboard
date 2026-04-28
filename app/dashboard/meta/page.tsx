'use client'
// app/dashboard/meta/page.tsx
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import ChartJS from 'chart.js/auto'
import { ChartLegend } from '@/components/ChartLegend'
import { CHART_COLORS, BASE_CHART_OPTIONS, barDataset } from '@/lib/chartConfig'
import {
  BoutiqueChannelPageLayout,
  BoutiquePageHeader,
  BoutiqueSectionLabel,
  BoutiqueDataGrid,
  BoutiqueMetricCard,
  BoutiqueEmptyState,
  BoutiqueCoachBox,
  BoutiquePageSkeleton,
} from '@/components/boutique'
import { FreshBanner } from '@/components/FreshBanner'
import { InsightCallouts } from '@/components/InsightCallout'
import { GoalSection } from '@/components/GoalSection'
import { SortablePage } from '@/components/SortablePage'
import { fmtPct, fmtCurrency } from '@/lib/utils'
import { getCoachTitle } from '@/lib/coachTitle'
import { LastUploadBadge } from '@/components/LastUploadBadge'
import type { Analysis, MetaAd } from '@/types'


// ── Date range helpers ────────────────────────────────────────────────────────
// Use local date parts (not toISOString/UTC) so the range reflects the user's timezone
function fmt(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayRange(start: string, end: string): string {
  if (!start || !end) return ''
  if (start === end) return formatShortDate(start)
  return `${formatShortDate(start)} \u2013 ${formatShortDate(end)}`
}

type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom'

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date()
  switch (preset) {
    case 'today':
      return { start: fmt(today), end: fmt(today) }
    case 'yesterday': {
      const y = new Date(today.getTime() - 86400000)
      return { start: fmt(y), end: fmt(y) }
    }
    case 'last7':
      return { start: fmt(new Date(today.getTime() - 6 * 86400000)), end: fmt(today) }
    case 'last30':
      return { start: fmt(new Date(today.getTime() - 29 * 86400000)), end: fmt(today) }
    case 'thisMonth':
      return { start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: fmt(today) }
    default:
      return { start: '', end: '' }
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7',     label: 'Last 7 Days' },
  { key: 'last30',    label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'custom',    label: 'Custom Range…' },
]

// ── Date range picker ─────────────────────────────────────────────────────────
function DateRangePicker({
  preset, onPreset, onCustomApply, disabled,
}: {
  preset: Preset
  onPreset: (p: Preset) => void
  onCustomApply: (start: string, end: string) => void
  disabled?: boolean
}) {
  const [calOpen,      setCalOpen]      = useState(false)
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>()
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!calOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [calOpen])

  function handlePill(p: Preset) {
    if (disabled) return
    if (p === 'custom') {
      setCalOpen(c => !c)
    } else {
      setCalOpen(false)
      onPreset(p)
    }
  }

  function handleApply() {
    if (pendingRange?.from) {
      const start = fmt(pendingRange.from)
      const end   = fmt(pendingRange.to ?? pendingRange.from)
      onCustomApply(start, end)
      onPreset('custom')
      setCalOpen(false)
    }
  }

  const disabledTooltip = 'Date filtering unavailable — upload daily export for filtering'

  return (
    <div className="relative">
      {/* Horizontally scrollable pill row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePill(p.key)}
            title={disabled ? disabledTooltip : undefined}
            style={{
              flexShrink: 0,
              padding: '5px 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: !disabled && preset === p.key ? 600 : 500,
              whiteSpace: 'nowrap',
              background: disabled ? '#F7F4F0' : preset === p.key ? '#1E2D3D' : 'white',
              color: disabled ? 'rgba(30,45,61,0.3)' : preset === p.key ? 'white' : 'rgba(30,45,61,0.6)',
              border: `1px solid ${disabled ? '#E8E1D3' : preset === p.key ? '#1E2D3D' : '#E8E1D3'}`,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.7 : 1,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar popover */}
      {calOpen && !disabled && (
        <div
          ref={popoverRef}
          className="absolute left-0 z-30 mt-2 p-4"
          style={{ background: 'white', border: '1px solid #E8E1D3', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: '100vw' }}
        >
          <DayPicker
            mode="range"
            selected={pendingRange}
            onSelect={setPendingRange}
            numberOfMonths={2}
            className="not-prose"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}
          />
          <div className="flex items-center justify-end gap-4 pt-3 mt-1"
            style={{ borderTop: '1px solid #EEEBE6' }}>
            <button
              onClick={() => setCalOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       color: '#6B7280', fontSize: 12.5, fontFamily: 'var(--font-sans)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!pendingRange?.from}
              style={{
                padding: '6px 16px',
                background: pendingRange?.from ? '#1E2D3D' : 'rgba(30,45,61,0.1)',
                color:      pendingRange?.from ? 'white' : 'rgba(30,45,61,0.4)',
                border:     'none',
                cursor:     pendingRange?.from ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
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
    <div style={{ borderLeft: '3px solid #F97B6B', paddingLeft: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5, color: '#1E2D3D', marginBottom: 6 }}>
            {ad.name} isn&apos;t getting traction yet — that&apos;s fixable
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.6, color: '#6B7280', margin: 0 }}>
            This ad has {problemText}. That&apos;s not a failure — it&apos;s data.
            Readers scroll fast. Most ads need 2–3 creative iterations to find their hook.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: 12 }}>
          Guided next steps
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map(step => (
            <div key={step.num} style={{ display: 'flex', gap: 12 }}>
              <div style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                border: '2px solid #D97706', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-serif)', fontSize: 11, fontWeight: 600, color: '#D97706', marginTop: 2,
              }}>
                {step.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: '#1E2D3D', marginBottom: 2 }}>{step.title}</div>
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, lineHeight: 1.6, color: '#6B7280', margin: '0 0 6px' }}>{step.body}</p>
                {step.link && (
                  <a href={step.link.href}
                    target={step.link.href.startsWith('http') ? '_blank' : undefined}
                    rel={step.link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#D97706', textDecoration: 'none' }}>
                    {step.link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#F7F1E6', border: '1px solid #E8E1D3', padding: '12px 16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: 8 }}>
          Still stuck? Real humans who can help
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {resources.map(r => (
            <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 11.5, color: '#6B7280', textDecoration: 'none' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, lineHeight: 1, color: barColor }}>
        {ctr.toFixed(1)}%
      </div>
      <div style={{ height: 3, flex: 1, minWidth: 48, background: '#EEEBE6', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: barColor }} />
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
      <span style={{ fontSize: 9, lineHeight: 1, color: active ? '#D97706' : '#D6D3D1' }}>
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
      style={{
        position: 'absolute', right: 0, top: 36, zIndex: 20,
        background: 'white', border: '1px solid #E8E1D3',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 210, padding: 16,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: 12 }}>
        Show columns
      </div>
      {ALL_COLUMNS.map(col => {
        const isActive = activeCols.has(col.key)
        return (
          <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => onToggle(col.key)}
              style={{ accentColor: '#D97706', width: 14, height: 14 }}
            />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: isActive ? '#1E2D3D' : '#6B7280' }}>
              {col.label}
            </span>
          </label>
        )
      })}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EEEBE6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onReset} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '4px 10px', background: '#F7F1E6', color: '#6B7280', border: 'none', cursor: 'pointer' }}>
          Reset defaults
        </button>
        <button onClick={onClose} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, padding: '4px 10px', background: '#1E2D3D', color: 'white', border: 'none', cursor: 'pointer' }}>
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
    <div style={{ background: 'white', border: '1px solid #EEEBE6', padding: 20, marginBottom: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 16, color: '#1E2D3D', marginBottom: 16 }}>Ad Performance Overview</h3>
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

// ── Single-ad status card (shown when only 1 campaign exists) ────────────────
function SingleAdStatusCard({ ad }: { ad: import('@/types').MetaAd }) {
  const isRunning = ad.status !== 'CUT' && ad.status !== 'DELETE'
  return (
    <div style={{ background: 'white', border: '1px solid #EEEBE6', padding: 24, marginBottom: 24 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: '#1E2D3D', marginBottom: 12 }}>
        {ad.name}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 600, lineHeight: 1, color: '#D97706', marginBottom: 4 }}>
        {ad.ctr.toFixed(2)}%
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'rgba(30,45,61,0.5)', marginBottom: 16 }}>
        Click-through rate
      </div>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic',
          textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px',
          background: isRunning ? 'rgba(110,191,139,0.15)' : 'rgba(249,123,107,0.15)',
          color: isRunning ? '#6EBF8B' : '#F97B6B',
        }}>
          {isRunning ? 'Active' : 'Paused'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ padding: '8px 16px', background: '#1E2D3D', color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Scale It →
        </button>
        <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer"
          style={{ padding: '8px 16px', background: 'white', color: '#1E2D3D', border: '1px solid #E8E1D3', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          View in Meta →
        </a>
      </div>
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
  const [coachTitle, setCoachTitle] = useState('Your marketing coach says')
  useEffect(() => { setCoachTitle(getCoachTitle()) }, [])
  const [analysis,   setAnalysis]  = useState<Analysis | null>(null)
  const [goals,      setGoals]     = useState<Record<string, number>>({})
  const [activeCols, setActiveCols] = useState<Set<ColKey>>(DEFAULT_COLS)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sortKey,    setSortKey]   = useState<ColKey | null>(null)
  const [sortDir,    setSortDir]   = useState<SortDir>('desc')
  const [loading,    setLoading]   = useState(true)
  const [syncing,    setSyncing]   = useState(false)
  const [dateLoading, setDateLoading] = useState(false)
  const [permissionError, setPermissionError] = useState(false)
  const [metaLastSync, setMetaLastSync] = useState<string | null>(null)
  // undefined = no date range fetch yet (show analysis cache); null = fetch returned no data for range
  const [metaOverride, setMetaOverride] = useState<import('@/types').MetaData | null | undefined>(undefined)
  const [availableRange, setAvailableRange] = useState<{ start: string; end: string } | null>(null)
  const [isAggregated, setIsAggregated] = useState(false)

  // Date range state
  const [preset,      setPreset]      = useState<Preset>('last30')
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
        if (d.isAggregated) {
          // Aggregated/summary CSV upload — date filtering doesn't work. Use analysis cache instead.
          setIsAggregated(true)
          setMetaOverride(undefined)
          setAvailableRange(null)
        } else {
          setIsAggregated(false)
          setMetaOverride(d.data ?? null)
          setAvailableRange(d.data ? null : (d.availableRange ?? null))
        }
      })
      .catch(() => { setMetaOverride(null) })
      .finally(() => setDateLoading(false))
  }, [])

  async function handleSync() {
    setSyncing(true)
    setPermissionError(false)
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (res.ok) {
        if (data.data) {
          setAnalysis(prev => prev ? { ...prev, meta: data.data } : { meta: data.data } as any)
          setMetaOverride(undefined) // clear override so cached data shows fresh sync
        }
        setMetaLastSync(new Date().toISOString())
        window.dispatchEvent(new Event('meta:synced'))
      } else if (data.error === 'permission_denied') {
        setPermissionError(true)
      }
    } catch { /* ignore */ }
    setSyncing(false)
  }

  async function handleDisconnectAndReconnect() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect-meta' }),
    }).catch(() => {})
    window.location.replace('/api/meta/connect')
  }

  // Single fetch path: any change to activeRange triggers a re-fetch
  useEffect(() => {
    if (!activeRange.start || !activeRange.end) return
    fetchDateRange(activeRange.start, activeRange.end)
  }, [activeRange, fetchDateRange])

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

    // Re-fetch when a file is uploaded via the TopBar direct-upload button
    function onUpload() {
      setPreset('last30')
      setActiveRange(getPresetRange('last30'))
      loadMetaData()
    }
    window.addEventListener('dashboard-data-refresh', onUpload)

    return () => {
      window.removeEventListener('meta:synced', onSynced)
      window.removeEventListener('dashboard-data-refresh', onUpload)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') {
      setActiveRange(getPresetRange(p))
    }
  }

  function handleCustomApply(start: string, end: string) {
    setActiveRange({ start, end })
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

  const meta       = metaOverride !== undefined ? metaOverride : analysis?.meta
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
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', whiteSpace: 'nowrap', background: s.bg, color: s.text }}>
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
      <BoutiqueChannelPageLayout>
        <BoutiquePageHeader title="Meta" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan" />
        <BoutiquePageSkeleton cols={4} rows={3} />
      </BoutiqueChannelPageLayout>
    )
  }

  return (
    <DashboardErrorBoundary>
    <BoutiqueChannelPageLayout>
      <BoutiquePageHeader title="Meta" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan" />
      <Suspense fallback={null}><FreshBanner /></Suspense>
      <LastUploadBadge channel="meta" dateRange={activeRange.start ? activeRange : undefined} />

      {/* Date range picker — always shown */}
      <div className="mb-5">
        <DateRangePicker
          preset={preset}
          onPreset={handlePreset}
          onCustomApply={handleCustomApply}
          disabled={isAggregated}
        />
        {dateLoading && (
          <p className="mt-2 text-[11.5px]" style={{ color: '#6B7280' }}>Loading…</p>
        )}
        {isAggregated && (() => {
          const ds = analysis?.meta?.dateStart
          const de = analysis?.meta?.dateEnd
          const rangeLabel = ds && de ? ` · ${formatDisplayRange(ds, de)}` : ''
          return (
            <p className="mt-2 text-[11.5px]" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
              Showing full campaign data{rangeLabel}
            </p>
          )
        })()}
      </div>

      {!meta ? (
        metaOverride === null ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: '#D1D5DB' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M10 7v3.5M10 13h.01" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              {preset === 'today' ? 'No data for today yet' : 'No data for this date range'}
            </p>
            {availableRange && (
              <div className="flex flex-col items-center gap-2 mt-1">
                <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
                  Your uploaded data covers {formatDisplayRange(availableRange.start, availableRange.end)}
                </p>
                <button
                  onClick={() => {
                    setPreset('custom')
                    setActiveRange(availableRange)
                    fetchDateRange(availableRange.start, availableRange.end)
                  }}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
                  style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
                >
                  Switch to this range →
                </button>
              </div>
            )}
          </div>
        ) : (
          <BoutiqueEmptyState
            message="No Meta data yet"
            ctaLabel="Upload Files →"
            ctaHref="/dashboard?upload=1"
          />
        )
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
              className="flex items-center gap-1.5"
              style={{
                padding: '4px 10px', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
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

          {/* Permission denied warning */}
          {permissionError && (
            <div style={{ background: '#FFFBEB', border: '2px solid #D97706', padding: 20, marginBottom: 20 }}>
              <div className="font-semibold text-[14px] mb-1" style={{ color: '#1E2D3D' }}>
                Meta needs permission to read your ads.
              </div>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#6B7280' }}>
                Your ad account hasn&apos;t granted AuthorDash read access yet. Fix this in 2 steps:
              </p>
              <ol className="space-y-2 mb-4 pl-1">
                <li className="flex gap-2 text-[13px]" style={{ color: '#1E2D3D' }}>
                  <span className="font-bold flex-shrink-0">1.</span>
                  <span>Go to <strong>business.facebook.com</strong> → Business Settings → Ad Accounts → find <strong>Elle Wilder Books</strong> → People → confirm your account has <strong>Analyst</strong> or <strong>Advertiser</strong> role.</span>
                </li>
                <li className="flex gap-2 text-[13px]" style={{ color: '#1E2D3D' }}>
                  <span className="font-bold flex-shrink-0">2.</span>
                  <span>Come back here, disconnect Meta, and reconnect — this will re-request all required permissions.</span>
                </li>
              </ol>
              <button
                onClick={handleDisconnectAndReconnect}
                style={{ padding: '8px 16px', background: '#1E2D3D', color: 'white', border: 'none', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Disconnect &amp; Reconnect →
              </button>
            </div>
          )}

          {/* KPI strip */}
          <BoutiqueSectionLabel label="Performance" />
          <div style={{ marginBottom: 32 }}>
            <BoutiqueDataGrid cols={3}>
              <BoutiqueMetricCard label="Total Spend" value={fmtCurrency(meta.totalSpend)} colorDot="#F4A261" subtext="This period" />
              <BoutiqueMetricCard label="Best CTR" value={fmtPct(meta.bestAd?.ctr || 0)} colorDot="#F4A261" subtext={ctrGoal ? `Goal: ${ctrGoal}%` : (meta.bestAd?.name || '—')} />
              <BoutiqueMetricCard label="Avg CPC" value={fmtCurrency(meta.avgCPC)} colorDot="#F4A261" subtext={cpcGoal ? `Goal: ${fmtCurrency(cpcGoal)}` : 'Cost per click'} />
            </BoutiqueDataGrid>
            <div style={{ marginTop: 1 }}>
              <BoutiqueDataGrid cols={2}>
                <BoutiqueMetricCard label="Total Clicks" value={meta.totalClicks.toLocaleString()} colorDot="#F4A261" subtext={`${fmtCurrency(meta.avgCPC)} avg CPC`} />
                <BoutiqueMetricCard label="Impressions" value={meta.totalImpressions.toLocaleString()} colorDot="#F4A261" subtext={`${fmtPct(meta.avgCTR)} avg CTR`} />
              </BoutiqueDataGrid>
            </div>
          </div>

          {/* Spend vs CTR chart — barDataset + line overlay from lib/chartConfig */}
          {meta.ads.length === 1
            ? <SingleAdStatusCard ad={meta.ads[0]} />
            : meta.ads.length >= 2 && <MetaPerformanceChart ads={sortedAds.length > 0 ? sortedAds : meta.ads} />}

          {analysis && <InsightCallouts analysis={{ ...analysis, mailerLite: undefined, pinterest: undefined }} page="meta" />}
          {meta && (meta.totalSpend ?? 0) > 0 && (
            <BoutiqueCoachBox>
              {buildMetaCoach(meta)}
            </BoutiqueCoachBox>
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280' }}>
                Ad Performance
              </div>
              <button
                onClick={() => setPickerOpen(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
                  background: pickerOpen ? 'rgba(217,119,6,0.08)' : '#F7F1E6',
                  border: `1px solid ${pickerOpen ? '#D97706' : '#E8E1D3'}`,
                  color: pickerOpen ? '#D97706' : '#6B7280',
                  cursor: 'pointer',
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
            <div style={{ overflowX: 'auto', background: 'white', border: '1px solid #EEEBE6' }}>
              <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#F7F1E6' }}>
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
                        style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F7F1E6', color: '#6B7280', border: '1px solid #E8E1D3', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
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
                              <span style={{ display: 'inline-block', marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px', background: 'rgba(249,123,107,0.12)', color: '#F97B6B' }}>
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
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', marginBottom: 12 }}>
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
                      <div key={card.type} style={{ padding: 16, background: card.bg, border: `1px solid ${card.border}` }}>
                        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: card.color, marginBottom: 12 }}>{card.title}</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {card.items.map((item, j) => (
                            <li key={j} style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, lineHeight: 1.5, color: '#374151' }}>{item}</li>
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
    </BoutiqueChannelPageLayout>
    </DashboardErrorBoundary>
  )
}
