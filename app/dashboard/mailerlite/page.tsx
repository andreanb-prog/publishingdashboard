'use client'
// app/(dashboard)/mailerlite/page.tsx
import { Suspense, useEffect, useRef, useState } from 'react'
import ChartJS from 'chart.js/auto'
import { ChartLegend } from '@/components/ChartLegend'
import { CHART_COLORS, BASE_CHART_OPTIONS, barDataset } from '@/lib/chartConfig'
import { DarkPage, DarkKPIStrip, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { GoalSection } from '@/components/GoalSection'
import { getCoachTitle } from '@/lib/coachTitle'
import { InsightCallouts } from '@/components/InsightCallout'
import type { Analysis, MailerLiteAutomation, MailerLiteData } from '@/types'


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

export default function MailerLitePage() {
  const [coachTitle] = useState(() => getCoachTitle())
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [prevAnalysis, setPrevAnalysis] = useState<Analysis | null>(null)
  const [liveml, setLiveml] = useState<MailerLiteData | null>(null)
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

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
    ]).finally(() => setLoading(false))
  }, [])

  // Prefer live data from API; fall back to stored analysis snapshot
  const ml = liveml ?? analysis?.mailerLite ?? null
  const coach = (analysis as any)?.emailCoach

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
    { metric: 'Open Rate',  yours: ml?.openRate  || 0, avg: '20–25',   unit: '%', good: (v: number) => v >= openTarget  },
    { metric: 'Click Rate', yours: ml?.clickRate || 0, avg: '1.5–2.5', unit: '%', good: (v: number) => v >= clickTarget },
    { metric: 'List Size',  yours: ml?.listSize  || 0, avg: null, unit: '', good: () => true },
    { metric: 'Unsubscribes (recent)', yours: ml?.unsubscribes || 0, avg: null, unit: '', good: (v: number) => v < 30 },
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
          <p className="text-sm mb-4">Add your MailerLite API key in Settings to auto-pull your email stats</p>
          <a href="/dashboard/learn" className="inline-block px-6 py-2.5 rounded-lg font-semibold text-sm no-underline"
            style={{ background: '#e9a020', color: '#0d1f35' }}>Learn More →</a>
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

          <DarkKPIStrip cols={5} items={[
            { label: 'Open Rate',    value: `${ml.openRate}%`,                                     sub: openSub,  color: ml.openRate  >= openTarget  ? '#34d399' : '#fbbf24' },
            { label: 'List Size',    value: ml.listSize.toLocaleString(),                          sub: 'Active subscribers', color: '#38bdf8' },
            { label: 'Click Rate',   value: `${ml.clickRate}%`,                                    sub: clickSub, color: ml.clickRate >= clickTarget ? '#34d399' : '#fbbf24' },
            { label: 'Unsubscribes', value: ml.unsubscribes,                                       sub: 'Total unsubscribed', color: ml.unsubscribes > 30 ? '#fb7185' : '#34d399' },
            { label: 'Total Sent',   value: ml.sentCount != null ? ml.sentCount.toLocaleString() : '—', sub: 'Emails sent (list lifetime)', color: '#a78bfa' },
          ]} />

          {analysis && <InsightCallouts analysis={analysis} page="mailerlite" />}
          {coach && <DarkCoachBox color="#34d399" title={coachTitle}>{coach}</DarkCoachBox>}

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
                { label: 'Best Open Rate', value: topCampaign ? `${topCampaign.openRate}%` : '—', sub: topCampaign ? topCampaign.name : 'No campaigns', color: '#E9A020' },
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
          <div className="rounded-xl overflow-x-auto mb-5"
            style={{ background: 'white', border: '1px solid #EEEBE6' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EEEBE6' }}>
              <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Your Audience, Benchmarked</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full cursor-default"
                title="Based on email marketing data for indie authors and fiction publishers. Your genre may vary."
                style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}>
                ⓘ Author benchmarks
              </span>
            </div>
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
                        {row.yours}{row.unit}
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
          {ml!.automations && ml!.automations.length === 0 && (
            <div className="rounded-xl mb-5 px-5 py-8 flex flex-col items-center gap-2" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>Automation Health</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ background: '#F5F5F4' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2"/><path d="M9 6v4M9 12h.01" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <p className="text-[12px] text-center" style={{ color: '#6B7280' }}>
                No automations found — create one in MailerLite to see health data here
              </p>
            </div>
          )}
          {ml!.automations && ml!.automations.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EEEBE6' }}>
                <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Automation Health</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}>
                  Live from MailerLite
                </span>
              </div>
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

          {/* Campaign Open Rate Trend — Chart.js via lib/chartConfig */}
          {ml.campaigns.length >= 3 && (
            <div className="rounded-xl overflow-hidden mb-5" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <div className="px-5 py-3 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
                Campaign Open Rate Trend
              </div>
              <div className="px-5 py-4">
                <CampaignOpenRateChart campaigns={ml.campaigns} target={openTarget} />
              </div>
            </div>
          )}

          {/* Recent campaigns */}
          {ml.campaigns.length > 0 && (
            <div className="rounded-xl overflow-x-auto"
              style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #EEEBE6' }}>
                Recent Campaigns
              </div>
              <table className="w-full border-collapse text-[12px]" style={{ minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#F5F5F4' }}>
                    {['Campaign', 'Sent', 'Open Rate', 'Click Rate', 'Unsubs'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                        style={{ color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ml.campaigns.slice(0, 8).map((c, i) => (
                    <tr key={i} className="border-t hover:bg-stone-50"
                      style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                      <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#1E2D3D' }}>{c.name.replace(/^Copy of /i, '')}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: '#6B7280' }}>
                        {c.sentAt
                          ? new Date(c.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono"
                        style={{ color: c.openRate >= 22 ? '#34d399' : '#fbbf24' }}>
                        {c.openRate}%
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: '#d6d3d1' }}>{c.clickRate}%</td>
                      <td className="px-4 py-2.5 font-mono"
                        style={{ color: c.unsubscribes > 10 ? '#fb7185' : '#6B7280' }}>
                        {c.unsubscribes ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DarkPage>
  )
}
