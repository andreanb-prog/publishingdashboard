'use client'
// app/dashboard/list-building/page.tsx
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ChartJS from 'chart.js/auto'
import { getCoachTitle } from '@/lib/coachTitle'
import { CHART_COLORS, BASE_CHART_OPTIONS, areaDataset } from '@/lib/chartConfig'
import { tokens } from '@/lib/tokens'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

interface Campaign {
  id: string
  campaignName: string
  spend: number
  subscribers: number
  startDate: string
  endDate: string
  notes: string | null
  createdAt: string
}

function fmt$(n: number) {
  return '$' + n.toFixed(2)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function getStatus(costPerSub: number, subValue: number) {
  if (costPerSub <= subValue * 0.5) return 'SCALE'
  if (costPerSub <= subValue) return 'WATCH'
  return 'CUT'
}

const STATUS_STYLES = {
  SCALE: { bg: 'rgba(52,211,153,0.12)', color: '#0f6b46', label: '🟢 Scale' },
  WATCH: { bg: 'rgba(251,191,36,0.12)', color: '#7a4f00', label: '🟡 Watch' },
  CUT:   { bg: 'rgba(251,113,133,0.12)', color: '#8c2020', label: '🔴 Cut'   },
}

// ── BookFunnel types ─────────────────────────────────────────────────────────
interface BfStats {
  totalCount:  number
  confirmRate: number
  topBook:     string | null
  byBook:      Record<string, number>
  byDate:      Record<string, number>
}

// ── BookFunnel bar chart: downloads by book ──────────────────────────────────
function BfBookChart({ byBook }: { byBook: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const entries = Object.entries(byBook).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (entries.length === 0) return
    if (chartRef.current) chartRef.current.destroy()

    const BOOK_COLORS = tokens.colors.books
    chartRef.current = new ChartJS(canvasRef.current.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: entries.map(([title]) => title.length > 22 ? title.substring(0, 22) + '…' : title),
        datasets: [{
          label: 'Downloads',
          data: entries.map(([, n]) => n),
          backgroundColor: entries.map((_, i) => BOOK_COLORS[i % BOOK_COLORS.length] + 'CC'),
          hoverBackgroundColor: entries.map((_, i) => BOOK_COLORS[i % BOOK_COLORS.length]),
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: 'bottom',
        }],
      },
      options: {
        ...BASE_CHART_OPTIONS,
        indexAxis: 'y' as const,
        plugins: { ...BASE_CHART_OPTIONS.plugins },
        scales: {
          x: { ...BASE_CHART_OPTIONS.scales.x },
          y: {
            ...BASE_CHART_OPTIONS.scales.y,
            grid: { display: false },
            ticks: { ...BASE_CHART_OPTIONS.scales.y.ticks, font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
        },
      } as any,
    })
    return () => { chartRef.current?.destroy() }
  }, [byBook])

  if (Object.keys(byBook).length === 0) {
    return <div className="text-[12px] text-center py-6" style={{ color: '#9CA3AF' }}>No downloads yet</div>
  }
  return <div style={{ minHeight: 180, position: 'relative' }}><canvas ref={canvasRef} /></div>
}

// ── BookFunnel area chart: downloads over time ────────────────────────────────
function BfTimeChart({ byDate }: { byDate: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))
    if (sorted.length < 2) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = sorted.map(([d]) => {
      const dt = new Date(d + 'T00:00:00')
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    const values = sorted.map(([, n]) => n)

    chartRef.current = new ChartJS(canvasRef.current.getContext('2d')!, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          ...areaDataset(values, CHART_COLORS.teal, 'Downloads'),
          backgroundColor: (ctx: any) => {
            const { ctx: c, chartArea } = ctx.chart
            if (!chartArea) return CHART_COLORS.teal + '40'
            const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, CHART_COLORS.teal + '3F')
            g.addColorStop(1, CHART_COLORS.teal + '05')
            return g
          },
        }],
      },
      options: {
        ...BASE_CHART_OPTIONS,
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
          x: { ...BASE_CHART_OPTIONS.scales.x, ticks: { ...BASE_CHART_OPTIONS.scales.x.ticks, maxRotation: 0 } },
          y: BASE_CHART_OPTIONS.scales.y,
        },
      } as any,
    })
    return () => { chartRef.current?.destroy() }
  }, [byDate])

  if (Object.keys(byDate).length < 2) {
    return <div className="text-[12px] text-center py-6" style={{ color: '#9CA3AF' }}>Not enough data to chart yet</div>
  }
  return <div style={{ minHeight: 180, position: 'relative' }}><canvas ref={canvasRef} /></div>
}

export default function ListBuildingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!ADMIN_EMAILS.includes(session?.user?.email ?? '')) {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  const [coachTitle, setCoachTitle] = useState('Your marketing coach says')
  useEffect(() => { setCoachTitle(getCoachTitle()) }, [])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subValue, setSubValue] = useState<number>(1.0)
  const [subValueInput, setSubValueInput] = useState('1.00')
  const [loading, setLoading] = useState(true)

  // Form state
  const [form, setForm] = useState({
    campaignName: '',
    spend: '',
    subscribers: '',
    startDate: '',
    endDate: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')

  // ── BookFunnel state ───────────────────────────────────────────────────────
  const [bfStats, setBfStats] = useState<BfStats | null>(null)
  const [metaSpend, setMetaSpend] = useState<number | null>(null)

  useEffect(() => {
    // Load persisted subValue
    const stored = localStorage.getItem('listbuilding_subvalue')
    if (stored) {
      const n = parseFloat(stored)
      if (!isNaN(n) && n > 0) { setSubValue(n); setSubValueInput(n.toFixed(2)) }
    }
    Promise.all([
      fetch('/api/list-building').then(r => r.ok ? r.json() : Promise.reject()).catch(() => ({ logs: [] })),
      fetch('/api/bookfunnel').then(r => r.ok ? r.json() : Promise.reject()).catch(() => null),
      fetch('/api/analyze').then(r => r.ok ? r.json() : Promise.reject()).catch(() => null),
    ]).then(([listData, bf, analysis]) => {
      setCampaigns(listData.logs || [])
      if (bf) setBfStats({ totalCount: bf.totalCount, confirmRate: bf.confirmRate, topBook: bf.topBook, byBook: bf.byBook, byDate: bf.byDate })
      const metaTotalSpend = analysis?.analysis?.meta?.totalSpend
      if (typeof metaTotalSpend === 'number') setMetaSpend(metaTotalSpend)
    }).finally(() => setLoading(false))
  }, [])

  function handleSubValueBlur() {
    const n = parseFloat(subValueInput)
    if (!isNaN(n) && n > 0) {
      setSubValue(n)
      localStorage.setItem('listbuilding_subvalue', String(n))
    } else {
      setSubValueInput(subValue.toFixed(2))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.campaignName || !form.spend || !form.subscribers || !form.startDate || !form.endDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/list-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setCampaigns(prev => [json.log, ...prev])
        setForm({ campaignName: '', spend: '', subscribers: '', startDate: '', endDate: '', notes: '' })
        setShowForm(false)
        setFeedback('Campaign added!')
        setTimeout(() => setFeedback(''), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch('/api/list-building', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  // KPIs — use Meta synced spend when available, fall back to manually logged spend
  const manualSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalSpend = metaSpend !== null ? metaSpend : manualSpend
  const totalSubs  = campaigns.reduce((s, c) => s + c.subscribers, 0)
  const avgCostPerSub = totalSubs > 0 ? totalSpend / totalSubs : 0
  const subRoas = totalSpend > 0 ? (totalSubs * subValue) / totalSpend : 0
  const breakEven = subValue > 0 ? totalSpend / subValue : 0

  // Coach message
  function coachMsg() {
    if (campaigns.length === 0) return 'Add your first campaign below to start tracking your list-building ROAS.'
    if (avgCostPerSub === 0) return 'Add subscriber counts to your campaigns to see your acquisition costs.'
    if (avgCostPerSub <= subValue * 0.5) return `You're acquiring subscribers at ${fmt$(avgCostPerSub)} each — that's 2x+ return on your subscriber value. Scale your best campaigns aggressively.`
    if (avgCostPerSub <= subValue) return `Your cost per subscriber is ${fmt$(avgCostPerSub)}, just under your break-even of ${fmt$(subValue)}. Find your best-performing ad sets and put more budget there.`
    return `Your subscriber acquisition cost (${fmt$(avgCostPerSub)}) is above your break-even point (${fmt$(subValue)}). Pause underperforming campaigns and test new creative or audiences.`
  }

  // Block render until session resolves — redirect happens in useEffect
  if (status === 'loading' || !ADMIN_EMAILS.includes(session?.user?.email ?? '')) {
    return null
  }

  return (
    <div className="p-4 sm:p-8 pb-8 max-w-[1100px]">
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1.5" style={{ color: '#e9a020' }}>
          Tools
        </div>
        <h1 className="font-sans text-[26px] text-[#0d1f35] leading-snug mb-1">
          List Building ROAS Tracker
        </h1>
        <p className="text-[12.5px] text-stone-500 max-w-lg">
          Track your email list growth campaigns. Enter your Meta ad spend and BookFunnel subscriber counts to see your true acquisition cost and list-building ROI.
        </p>
      </div>

      {/* Subscriber Value + KPI strip */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="text-[12.5px] font-semibold text-stone-600">Subscriber lifetime value:</div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 text-[13px]">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={subValueInput}
              onChange={e => setSubValueInput(e.target.value)}
              onBlur={handleSubValueBlur}
              className="input-field w-24 text-[13px] font-mono"
            />
          </div>
          <div className="text-[11px] text-stone-500">
            What each new subscriber is worth to you on average
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid gap-3 min-w-[480px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { label: metaSpend !== null ? 'Meta Ad Spend (30d)' : 'Total Ad Spend', value: fmt$(totalSpend), color: 'text-[#0d1f35]' },
              { label: 'New Subscribers', value: totalSubs.toLocaleString(), color: 'text-emerald-600' },
              { label: 'Cost Per Subscriber', value: avgCostPerSub > 0 ? fmt$(avgCostPerSub) : '—', color: avgCostPerSub > subValue ? 'text-red-500' : avgCostPerSub > subValue * 0.5 ? 'text-amber-600' : 'text-emerald-600' },
              { label: 'Subscriber ROAS', value: subRoas > 0 ? `${subRoas.toFixed(2)}x` : '—', color: subRoas >= 1 ? 'text-emerald-600' : 'text-red-500' },
              { label: 'Break-even Subs', value: breakEven > 0 ? Math.ceil(breakEven).toLocaleString() : '—', color: 'text-stone-500' },
            ].map(k => (
              <div key={k.label} className="text-center p-3" style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0 }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">{k.label}</div>
                <div className={`font-sans text-[22px] tracking-tight ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coach callout */}
      <div className="card p-5 mb-5 border-l-[3px] border-l-amber-brand">
        <div className="text-[10.5px] font-bold tracking-[1px] uppercase mb-2 text-amber-700">{coachTitle}</div>
        <div className="text-[13px] text-stone-600 leading-[1.75]">{coachMsg()}</div>
      </div>

      {/* Campaign table */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="text-[13px] font-bold text-[#0d1f35]">Campaigns</div>
          <div className="flex items-center gap-3">
            {feedback && (
              <span className="text-[12px] font-semibold text-emerald-600">✓ {feedback}</span>
            )}
            <button
              onClick={() => setShowForm(s => !s)}
              className="px-4 py-2 text-[12.5px] font-bold transition-all"
              style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
            >
              {showForm ? 'Cancel' : '+ Add Campaign'}
            </button>
          </div>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-stone-100"
            style={{ background: '#fafaf9' }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BookFunnel Summer Promo — Romantic Suspense"
                  value={form.campaignName}
                  onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  Meta Ad Spend ($)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150.00"
                  value={form.spend}
                  onChange={e => setForm(f => ({ ...f, spend: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  New Subscribers (BookFunnel)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 312"
                  value={form.subscribers}
                  onChange={e => setForm(f => ({ ...f, subscribers: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                  Notes <span className="normal-case font-normal text-stone-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tested romance audience 25-44F"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-[13px] font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="px-5 py-8 text-[13px] text-stone-500 animate-pulse">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-[13px] font-semibold text-stone-500 mb-1">No campaigns yet</div>
            <div className="text-[11.5px] text-stone-500">Click "+ Add Campaign" to log your first list-building campaign.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-stone-100">
                  {['Campaign', 'Dates', 'Spend', 'Subscribers', 'Cost/Sub', 'Sub ROAS', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.8px] text-stone-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const costPerSub = c.subscribers > 0 ? c.spend / c.subscribers : 0
                  const cRoas = c.spend > 0 ? (c.subscribers * subValue) / c.spend : 0
                  const status = c.subscribers > 0 ? getStatus(costPerSub, subValue) : 'WATCH'
                  const s = STATUS_STYLES[status]
                  return (
                    <tr key={c.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold text-[#0d1f35]">{c.campaignName}</div>
                        {c.notes && <div className="text-[11px] text-stone-500 mt-0.5">{c.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-stone-500 whitespace-nowrap">
                        {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono text-[#0d1f35]">{fmt$(c.spend)}</td>
                      <td className="px-4 py-3 text-[13px] font-mono text-emerald-600">{c.subscribers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[13px] font-mono"
                        style={{ color: costPerSub > subValue ? '#8c2020' : costPerSub > subValue * 0.5 ? '#7a4f00' : '#0f6b46' }}>
                        {costPerSub > 0 ? fmt$(costPerSub) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono"
                        style={{ color: cRoas >= 1 ? '#0f6b46' : '#8c2020' }}>
                        {cRoas > 0 ? `${cRoas.toFixed(2)}x` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-[12px] text-stone-300 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── BookFunnel Downloads Section ─────────────────────────────────── */}
      <div className="card mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <div className="text-[13px] font-bold text-[#0d1f35]">BookFunnel Downloads</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Automatic download tracking via webhook</div>
          </div>
          {bfStats && bfStats.totalCount > 0 && (
            <a
              href="/dashboard/settings"
              className="text-[11px] font-semibold no-underline"
              style={{ color: '#D97706' }}
            >
              Manage →
            </a>
          )}
        </div>

        {!bfStats || bfStats.totalCount === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-[13px] font-semibold text-stone-500 mb-1">No downloads tracked yet</div>
            <div className="text-[11.5px] text-stone-500 mb-3">
              Connect BookFunnel in Settings to automatically track reader downloads.
            </div>
            <a
              href="/dashboard/settings"
              className="inline-block px-4 py-2 text-[12px] font-bold no-underline"
              style={{ background: '#D97706', color: '#FFFFFF', borderRadius: 2 }}
            >
              Set up BookFunnel →
            </a>
          </div>
        ) : (
          <div className="p-5">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Total Downloads',   value: bfStats.totalCount.toLocaleString(), color: 'text-[#0d1f35]' },
                { label: 'Confirmation Rate', value: `${bfStats.confirmRate}%`,           color: bfStats.confirmRate >= 70 ? 'text-emerald-600' : bfStats.confirmRate >= 40 ? 'text-amber-600' : 'text-red-500' },
                { label: 'Top Book',          value: bfStats.topBook ?? '—',              color: 'text-[#0d1f35]', small: true },
              ].map(k => (
                <div key={k.label} className="text-center p-3" style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0 }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">{k.label}</div>
                  <div className={`font-sans tracking-tight ${k.small ? 'text-[13px]' : 'text-[22px]'} ${k.color}`}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="text-[12px] font-semibold text-[#0d1f35] mb-3">Downloads by Book</div>
                <BfBookChart byBook={bfStats.byBook} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#0d1f35] mb-3">Downloads Over Time</div>
                <BfTimeChart byDate={bfStats.byDate} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-[#0d1f35] mb-3">How to use this tracker</div>
        <div className="grid grid-cols-3 gap-3 text-[12px] text-stone-500">
          <div style={{ border: '1px solid #E8E1D3', borderLeft: '3px solid #6EBF8B', borderRadius: 0, padding: 12 }}>
            <div className="font-bold mb-1" style={{ color: '#6EBF8B', fontFamily: 'var(--font-sans)', fontSize: 12 }}>1. Set your subscriber value</div>
            <div>What's a subscriber worth to you? For most romance authors, $1–$3 is a reasonable starting point based on expected book purchases over time.</div>
          </div>
          <div style={{ border: '1px solid #E8E1D3', borderLeft: '3px solid #D97706', borderRadius: 0, padding: 12 }}>
            <div className="font-bold mb-1" style={{ color: '#D97706', fontFamily: 'var(--font-sans)', fontSize: 12 }}>2. Add your campaign data</div>
            <div>After each BookFunnel or list-swap campaign, enter your Meta ad spend and how many new subscribers you gained from BookFunnel.</div>
          </div>
          <div style={{ border: '1px solid #E8E1D3', borderLeft: '3px solid #6D3FD4', borderRadius: 0, padding: 12 }}>
            <div className="font-bold mb-1" style={{ color: '#6D3FD4', fontFamily: 'var(--font-sans)', fontSize: 12 }}>3. Act on the status badges</div>
            <div>🟢 Scale = profitable, add budget. 🟡 Watch = close to break-even, optimise first. 🔴 Cut = losing money, pause and test new creative.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
