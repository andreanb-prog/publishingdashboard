'use client'
// app/(dashboard)/mailerlite/page.tsx
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary'
import { Suspense, useEffect, useRef, useState } from 'react'
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
import { GoalSection } from '@/components/GoalSection'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { getCoachTitle } from '@/lib/coachTitle'
import { fmtPct } from '@/lib/utils'
import { InsightCallouts } from '@/components/InsightCallout'
import type { Analysis, MailerLiteAutomation, MailerLiteData } from '@/types'
import type { LiveCampaign, FlaggedCampaign } from '@/app/api/mailerlite/campaigns/route'
import type { UnsubAnalysis } from '@/app/api/mailerlite/unsub-analysis/route'

// ── Build a live coach insight from real MailerLite numbers ───────────────────
// Always derived from live data so stale cached emailCoach never shows.
function buildEmailCoach(
  ml: MailerLiteData,
  topCampaigns?: { subject: string; openRate: number; clickRate: number }[],
  flaggedCampaign?: FlaggedCampaign | null,
  unsubAnalysis?: UnsubAnalysis | null,
): string {
  const s1 = `Your list has ${ml.listSize.toLocaleString()} active subscribers with a ${ml.openRate}% open rate and ${ml.clickRate}% click rate.`

  let s2 = ''
  const top = topCampaigns?.filter(c => c.subject && c.subject !== c.subject.toUpperCase())
  if (ml.openRate >= 30) {
    const examples = top?.slice(0, 2).map(c => `"${c.subject}"`).join(' and ')
    s2 = `Your open rate is exceptional — well above the 20–25% author average. ${
      examples
        ? `Your top-performing subjects — ${examples} — show what's resonating. Stick with that pattern and test a small variation on your next send.`
        : 'Note the subject line patterns from your top campaigns and replicate that format in your next send.'
    }`
  } else if (ml.openRate >= 20) {
    const best = top?.[0]
    s2 = `Your open rate is in the healthy range. ${
      best
        ? `Your best-performing subject "${best.subject}" (${best.openRate}% open) is a good benchmark — test a curiosity-gap or number-led variation to push above 30%.`
        : 'Test a curiosity-gap or number-led subject on your next send to push it above 30%.'
    }`
  } else {
    const worst = top?.slice(-1)[0]
    s2 = `Your open rate is below the 20% author average. ${
      worst
        ? `Subjects like "${worst.subject}" may be too generic — try a more specific or personal hook. "I almost didn't send this" consistently outperforms broad titles.`
        : 'Test a more specific or personal hook — "I almost didn\'t send this" outperforms generic titles consistently.'
    }`
  }

  let s3 = ''
  if (flaggedCampaign) {
    const dateStr = flaggedCampaign.sentAt
      ? new Date(flaggedCampaign.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'recently'
    s3 = `"${flaggedCampaign.name}" triggered an unsubscribe spike on ${dateStr} (${flaggedCampaign.unsubscribeRate}% unsub rate). Subject: "${flaggedCampaign.subject}". Reduce send frequency or tighten audience targeting before your next send.`
  } else if (unsubAnalysis?.type === 'list_clean' || unsubAnalysis?.type === 'mixed') {
    // UnsubNote component handles the display; no duplicate alert in coach copy
  } else if (ml.listSize > 0 && (ml.unsubscribes / ml.listSize) > 0.005) {
    s3 = `Your unsubscribe count is ${ml.unsubscribes} (${((ml.unsubscribes / ml.listSize) * 100).toFixed(1)}% of your list) — above the 0.5% watch threshold. Note: MailerLite's unsubscribed count includes list cleans, so some of these may be automated removals rather than reader opt-outs. Check send frequency and subject line relevance before your next campaign.`
  } else if (ml.clickRate >= 4) {
    const best = topCampaigns?.sort((a, b) => b.clickRate - a.clickRate)[0]
    s3 = `Your ${ml.clickRate}% click rate is exceptional. ${
      best
        ? `The CTA in "${best.subject}" clearly worked — identify what made it click and replicate it.`
        : 'Identify which CTA placement and button copy drove this, and replicate it in your next campaign.'
    }`
  } else if (ml.clickRate < 2) {
    s3 = `Your click rate is below 2%. Move your primary CTA above the fold in your next email, and test a button instead of a hyperlink to improve click-through.`
  }

  return [s1, s2, s3].filter(Boolean).join(' ')
}


// ── Campaign Open Rate Chart (uses lib/chartConfig) ──────────────────────────
function CampaignOpenRateChart({ campaigns, target }: { campaigns: import('@/types').MailerLiteCampaign[]; target: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    const recent = campaigns.slice(0, 10).reverse()
    if (!canvasRef.current || recent.length === 0) return
    const ctx2d = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    const labels     = recent.map(c => c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')
    const openRates  = recent.map(c => c.openRate)
    const bgColors   = recent.map(c => (c.openRate >= target ? CHART_COLORS.sage : CHART_COLORS.amber) + 'CC')
    const hoverColors= recent.map(c => c.openRate >= target ? CHART_COLORS.sage : CHART_COLORS.amber)

    chartRef.current = new ChartJS(ctx2d, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            ...barDataset(openRates, CHART_COLORS.sage, 'Open Rate (%)'),
            backgroundColor: bgColors,
            hoverBackgroundColor: hoverColors,
          },
          {
            type: 'line' as any,
            label: `Target ${target}%`,
            data: Array(recent.length).fill(target),
            borderColor: CHART_COLORS.amber,
            borderWidth: 1.5,
            borderDash: [4, 3],
            fill: false,
            pointRadius: 0,
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
              title: (items: any[]) => recent[items[0]?.dataIndex]?.name ?? '',
              label: (item: any) =>
                item.datasetIndex === 0 ? ` Open rate: ${item.raw}%` : ` Target: ${item.raw}%`,
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
            ticks: {
              ...BASE_CHART_OPTIONS.scales.y.ticks,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callback: (v: any) => `${v}%`,
            },
          },
        },
      } as any,
    })
    return () => { chartRef.current?.destroy() }
  }, [campaigns, target])

  const recent = campaigns.slice(0, 10).reverse()
  if (recent.length === 0) return null

  return (
    <div>
      <div style={{ minHeight: 160, position: 'relative' }}>
        <canvas ref={canvasRef} />
      </div>
      <ChartLegend items={[
        { color: CHART_COLORS.sage,  label: 'Above target', type: 'square' },
        { color: CHART_COLORS.amber, label: 'Below target', type: 'square' },
        { color: CHART_COLORS.amber, label: `Target ${target}%`, type: 'line' },
      ]} />
    </div>
  )
}

// ── Campaign skeleton ─────────────────────────────────────────────────────────
function CampaignSkeleton() {
  return (
    <div className="mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
      <div className="px-5 py-3.5" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600 }}>
        Recent Campaigns
      </div>
      <table className="w-full border-collapse" style={{ minWidth: 520 }}>
        <thead>
          <tr style={{ background: '#F7F1E6' }}>
            {['Subject', 'Open Rate', 'Click Rate', 'Unsubs', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-2"
                style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map(i => (
            <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)', background: i % 2 === 1 ? '#FFF8F0' : 'white' }}>
              {[200, 60, 60, 50, 60].map((w, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3 animate-pulse" style={{ width: w, background: '#E5E7EB' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Live campaign performance section ─────────────────────────────────────────
function CampaignPerformanceSection({
  campaigns,
  flaggedCampaign,
  loading,
  error,
}: {
  campaigns: LiveCampaign[]
  flaggedCampaign: FlaggedCampaign | null
  loading: boolean
  error: boolean
}) {
  if (loading) return <CampaignSkeleton />

  if (error) {
    return (
      <div className="mb-5 px-5 py-8 text-center" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          Couldn't load campaign data. Check your MailerLite connection in Settings.
        </p>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="mb-5 px-5 py-8 text-center" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          No campaigns sent yet. Your campaign performance will appear here after your first send.
        </p>
      </div>
    )
  }

  const best = [...campaigns].sort((a, b) => b.openRate - a.openRate)[0]

  function openColor(rate: number) {
    if (rate >= 30) return '#6EBF8B'
    if (rate >= 20) return '#D97706'
    return '#F97B6B'
  }
  function clickColor(rate: number) {
    if (rate >= 4) return '#6EBF8B'
    if (rate >= 2) return '#D97706'
    return '#F97B6B'
  }

  return (
    <div className="mb-5">
      {/* Best performer callout */}
      <div className="px-5 py-3.5 mb-3 flex items-center gap-2.5"
        style={{ borderLeft: '3px solid #6EBF8B', background: 'rgba(110,191,139,0.06)' }}>
        <span className="text-[12.5px]" style={{ color: '#1E2D3D' }}>
          <span className="font-semibold">Best performer: </span>
          <span className="italic" title={best.subject}>
            {best.subject.length > 60 ? best.subject.slice(0, 60) + '…' : best.subject}
          </span>
          <span style={{ color: '#6B7280' }}> — </span>
          <span style={{ color: '#6EBF8B' }} className="font-semibold">{best.openRate}% open rate</span>
          <span style={{ color: '#6B7280' }}>, </span>
          <span style={{ color: '#6EBF8B' }} className="font-semibold">{best.clickRate}% click rate</span>
        </span>
      </div>

      {/* Unsubscribe spike alert */}
      {flaggedCampaign && (
        <div className="px-5 py-3.5 mb-3 flex items-start gap-2.5"
          style={{ background: 'rgba(217,119,6,0.06)', borderLeft: '3px solid #D97706' }}>
          <span className="text-[12.5px]" style={{ color: '#1E2D3D' }}>
            <span className="font-semibold">{flaggedCampaign.name}</span> triggered an unsubscribe spike
            {' '}— <span className="font-semibold" style={{ color: '#D97706' }}>{flaggedCampaign.unsubscribeRate}% unsub rate</span>
            {flaggedCampaign.sentAt ? ` on ${new Date(flaggedCampaign.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}.
            {' '}Subject: "<em>{flaggedCampaign.subject}</em>". Check send frequency or audience targeting.
          </span>
        </div>
      )}

      {/* Campaign table */}
      <CollapsibleSection
        title="Recent Campaigns"
        storageKey="ml-section-campaigns"
        badge={
          <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280' }}>
            Live · last 10 sent
          </span>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-[12px]" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ background: '#F7F1E6' }}>
                {['Subject', 'Open Rate', 'Click Rate', 'Unsubs', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-2"
                    style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={c.id || i} className="border-t"
                  style={{ borderColor: 'rgba(0,0,0,0.06)', background: i % 2 === 1 ? '#FFF8F0' : 'white' }}>
                  <td className="px-4 py-2.5 max-w-[240px]" style={{ color: '#1E2D3D' }}>
                    <span
                      title={c.subject}
                      className="block truncate"
                      style={{ maxWidth: 240 }}
                    >
                      {c.subject.length > 50 ? c.subject.slice(0, 50) + '…' : c.subject}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: openColor(c.openRate) }}>
                    {c.openRate}%
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: clickColor(c.clickRate) }}>
                    {c.clickRate}%
                  </td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: c.isSpike ? '#F97B6B' : '#6B7280' }}>
                    {c.unsubscribes ?? 0}
                    {c.isSpike && <span className="ml-1 text-[10px]">⚠</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[11px]" style={{ color: '#6B7280' }}>
                    {c.sentAt
                      ? new Date(c.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  )
}

// ── Unsubscribe analysis note ─────────────────────────────────────────────────
function UnsubNote({ analysis }: { analysis: UnsubAnalysis | null }) {
  if (!analysis || analysis.type === 'genuine_churn' || analysis.type === 'normal') return null

  if (analysis.type === 'list_clean') {
    return (
      <div className="px-5 py-3.5 mb-4"
        style={{ background: 'rgba(96,165,250,0.06)', borderLeft: '3px solid #60A5FA' }}>
        <span className="text-[12.5px]" style={{ color: '#1E2D3D' }}>
          <span className="font-semibold" style={{ color: '#60A5FA' }}>
            {analysis.totalUnsubs.toLocaleString()} unsubscribes detected
          </span>
          {' '}— {analysis.peakPct}% occurred{analysis.peakDate ? ` on ${analysis.peakDate}` : ' in a 48-hour window'},
          consistent with a list clean. Not counted as churn.
        </span>
      </div>
    )
  }

  if (analysis.type === 'mixed') {
    const organic = analysis.organicUnsubs ?? 0
    const rate = analysis.organicRate ?? 0
    return (
      <div className="px-5 py-3.5 mb-4"
        style={{ background: 'rgba(110,191,139,0.06)', borderLeft: '3px solid #6EBF8B' }}>
        <span className="text-[12.5px]" style={{ color: '#1E2D3D' }}>
          <span className="font-semibold">{analysis.totalUnsubs.toLocaleString()} total unsubscribes</span>
          {' '}— {analysis.peakPct}% from a list clean{analysis.peakDate ? ` on ${analysis.peakDate}` : ''}.{' '}
          <span style={{ color: '#F97B6B' }} className="font-semibold">{organic.toLocaleString()} organic unsubscribes</span>
          {rate > 0 ? ` (${rate}% of list)` : ''}.
        </span>
      </div>
    )
  }

  return null
}

interface MLList { id: string; mailerliteId: string; name: string; activeCount: number; unsubCount: number; lastSyncedAt: string | null }
interface Group {
  id: string
  name: string
  active_subscribers_count: number
  openRate: number
  clickRate: number
  unsubscribedCount: number
}
interface GroupStats {
  id: string
  name: string
  listSize: number
  openRate: number
  clickRate: number
  unsubscribes: number
  sentCount: number
}

// ── Metric card skeleton ──────────────────────────────────────────────────────
function MetricCardSkeleton() {
  return (
    <div className="animate-pulse" style={{
      background: '#FFF8F0',
      border: '1px solid #EEEBE6',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ background: '#E8E2D8', height: 10, width: '40%', borderRadius: 2 }} />
      <div style={{ background: '#E8E2D8', height: 30, width: '55%', borderRadius: 2, marginTop: 2 }} />
      <div style={{ background: '#E8E2D8', height: 9, width: '75%', borderRadius: 2 }} />
    </div>
  )
}

// ── Single-select group dropdown ──────────────────────────────────────────────
function GroupSingleSelect({
  groups,
  selectedId,
  onChange,
}: {
  groups: Group[]
  selectedId: string | null | undefined
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectedGroup = groups.find(g => g.id === selectedId)
  const label = selectedId === null
    ? 'All Lists'
    : selectedGroup?.name ?? 'Select a list...'

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'white',
          border: '1px solid #E8E1D3',
          borderRadius: 0,
          padding: '8px 12px',
          fontSize: 13,
          color: '#1E2D3D',
          fontFamily: 'inherit',
          cursor: 'pointer',
          outline: 'none',
          minWidth: 180,
          justifyContent: 'space-between',
        }}
      >
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="#1E2D3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 50,
          background: 'white',
          border: '0.5px solid rgba(30,45,61,0.1)',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          maxHeight: 320,
          overflowY: 'auto',
          minWidth: '100%',
          width: 'max-content',
        }}>
          {/* All Lists */}
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: '#1E2D3D',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: '1px solid rgba(30,45,61,0.1)',
              background: selectedId === null ? '#FFF8F0' : 'white',
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            All Lists
          </button>

          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => { onChange(g.id); setOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: '#1E2D3D',
                fontFamily: 'var(--font-sans)',
                background: selectedId === g.id ? '#FFF8F0' : 'white',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '0.5px solid rgba(30,45,61,0.05)',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (selectedId !== g.id) (e.currentTarget as HTMLElement).style.background = '#FFF8F0' }}
              onMouseLeave={e => { if (selectedId !== g.id) (e.currentTarget as HTMLElement).style.background = 'white' }}
            >
              <span style={{ flex: 1 }}>{g.name}</span>
              <span style={{ color: 'rgba(30,45,61,0.5)', fontSize: 12, marginLeft: 8 }}>
                {g.active_subscribers_count.toLocaleString()} subs
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MailerLitePage() {
  const [coachTitle, setCoachTitle] = useState('Your marketing coach says')
  useEffect(() => { setCoachTitle(getCoachTitle()) }, [])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [prevAnalysis, setPrevAnalysis] = useState<Analysis | null>(null)
  const [liveml, setLiveml] = useState<MailerLiteData | null>(null)
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [liveCampaigns, setLiveCampaigns] = useState<LiveCampaign[]>([])
  const [flaggedCampaign, setFlaggedCampaign] = useState<FlaggedCampaign | null>(null)
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [campaignsError, setCampaignsError] = useState(false)
  const [unsubAnalysis, setUnsubAnalysis] = useState<UnsubAnalysis | null>(null)

  // Multi-list state
  const [mlLists, setMlLists] = useState<MLList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)

  // Group selector state
  const [groups, setGroups] = useState<Group[]>([])
  // undefined = nothing chosen yet | null = All Lists | string = specific group ID
  const [selectedGroupId, setSelectedGroupId] = useState<string | null | undefined>(undefined)
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null)
  const [groupStatsLoading, setGroupStatsLoading] = useState(false)
  const [metricsVisible, setMetricsVisible] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => {
          if (d.analysis) setAnalysis(d.analysis as Analysis)
          if (d.analyses?.length >= 2) {
            setPrevAnalysis((d.analyses[1] as any)?.data as Analysis)
          }
        })
        .catch(() => {}),
      fetch('/api/prefs')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { if (d.goals) setGoals(d.goals) })
        .catch(() => {}),
      fetch('/api/mailerlite/lists/saved')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          const lists: MLList[] = d.lists ?? []
          setMlLists(lists)
          if (lists.length > 0) setActiveListId(lists[0].id)
        })
        .catch(() => {}),
      fetch('/api/mailerlite/groups')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          const loadedGroups: Group[] = (d.groups ?? []).map((g: any) => ({
            id: String(g.id),
            name: g.name ?? 'Unnamed Group',
            active_subscribers_count: Number(g.active_subscribers_count ?? 0),
            openRate: Number(g.openRate ?? 0),
            clickRate: Number(g.clickRate ?? 0),
            unsubscribedCount: Number(g.unsubscribedCount ?? 0),
          }))
          setGroups(loadedGroups)
          try {
            const stored = localStorage.getItem('mailerlite_selected_group')
            if (stored === 'all') {
              setSelectedGroupId(null)
            } else if (stored && loadedGroups.find(g => g.id === stored)) {
              setSelectedGroupId(stored)
            }
            // else leave as undefined (unselected) — show empty state
          } catch {}
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false))

    fetch('/api/mailerlite/campaigns')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setLiveCampaigns(d.campaigns ?? [])
        setFlaggedCampaign(d.flaggedCampaign ?? null)
      })
      .catch(() => { setCampaignsError(true) })
      .finally(() => setCampaignsLoading(false))
  }, [])

  // Fetch account-wide stats once on mount (campaigns, automations, etc.)
  useEffect(() => {
    let cancelled = false
    fetch('/api/mailerlite')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (!cancelled && d.data) setLiveml(d.data as MailerLiteData) })
      .catch(err => { if (!cancelled) console.warn('[MailerLite page] live fetch failed:', err) })
    return () => { cancelled = true }
  }, [])

  // Fetch group-specific stats when a group is selected
  useEffect(() => {
    if (selectedGroupId === undefined) {
      setGroupStats(null)
      setGroupStatsLoading(false)
      return
    }
    if (selectedGroupId === null) {
      // All Lists — use liveml metrics
      setGroupStats(null)
      setGroupStatsLoading(false)
      return
    }
    let cancelled = false
    setGroupStatsLoading(true)
    setGroupStats(null)
    setMetricsVisible(false)
    fetch(`/api/mailerlite/groups/${encodeURIComponent(selectedGroupId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (!cancelled) {
          setGroupStats(d as GroupStats)
          setGroupStatsLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.warn('[MailerLite page] group stats fetch failed:', err)
          setGroupStatsLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [selectedGroupId])

  // Trigger fade-in when metrics become available
  useEffect(() => {
    const showingAccountWide = selectedGroupId === null || groups.length === 0
    if (showingAccountWide && liveml) {
      setMetricsVisible(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setMetricsVisible(true)))
    } else if (!showingAccountWide && selectedGroupId !== undefined && groupStats) {
      setMetricsVisible(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setMetricsVisible(true)))
    }
  }, [groupStats, liveml, selectedGroupId, groups.length])

  // Fetch unsub analysis after liveml is available (non-blocking, client-side)
  useEffect(() => {
    if (!liveml) return
    fetch(`/api/mailerlite/unsub-analysis?listSize=${liveml.listSize}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (d.analysis) setUnsubAnalysis(d.analysis as UnsubAnalysis) })
      .catch(() => {})
  }, [liveml])

  // Full account-wide data (campaigns, automations, benchmarks etc.)
  const ml = liveml ?? analysis?.mailerLite ?? null

  // Metrics to show in the Performance cards — group-specific or account-wide
  // If no groups exist, always show account-wide stats
  const performanceMetrics = (selectedGroupId === null || groups.length === 0)
    ? ml   // All Lists or no groups
    : groupStats  // Specific group (or null if unselected/loading)

  // Top campaigns sorted by open rate for coach copy
  const topCampaigns = [...liveCampaigns].sort((a, b) => b.openRate - a.openRate)

  // Use user's custom targets if set, else fall back to author averages
  const openTarget  = goals.email_open_rate  ?? 20
  const clickTarget = goals.email_click_rate ?? 1.5

  const openSub  = goals.email_open_rate
    ? `Your target: ${goals.email_open_rate}% · Author avg: 20–25%`
    : 'Author avg: 20–25%'
  const clickSub = goals.email_click_rate
    ? `Your target: ${goals.email_click_rate}% · Author avg: 1.5–2.5%`
    : 'Author avg: 1.5–2.5%'

  const benchmarks = [
    { metric: 'Open Rate',  yours: ml?.openRate  ?? 0, avg: '20–25',   unit: '%', good: (v: number) => v >= openTarget  },
    { metric: 'Click Rate', yours: ml?.clickRate ?? 0, avg: '1.5–2.5', unit: '%', good: (v: number) => v >= clickTarget },
    { metric: 'List Size',  yours: ml?.listSize  ?? 0, avg: null, unit: '', good: () => true },
    { metric: 'Unsubscribes (recent)', yours: ml?.unsubscribes ?? 0, avg: null, unit: '', good: (v: number) => v < 30 },
  ]

  function handleGroupChange(id: string | null) {
    setSelectedGroupId(id)
    if (id === null) {
      localStorage.setItem('mailerlite_selected_group', 'all')
    } else {
      localStorage.setItem('mailerlite_selected_group', id)
    }
  }

  if (loading) {
    return (
      <BoutiqueChannelPageLayout>
        <BoutiquePageHeader title="MailerLite" subtitle="Open rates · List health · Subscriber trends" />
        <BoutiquePageSkeleton cols={4} />
      </BoutiqueChannelPageLayout>
    )
  }

  return (
    <DashboardErrorBoundary>
    <BoutiqueChannelPageLayout>
      <BoutiquePageHeader title="MailerLite" subtitle="Open rates · List health · Subscriber trends" />
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {!ml ? (
        <BoutiqueEmptyState
          message="MailerLite not connected"
          ctaLabel="Go to Settings → Connections →"
          ctaHref="/dashboard/settings#connections"
        />
      ) : (
        <>
          <GoalSection
            page="mailerlite"
            currentValues={{
              email_open_rate: ml.openRate,
              email_list_size: ml.listSize,
            }}
          />

          {/* ── Multi-list: combined totals + tab strip ─────────────────── */}
          {mlLists.length >= 2 && (
            <div className="mb-4">
              {/* Combined totals */}
              <div className="px-5 py-3 mb-3 flex items-center gap-6"
                style={{ background: 'white', border: '1px solid #EEEBE6' }}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>Total active (all lists)</div>
                  <div className="text-[22px] font-semibold" style={{ color: '#1E2D3D' }}>
                    {mlLists.reduce((s, l) => s + l.activeCount, 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ width: '0.5px', height: 32, background: 'rgba(30,45,61,0.1)' }} />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>Total unsubscribed</div>
                  <div className="text-[22px] font-semibold" style={{ color: '#F97B6B' }}>
                    {mlLists.reduce((s, l) => s + l.unsubCount, 0).toLocaleString()}
                  </div>
                </div>
                <div className="ml-auto text-[10px]" style={{ color: '#9CA3AF' }}>
                  {mlLists.length} lists
                </div>
              </div>
              {/* Tab strip */}
              <div className="flex gap-1 flex-wrap">
                {mlLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className="text-[11px] font-semibold px-3 py-1.5 border-none cursor-pointer transition-all"
                    style={{
                      background: activeListId === list.id ? '#1E2D3D' : 'white',
                      color: activeListId === list.id ? 'white' : '#6B7280',
                      border: activeListId === list.id ? '1px solid #1E2D3D' : '1px solid #E8E1D3',
                    }}
                  >
                    {list.name}
                    <span className="ml-1.5 text-[10px] opacity-70">
                      {list.activeCount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
              {/* Active list detail card */}
              {(() => {
                const active = mlLists.find(l => l.id === activeListId)
                if (!active) return null
                const lastSync = active.lastSyncedAt
                  ? new Date(active.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Never synced'
                return (
                  <div className="mt-3 px-5 py-3 flex items-center gap-6"
                    style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1E2D3D', fontWeight: 600 }}>
                      {active.name}
                    </span>
                    <div>
                      <div className="text-[10px]" style={{ color: '#9CA3AF' }}>Active</div>
                      <div className="text-[16px] font-semibold" style={{ color: '#1E2D3D' }}>{active.activeCount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px]" style={{ color: '#9CA3AF' }}>Unsubscribed</div>
                      <div className="text-[16px] font-semibold" style={{ color: '#F97B6B' }}>{active.unsubCount.toLocaleString()}</div>
                    </div>
                    <div className="ml-auto text-[10px]" style={{ color: '#9CA3AF' }}>
                      Synced: {lastSync}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#34d399' }}>
              Live
            </span>
            <span className="text-[11px]" style={{ color: '#6B7280' }}>
              Data pulled fresh from MailerLite API on every load
            </span>
          </div>


          {/* ── Group selector ────────────────────────────────────────── */}
          {groups.length >= 1 && (
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: 'rgba(30,45,61,0.5)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Viewing:</span>
              <GroupSingleSelect
                groups={groups}
                selectedId={selectedGroupId}
                onChange={handleGroupChange}
              />
            </div>
          )}

          {/* Amber pill: shown when a specific group is selected */}
          {selectedGroupId && groupStats && (
            <div className="mb-2">
              <span style={{
                background: '#E9A020',
                color: '#1E2D3D',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 9999,
                fontFamily: 'var(--font-sans)',
                display: 'inline-block',
              }}>
                Viewing: {groupStats.name}
              </span>
            </div>
          )}

          <BoutiqueSectionLabel label="Performance" />

          {/* Performance metric cards — empty state / skeleton / real data */}
          <div style={{ marginBottom: 32 }}>
            {(selectedGroupId === undefined && groups.length >= 1) ? (
              /* No selection yet */
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'white',
                border: '1px solid #EEEBE6',
              }}>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1E2D3D',
                  marginBottom: 8,
                }}>
                  Pick a list to see how she&apos;s doing.
                </p>
                <p style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: '#1E2D3D',
                  opacity: 0.65,
                }}>
                  Your readers are in here somewhere. Let&apos;s find out what they love.
                </p>
              </div>
            ) : groupStatsLoading ? (
              /* Loading skeleton */
              <>
                <BoutiqueDataGrid cols={3}>
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </BoutiqueDataGrid>
                <div style={{ marginTop: 1 }}>
                  <BoutiqueDataGrid cols={2}>
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                  </BoutiqueDataGrid>
                </div>
              </>
            ) : performanceMetrics ? (
              /* Real data with fade-in */
              <div style={{
                opacity: metricsVisible ? 1 : 0,
                transition: 'opacity 200ms ease-in',
              }}>
                <BoutiqueDataGrid cols={3}>
                  <BoutiqueMetricCard label="Open Rate" value={fmtPct(performanceMetrics.openRate)} colorDot="#5BBFB5" subtext={openSub} />
                  <BoutiqueMetricCard label="List Size" value={performanceMetrics.listSize.toLocaleString()} colorDot="#5BBFB5" subtext="Active subscribers" />
                  <BoutiqueMetricCard label="Click Rate" value={fmtPct(performanceMetrics.clickRate)} colorDot="#5BBFB5" subtext={clickSub} />
                </BoutiqueDataGrid>
                <div style={{ marginTop: 1 }}>
                  <BoutiqueDataGrid cols={2}>
                    <BoutiqueMetricCard label="Unsubscribes" value={String(performanceMetrics.unsubscribes)} colorDot="#5BBFB5" subtext="Total unsubscribed" />
                    <BoutiqueMetricCard label="Total Sent" value={performanceMetrics.sentCount != null ? performanceMetrics.sentCount.toLocaleString() : '—'} colorDot="#5BBFB5" subtext="Emails sent (list lifetime)" />
                  </BoutiqueDataGrid>
                </div>
              </div>
            ) : null}
          </div>

          {analysis && <InsightCallouts analysis={{ ...analysis, meta: undefined, kdp: undefined, pinterest: undefined }} page="mailerlite" />}
          <UnsubNote analysis={unsubAnalysis} />
          {ml && <BoutiqueCoachBox>{buildEmailCoach(ml, topCampaigns, flaggedCampaign, unsubAnalysis)}</BoutiqueCoachBox>}

          {/* Email Health Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {(() => {
              const totalSent = ml.sentCount ?? 0
              const avgUnsubs = ml.campaigns.length > 0
                ? Math.round(ml.campaigns.reduce((s, c) => s + c.unsubscribes, 0) / ml.campaigns.length * 10) / 10
                : 0
              const topCampaign = [...ml.campaigns].sort((a, b) => b.openRate - a.openRate)[0]
              const metrics = [
                { label: 'Total Sent', value: totalSent.toLocaleString(), sub: `${ml.campaigns.length} campaigns tracked`, color: '#38bdf8' },
                { label: 'Avg Unsubs / Campaign', value: String(avgUnsubs), sub: avgUnsubs > 5 ? 'Higher than ideal' : 'Healthy range', color: avgUnsubs > 5 ? '#F97B6B' : '#6EBF8B' },
                { label: 'Best Open Rate', value: topCampaign ? fmtPct(topCampaign.openRate) : '—', sub: topCampaign ? topCampaign.name : 'No campaigns', color: '#D97706' },
              ]
              return metrics.map((m, i) => (
                <div key={i} className="p-4" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                  <div className="text-[10px] font-bold tracking-[1px] uppercase mb-1.5" style={{ color: '#6B7280' }}>{m.label}</div>
                  <div className="text-[24px] font-semibold tracking-tight leading-none mb-1" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[11px]" style={{ color: '#6B7280' }}>{m.sub}</div>
                </div>
              ))
            })()}
          </div>

          {/* Your Audience, Benchmarked */}
          <CollapsibleSection
            title="Your Audience, Benchmarked"
            storageKey="ml-section-benchmarked"
            className="mb-5"
            badge={
              <span className="cursor-default"
                title="Based on email marketing data for indie authors and fiction publishers. Your genre may vary."
                style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280' }}>
                Author benchmarks
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ background: '#F7F1E6' }}>
                    {['Metric', 'Your Number', 'Author Average', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5"
                        style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((row, i) => {
                    const isGood = row.good(row.yours)
                    return (
                      <tr key={i} className="border-t" style={{
                        borderColor: 'rgba(0,0,0,0.06)',
                        borderLeft: !isGood ? '3px solid #F97B6B' : undefined,
                        background: !isGood ? 'rgba(249,123,107,0.04)' : undefined,
                      }}>
                        <td className="px-4 py-3" style={{ color: '#1E2D3D' }}>{row.metric}</td>
                        <td className="px-4 py-3 font-mono font-bold"
                          style={{ color: isGood ? '#34d399' : '#fb7185' }}>
                          {row.unit === '%' ? fmtPct(row.yours) : row.yours.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>
                          {row.avg !== null ? `${row.avg}${row.unit}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontStyle: 'italic',
                              fontSize: 9,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              color: isGood ? '#34d399' : '#fb7185',
                            }}>
                            {isGood ? 'Above Avg' : 'Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* ── Month-over-Month + Unsubscribe Spikes (#31) ─────────── */}
          {prevAnalysis?.mailerLite && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Left: Comparison table */}
              <div style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                <div className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
                  Month-over-Month
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                      <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: '#6B7280' }}>Metric</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: '#6B7280' }}>Last Month</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: '#6B7280' }}>This Month</th>
                      <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: '#6B7280' }}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const prev = prevAnalysis.mailerLite!
                      const rows = [
                        { label: 'Campaigns Sent', prev: prev.campaigns.length, curr: ml!.campaigns.length },
                        { label: 'Open Rate', prev: prev.openRate, curr: ml!.openRate, unit: '%' },
                        { label: 'Click Rate', prev: prev.clickRate, curr: ml!.clickRate, unit: '%' },
                        { label: 'Unsubscribes', prev: prev.unsubscribes, curr: ml!.unsubscribes },
                      ]
                      return rows.map((r, i) => {
                        const diff = r.curr - r.prev
                        const isGood = r.label === 'Unsubscribes' ? diff <= 0 : diff >= 0
                        return (
                          <tr key={i} className="border-t" style={{ borderColor: '#EEEBE6' }}>
                            <td className="px-4 py-2.5" style={{ color: '#374151' }}>{r.label}</td>
                            <td className="px-4 py-2.5 text-right font-mono" style={{ color: '#6B7280' }}>{r.prev}{r.unit || ''}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: '#1E2D3D' }}>{r.curr}{r.unit || ''}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: isGood ? '#6EBF8B' : '#F97B6B' }}>
                              {diff > 0 ? '+' : ''}{r.unit === '%' ? diff.toFixed(1) : diff}{r.unit || ''}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Right: Unsubscribe spikes */}
              <div style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                <div className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
                  Unsubscribe Spikes — Watch
                </div>
                <div className="px-5 py-4">
                  {(() => {
                    const sorted = [...ml!.campaigns]
                      .filter(c => c.unsubscribes > 0)
                      .sort((a, b) => b.unsubscribes - a.unsubscribes)
                      .slice(0, 5)
                    const max = sorted[0]?.unsubscribes || 1
                    if (sorted.length === 0) {
                      return <div className="text-[12px]" style={{ color: '#6B7280' }}>No unsubscribe spikes detected. Keep it up!</div>
                    }
                    return (
                      <div className="space-y-2.5">
                        {sorted.map((c, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11.5px] truncate max-w-[200px]" style={{ color: '#374151' }}>{c.name}</span>
                              <span className="text-[11px] font-mono font-bold" style={{ color: '#F97B6B' }}>{c.unsubscribes}</span>
                            </div>
                            <div className="h-2 overflow-hidden" style={{ background: 'rgba(249,123,107,0.1)' }}>
                              <div className="h-full" style={{
                                width: `${(c.unsubscribes / max) * 100}%`,
                                background: '#F97B6B',
                                opacity: 0.5 + (i === 0 ? 0.5 : 0.2),
                              }} />
                            </div>
                          </div>
                        ))}
                        <div className="text-[11px] mt-3 pt-2" style={{ color: '#6B7280', borderTop: '1px solid #EEEBE6' }}>
                          High unsubscribes often correlate with subject line mismatches or send frequency.
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ── Automation Health (#31) ───────────────────────────────── */}
          {ml!.automations !== undefined && (
            <CollapsibleSection
              title="Automation Health"
              storageKey="ml-section-automation"
              className="mb-5"
              badge={ml!.automations.length > 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280' }}>
                  Live from MailerLite
                </span>
              ) : undefined}
            >
              {ml!.automations.length === 0 ? (
                <div className="px-5 py-8 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center mb-1" style={{ background: '#F7F1E6' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2"/><path d="M9 6v4M9 12h.01" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <p className="text-[12px] text-center" style={{ color: '#6B7280' }}>
                    No automations found — create one in MailerLite to see health data here
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr style={{ background: '#F7F1E6' }}>
                        {['Automation', 'Status', 'Subscribers', 'Open Rate', 'Click Rate', 'Health', ''].map(h => (
                          <th key={h} className="text-left px-4 py-2"
                            style={{ fontFamily: 'var(--font-mono)', fontStyle: 'italic', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6B7280', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ml!.automations.map((auto: MailerLiteAutomation, i: number) => {
                        const healthColors = { green: '#6EBF8B', amber: '#D97706', red: '#F97B6B' }
                        const healthLabels = { green: 'Healthy', amber: 'Needs Attention', red: 'Stalled' }
                        return (
                          <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                            <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#1E2D3D' }}>{auto.name}</td>
                            <td className="px-4 py-2.5">
                              <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontStyle: 'italic',
                                  fontSize: 9,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  color: auto.status === 'active' ? '#6EBF8B' : '#F97B6B',
                                }}>
                                {auto.status === 'active' ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: '#1E2D3D' }}>{auto.subscriberCount.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: auto.openRate >= 20 ? '#6EBF8B' : '#D97706' }}>{auto.openRate}%</td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: auto.clickRate >= 1 ? '#6EBF8B' : '#D97706' }}>{auto.clickRate}%</td>
                            <td className="px-4 py-2.5">
                              <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontStyle: 'italic',
                                  fontSize: 9,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  color: healthColors[auto.health],
                                }}>
                                {healthLabels[auto.health]}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {auto.health !== 'green' && auto.id && (
                                <a
                                  href={`https://dashboard.mailerlite.com/automations/${auto.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#D97706', fontSize: 12, textDecoration: 'none' }}
                                  onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  Fix in MailerLite →
                                </a>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Campaign Open Rate Trend — Chart.js via lib/chartConfig */}
          {ml.campaigns.length >= 3 && (
            <CollapsibleSection
              title="Campaign Open Rate Trend"
              storageKey="ml-section-trend"
              className="mb-5"
            >
              <div className="px-5 py-4">
                <CampaignOpenRateChart campaigns={ml.campaigns} target={openTarget} />
              </div>
            </CollapsibleSection>
          )}

          {/* Live campaign performance table */}
          <CampaignPerformanceSection
            campaigns={liveCampaigns}
            flaggedCampaign={flaggedCampaign}
            loading={campaignsLoading}
            error={campaignsError}
          />
        </>
      )}
    </BoutiqueChannelPageLayout>
    </DashboardErrorBoundary>
  )
}
