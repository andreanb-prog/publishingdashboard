'use client'
// app/dashboard/meta/page.tsx
import { Suspense, useEffect, useRef, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { ViewingBar } from '@/components/ViewingBar'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis, MetaAd } from '@/types'

const COACH_TITLE = getCoachTitle('meta')

// ── Column definitions ────────────────────────────────────────────────────────
type ColKey =
  | 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc'
  | 'uniqueClicks' | 'uniqueCtr' | 'frequency' | 'reach'
  | 'results' | 'costPerResult' | 'status'

const ALL_COLUMNS: { key: ColKey; label: string; defaultOn: boolean }[] = [
  { key: 'spend',         label: 'Spend',           defaultOn: true  },
  { key: 'impressions',   label: 'Impressions',     defaultOn: false },
  { key: 'clicks',        label: 'Clicks',          defaultOn: true  },
  { key: 'ctr',           label: 'CTR',             defaultOn: true  },
  { key: 'cpc',           label: 'CPC',             defaultOn: true  },
  { key: 'uniqueClicks',  label: 'Unique Clicks',   defaultOn: false },
  { key: 'uniqueCtr',     label: 'Unique CTR',      defaultOn: false },
  { key: 'frequency',     label: 'Frequency',       defaultOn: false },
  { key: 'reach',         label: 'Reach',           defaultOn: false },
  { key: 'results',       label: 'Results',         defaultOn: false },
  { key: 'costPerResult', label: 'Cost per Result', defaultOn: false },
  { key: 'status',        label: 'Status',          defaultOn: true  },
]

const DEFAULT_COLS = new Set<ColKey>(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.key))

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<MetaAd['status'], { bg: string; text: string; label: string }> = {
  SCALE:    { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', label: '🟢 Scale it' },
  WATCH:    { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: '🟡 Keep watching' },
  CUT:      { bg: 'rgba(251,113,133,0.12)', text: '#fb7185', label: '🔴 Cut this' },
  DELETE:   { bg: 'rgba(251,113,133,0.15)', text: '#fb7185', label: '🔴 Delete' },
  LOW_DATA: { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8', label: '◇ Need more data' },
}

// ── Month range helper ────────────────────────────────────────────────────────
function getMonthRange(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const startDate = new Date(year, mon - 1, 1)
  const endDate   = new Date(year, mon, 0)
  const days      = endDate.getDate()
  const fmt       = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { start: fmt(startDate), end: fmt(endDate), days }
}

// ── Rescue Panel ──────────────────────────────────────────────────────────────
function RescuePanel({ ad }: { ad: MetaAd }) {
  const isZeroClicks = ad.clicks === 0
  const problemText  = isZeroClicks
    ? `zero clicks despite $${ad.spend} in spend`
    : `a CTR of just ${ad.ctr}% — well below the 1% threshold`

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
      link: { label: 'Upload competitor ads →', href: '/dashboard/upload' },
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
          <div className="font-semibold text-[13.5px] mb-1.5" style={{ color: '#fafaf9' }}>
            {ad.name} isn&apos;t getting traction yet — that&apos;s fixable
          </div>
          <p className="text-[12.5px] leading-relaxed m-0" style={{ color: '#a8a29e' }}>
            This ad has {problemText}. That&apos;s not a failure — it&apos;s data.
            Readers scroll fast. Most ads need 2–3 creative iterations to find their hook.
            Here&apos;s a clear path forward.
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
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
                <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: '#d6d3d1' }}>{step.title}</div>
                <p className="text-[12px] leading-relaxed m-0 mb-1.5" style={{ color: '#78716c' }}>{step.body}</p>
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

      <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Still stuck? Real humans who can help
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {resources.map(r => (
            <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer"
              className="text-[11.5px] no-underline hover:underline" style={{ color: '#57534e' }}>
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
    <div>
      <div className="font-mono font-bold text-[22px] leading-none mb-1.5" style={{ color: barColor }}>
        {ctr}%
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#292524', width: 80 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
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
        background: '#1c1917',
        border: '1px solid #44403c',
        minWidth: 210,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] mb-3" style={{ color: '#57534e' }}>
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
            <span className="text-[12.5px]" style={{ color: isActive ? '#d6d3d1' : '#57534e' }}>
              {col.label}
            </span>
          </label>
        )
      })}
      <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid #292524' }}>
        <button
          onClick={onReset}
          className="text-[11px] px-2.5 py-1 rounded-md"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#78716c' }}
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MetaPage() {
  const [analysis,   setAnalysis]   = useState<Analysis | null>(null)
  const [activeCols, setActiveCols] = useState<Set<ColKey>>(DEFAULT_COLS)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef  = useRef<HTMLDivElement>(null)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.json())
      .then(d => {
        const rows: Analysis[] = (d.analyses ?? [])
          .map((a: { data?: Analysis }) => a.data)
          .filter((x: unknown): x is Analysis => !!x && typeof x === 'object' && 'month' in (x as object))
        if (rows[0]) setAnalysis(rows[0])
      })

    // Restore saved column preferences
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => {
        const saved = d.columnPrefs?.meta
        if (Array.isArray(saved) && saved.length > 0) {
          setActiveCols(new Set<ColKey>(saved as ColKey[]))
        }
      })
      .catch(() => {})
  }, [])

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

  const meta       = analysis?.meta
  const coach      = (analysis as any)?.metaCoach
  const rescueAds  = meta?.ads.filter(ad => ad.clicks === 0 || ad.ctr < 1) ?? []
  const maxCTR     = meta ? Math.max(...meta.ads.map(a => a.ctr), 1) : 1
  const viewRange  = analysis?.month ? getMonthRange(analysis.month) : null
  const activeColDefs = ALL_COLUMNS.filter(c => activeCols.has(c.key))

  function renderCell(ad: MetaAd, key: ColKey) {
    switch (key) {
      case 'spend':
        return <span className="font-mono text-[16px]" style={{ color: '#78716c' }}>${ad.spend}</span>
      case 'impressions':
        return <span className="font-mono text-[14px]" style={{ color: '#d6d3d1' }}>{ad.impressions.toLocaleString()}</span>
      case 'clicks':
        return <span className="font-mono font-bold text-[20px]" style={{ color: ad.clicks === 0 ? '#fb7185' : '#34d399' }}>{ad.clicks}</span>
      case 'ctr':
        return <CTRBar ctr={ad.ctr} maxCTR={maxCTR} />
      case 'cpc':
        return <span className="font-mono text-[16px]" style={{ color: '#78716c' }}>{ad.cpc > 0 ? `$${ad.cpc}` : '—'}</span>
      case 'reach':
        return <span className="font-mono text-[14px]" style={{ color: '#d6d3d1' }}>{ad.reach > 0 ? ad.reach.toLocaleString() : '—'}</span>
      case 'status': {
        const s = STATUS_STYLE[ad.status]
        return (
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: s.bg, color: s.text }}>
            {s.label}
          </span>
        )
      }
      default:
        return <span style={{ color: '#44403c' }}>—</span>
    }
  }

  return (
    <DarkPage title="📣 Meta Ads" subtitle="Facebook Ads · Performance · Hook Scoring · Action Plan">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {!meta ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📣</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>No Meta data yet</div>
          <p className="text-sm mb-4">Upload your Meta Ads CSV to see your ad analysis</p>
          <a href="/dashboard/upload" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Upload Files →</a>
        </div>
      ) : (
        <>
          <DarkKPIStrip cols={4} items={[
            { label: 'Total Spend',  value: `$${meta.totalSpend}`,       sub: 'This period',            color: '#fb7185' },
            { label: 'Best CTR',     value: `${meta.bestAd?.ctr || 0}%`, sub: meta.bestAd?.name || '—', color: '#34d399' },
            { label: 'Best CPC',     value: `$${meta.bestAd?.cpc || 0}`, sub: 'Cost per click',         color: '#fbbf24' },
            { label: 'Total Clicks', value: meta.totalClicks,             sub: `$${meta.avgCPC} avg CPC`, color: '#38bdf8' },
          ]} />

          {coach && <DarkCoachBox color="#fb7185" title={COACH_TITLE}>{coach}</DarkCoachBox>}

          {/* Viewing bar */}
          {viewRange && (
            <ViewingBar
              start={viewRange.start}
              end={viewRange.end}
              days={viewRange.days}
              summary={`$${meta.totalSpend} total spend · ${meta.totalClicks} clicks`}
            />
          )}

          {/* ── Ads table with column picker ─────────────────────────────── */}
          <div className="relative mb-5" ref={pickerRef}>
            {/* Header row: label + customize button */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: '#57534e' }}>
                Ad Performance
              </div>
              <button
                onClick={() => setPickerOpen(p => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                style={{
                  background: pickerOpen ? 'rgba(233,160,32,0.1)' : 'rgba(255,255,255,0.04)',
                  border:     `1px solid ${pickerOpen ? 'rgba(233,160,32,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color:      pickerOpen ? '#e9a020' : '#78716c',
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
            <div className="rounded-xl overflow-hidden"
              style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: '#292524' }}>
                    <th className="text-left px-5 py-3 text-[11px] font-bold tracking-[0.5px]"
                      style={{ color: '#78716c' }}>
                      Ad Name
                    </th>
                    {activeColDefs.map(col => (
                      <th key={col.key}
                        className="text-left px-5 py-3 text-[11px] font-bold tracking-[0.5px]"
                        style={{ color: '#78716c' }}>
                        {col.label}
                      </th>
                    ))}
                    {/* + Add column button */}
                    <th className="py-3 pr-3 text-right" style={{ width: 44 }}>
                      <button
                        onClick={() => setPickerOpen(p => !p)}
                        title="Add column"
                        className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[14px] font-bold"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color:      '#78716c',
                          border:     '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        +
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {meta.ads.map((ad, i) => {
                    const isDead      = ad.clicks === 0 || ad.ctr < 1
                    const needsRescue = isDead
                    return (
                      <tr
                        key={i}
                        className="border-t transition-colors"
                        style={{
                          borderColor: 'rgba(255,255,255,0.05)',
                          opacity: isDead ? 0.55 : 1,
                        }}
                      >
                        {/* Ad Name — always shown */}
                        <td className="px-5 py-5">
                          <div>
                            <span
                              className="block truncate text-[14px] font-semibold leading-snug"
                              style={{ color: '#fafaf9', maxWidth: 260 }}
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
                          <td key={col.key} className="px-5 py-5">
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
              <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                🚨 Ads needing attention ({rescueAds.length})
              </div>
              <div className="space-y-4">
                {rescueAds.map((ad, i) => <RescuePanel key={i} ad={ad} />)}
              </div>
            </div>
          )}

          {/* Action grid */}
          <div className="grid grid-cols-4 gap-3">
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
                  {card.items.map((item, i) => (
                    <li key={i} className="text-[12px] leading-snug" style={{ color: '#d6d3d1' }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </DarkPage>
  )
}
