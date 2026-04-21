'use client'
// app/(dashboard)/mailerlite/page.tsx
import { Suspense, useEffect, useRef, useState } from 'react'
import ChartJS from 'chart.js/auto'
import { ChartLegend } from '@/components/ChartLegend'
import { CHART_COLORS, BASE_CHART_OPTIONS, barDataset } from '@/lib/chartConfig'
import { DarkPage, DarkKPIStrip, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { GoalSection } from '@/components/GoalSection'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { getCoachTitle } from '@/lib/coachTitle'
import { fmtPct } from '@/lib/utils'
import { InsightCallouts } from '@/components/InsightCallout'
import type { Analysis, MailerLiteAutomation, MailerLiteData } from '@/types'
import type { LiveCampaign, FlaggedCampaign } from '@/app/api/mailerlite/campaigns/route'

// ── Build a live coach insight from real MailerLite numbers ───────────────────
// Always derived from live data so stale cached emailCoach never shows.
function buildEmailCoach(
  ml: MailerLiteData,
  topCampaigns?: { subject: string; openRate: number; clickRate: number }[],
  flaggedCampaign?: FlaggedCampaign | null,
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
  } else if (ml.unsubscribes > 50) {
    s3 = `You've had ${ml.unsubscribes} unsubscribes recently — higher than normal. Check send frequency or tighten your subject line relevance before your next campaign.`
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
    <div className="rounded-xl overflow-hidden mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
      <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
        Recent Campaigns
      </div>
      <table className="w-full border-collapse" style={{ minWidth: 520 }}>
        <thead>
          <tr style={{ background: '#F5F5F4' }}>
            {['Subject', 'Sent', 'Open Rate', 'Click Rate', 'Unsubs', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                style={{ color: '#6B7280' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map(i => (
            <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)', background: i % 2 === 1 ? '#FFF8F0' : 'white' }}>
              {[200, 60, 60, 60, 50, 60].map((w, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3 rounded animate-pulse" style={{ width: w, background: '#E5E7EB' }} />
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
      <div className="rounded-xl mb-5 px-5 py-8 text-center" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          Couldn't load campaign data. Check your MailerLite connection in Settings.
        </p>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl mb-5 px-5 py-8 text-center" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
        <p className="text-[12px]" style={{ color: '#6B7280' }}>
          No campaigns sent yet. Your campaign performance will appear here after your first send.
        </p>
      </div>
    )
  }

  const best = [...campaigns].sort((a, b) => b.openRate - a.openRate)[0]

  function openColor(rate: number) {
    if (rate >= 30) return '#6EBF8B'
    if (rate >= 20) return '#E9A020'
    return '#F97B6B'
  }
  function clickColor(rate: number) {
    if (rate >= 4) return '#6EBF8B'
    if (rate >= 2) return '#E9A020'
    return '#F97B6B'
  }

  return (
    <div className="mb-5">
      {/* Best performer callout */}
      <div className="rounded-xl px-5 py-3.5 mb-3 flex items-center gap-2.5"
        style={{ background: 'rgba(110,191,139,0.10)', border: '1px solid rgba(110,191,139,0.25)' }}>
        <span className="text-[13px]">🏆</span>
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
        <div className="rounded-xl px-5 py-3.5 mb-3 flex items-start gap-2.5"
          style={{ background: 'rgba(233,160,32,0.10)', border: '1px solid rgba(233,160,32,0.30)' }}>
          <span className="text-[14px] mt-0.5">⚠️</span>
          <span className="text-[12.5px]" style={{ color: '#1E2D3D' }}>
            <span className="font-semibold">{flaggedCampaign.name}</span> triggered an unsubscribe spike
            {' '}— <span className="font-semibold" style={{ color: '#E9A020' }}>{flaggedCampaign.unsubscribeRate}% unsub rate</span>
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
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}>
            Live · last 10 sent
          </span>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-[12px]" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ background: '#F5F5F4' }}>
                {['Subject', 'Sent', 'Open Rate', 'Click Rate', 'Unsubs', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                    style={{ color: '#6B7280' }}>{h}</th>
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
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: '#6B7280' }}>
                    {c.sent > 0 ? c.sent.toLocaleString() : '—'}
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

interface MLList { id: string; mailerliteId: string; name: string; activeCount: number; unsubCount: number; lastSyncedAt: string | null }

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

  // Multi-list state
  const [mlLists, setMlLists] = useState<MLList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)

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
      fetch('/api/mailerlite')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => {
          console.log('[MailerLite page] live data:', d)
          if (d.data) setLiveml(d.data as MailerLiteData)
        })
        .catch((err) => { console.warn('[MailerLite page] live fetch failed:', err) }),
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

  // Prefer live data from API; fall back to stored analysis snapshot
  const ml = liveml ?? analysis?.mailerLite ?? null

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

  if (loading) {
    return (
      <DarkPage title="📧 MailerLite — Email Marketing" subtitle="Open rates · List health · Subscriber trends">
        <PageSkeleton cols={4} />
      </DarkPage>
    )
  }

  return (
    <DarkPage title="📧 MailerLite — Email Marketing" subtitle="Open rates · List health · Subscriber trends">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {!ml ? (
        <div className="text-center py-16" style={{ color: '#6B7280' }}>
          <div className="text-4xl mb-4">📧</div>
          <div className="font-sans text-xl mb-2" style={{ color: '#1E2D3D' }}>MailerLite not connected</div>
          <p className="text-sm mb-4">Connect your MailerLite account in Settings to see your email stats</p>
          <a href="/dashboard/settings#connections" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Go to Settings → Connections →</a>
        </div>
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
              <div className="rounded-xl px-5 py-3 mb-3 flex items-center gap-6"
                style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
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
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all"
                    style={{
                      background: activeListId === list.id ? '#1E2D3D' : 'white',
                      color: activeListId === list.id ? 'white' : '#6B7280',
                      border: activeListId === list.id ? 'none' : '0.5px solid rgba(30,45,61,0.15)',
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
                  <div className="mt-3 rounded-xl px-5 py-3 flex items-center gap-6"
                    style={{ background: '#FFF8F0', border: '0.5px solid rgba(30,45,61,0.08)' }}>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: '#1E2D3D', color: 'white' }}>
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
              ● Live
            </span>
            <span className="text-[11px]" style={{ color: '#6B7280' }}>
              Data pulled fresh from MailerLite API on every load
            </span>
          </div>

          <DarkKPIStrip cols={5} items={[
            { label: 'Open Rate',    value: fmtPct(ml.openRate),                                   sub: openSub,  color: ml.openRate  >= openTarget  ? '#34d399' : '#fbbf24' },
            { label: 'List Size',    value: ml.listSize.toLocaleString(),                          sub: 'Active subscribers', color: '#38bdf8' },
            { label: 'Click Rate',   value: fmtPct(ml.clickRate),                                  sub: clickSub, color: ml.clickRate >= clickTarget ? '#34d399' : '#fbbf24' },
            { label: 'Unsubscribes', value: ml.unsubscribes,                                       sub: 'Total unsubscribed', color: ml.unsubscribes > 30 ? '#fb7185' : '#34d399' },
            { label: 'Total Sent',   value: ml.sentCount != null ? ml.sentCount.toLocaleString() : '—', sub: 'Emails sent (list lifetime)', color: '#a78bfa' },
          ]} />

          {analysis && <InsightCallouts analysis={{ ...analysis, meta: undefined, kdp: undefined, pinterest: undefined }} page="mailerlite" />}
          {ml && <DarkCoachBox color="#34d399" title={coachTitle}>{buildEmailCoach(ml, topCampaigns, flaggedCampaign)}</DarkCoachBox>}

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
                { label: 'Best Open Rate', value: topCampaign ? fmtPct(topCampaign.openRate) : '—', sub: topCampaign ? topCampaign.name : 'No campaigns', color: '#E9A020' },
              ]
              return metrics.map((m, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
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
              <span className="text-[11px] px-2 py-0.5 rounded-full cursor-default"
                title="Based on email marketing data for indie authors and fiction publishers. Your genre may vary."
                style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}>
                ⓘ Author benchmarks
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr style={{ background: '#F5F5F4' }}>
                    {['Metric', 'Your Number', 'Author Average', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                        style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((row, i) => {
                    const isGood = row.good(row.yours)
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        <td className="px-4 py-3" style={{ color: '#1E2D3D' }}>{row.metric}</td>
                        <td className="px-4 py-3 font-mono font-bold"
                          style={{ color: isGood ? '#34d399' : '#fb7185' }}>
                          {row.unit === '%' ? fmtPct(row.yours) : row.yours.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>
                          {row.avg !== null ? `${row.avg}${row.unit}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                            style={{
                              background: isGood ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)',
                              color: isGood ? '#34d399' : '#fb7185',
                            }}>
                            {isGood ? '🟢 Above Average' : '🔴 Needs Attention'}
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
              <div className="rounded-xl overflow-hidden" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
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
              <div className="rounded-xl overflow-hidden" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
                <div className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
                  ⚠ Unsubscribe Spikes — Watch
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
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(249,123,107,0.1)' }}>
                              <div className="h-full rounded-full" style={{
                                width: `${(c.unsubscribes / max) * 100}%`,
                                background: `linear-gradient(90deg, rgba(249,123,107,${0.3 + (i === 0 ? 0.5 : 0.2)}), #F97B6B)`,
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
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}>
                  Live from MailerLite
                </span>
              ) : undefined}
            >
              {ml!.automations.length === 0 ? (
                <div className="px-5 py-8 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ background: '#F5F5F4' }}>
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
                      <tr style={{ background: '#F5F5F4' }}>
                        {['Automation', 'Status', 'Subscribers', 'Open Rate', 'Click Rate', 'Health'].map(h => (
                          <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                            style={{ color: '#6B7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ml!.automations.map((auto: MailerLiteAutomation, i: number) => {
                        const healthColors = { green: '#6EBF8B', amber: '#E9A020', red: '#F97B6B' }
                        const healthLabels = { green: 'Healthy', amber: 'Needs Attention', red: 'Stalled' }
                        return (
                          <tr key={i} className="border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                            <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#1E2D3D' }}>{auto.name}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: auto.status === 'active' ? 'rgba(110,191,139,0.12)' : 'rgba(249,123,107,0.12)',
                                  color: auto.status === 'active' ? '#6EBF8B' : '#F97B6B',
                                }}>
                                {auto.status === 'active' ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: '#1E2D3D' }}>{auto.subscriberCount.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: auto.openRate >= 20 ? '#6EBF8B' : '#E9A020' }}>{auto.openRate}%</td>
                            <td className="px-4 py-2.5 font-mono" style={{ color: auto.clickRate >= 1 ? '#6EBF8B' : '#E9A020' }}>{auto.clickRate}%</td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: `${healthColors[auto.health]}20`, color: healthColors[auto.health] }}>
                                {healthLabels[auto.health]}
                              </span>
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
    </DarkPage>
  )
}
