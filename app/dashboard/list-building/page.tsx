'use client'
// app/dashboard/list-building/page.tsx
import { useState, useEffect } from 'react'
import { getCoachTitle } from '@/lib/coachTitle'

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

export default function ListBuildingPage() {
  const [coachTitle] = useState(() => getCoachTitle())
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

  useEffect(() => {
    // Load persisted subValue
    const stored = localStorage.getItem('listbuilding_subvalue')
    if (stored) {
      const n = parseFloat(stored)
      if (!isNaN(n) && n > 0) { setSubValue(n); setSubValueInput(n.toFixed(2)) }
    }
    fetch('/api/list-building')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setCampaigns(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
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

  // KPIs
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
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

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="mb-6">
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1.5" style={{ color: '#e9a020' }}>
          Tools
        </div>
        <h1 className="font-serif text-[26px] text-[#0d1f35] leading-snug mb-1">
          List Building ROAS Tracker
        </h1>
        <p className="text-[12.5px] text-stone-400 max-w-lg">
          Track your email list growth campaigns. Enter your Meta ad spend and BookFunnel subscriber counts to see your true acquisition cost and list-building ROI.
        </p>
      </div>

      {/* Subscriber Value + KPI strip */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="text-[12.5px] font-semibold text-stone-600">Subscriber lifetime value:</div>
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 text-[13px]">$</span>
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
          <div className="text-[11px] text-stone-400">
            What each new subscriber is worth to you on average
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total Ad Spend', value: fmt$(totalSpend), color: 'text-[#0d1f35]' },
            { label: 'New Subscribers', value: totalSubs.toLocaleString(), color: 'text-emerald-600' },
            { label: 'Cost Per Subscriber', value: avgCostPerSub > 0 ? fmt$(avgCostPerSub) : '—', color: avgCostPerSub > subValue ? 'text-red-500' : avgCostPerSub > subValue * 0.5 ? 'text-amber-600' : 'text-emerald-600' },
            { label: 'Subscriber ROAS', value: subRoas > 0 ? `${subRoas.toFixed(2)}x` : '—', color: subRoas >= 1 ? 'text-emerald-600' : 'text-red-500' },
            { label: 'Break-even Subs', value: breakEven > 0 ? Math.ceil(breakEven).toLocaleString() : '—', color: 'text-stone-500' },
          ].map(k => (
            <div key={k.label} className="text-center p-3 rounded-xl" style={{ background: '#fafaf9' }}>
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-stone-400 mb-1.5">{k.label}</div>
              <div className={`font-serif text-[22px] tracking-tight ${k.color}`}>{k.value}</div>
            </div>
          ))}
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
              className="px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all"
              style={{ background: '#e9a020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
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
                  Notes <span className="normal-case font-normal text-stone-400">(optional)</span>
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
              className="px-6 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: '#e9a020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="px-5 py-8 text-[13px] text-stone-400 animate-pulse">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-[13px] font-semibold text-stone-500 mb-1">No campaigns yet</div>
            <div className="text-[11.5px] text-stone-400">Click "+ Add Campaign" to log your first list-building campaign.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Campaign', 'Dates', 'Spend', 'Subscribers', 'Cost/Sub', 'Sub ROAS', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.8px] text-stone-400">
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
                        {c.notes && <div className="text-[11px] text-stone-400 mt-0.5">{c.notes}</div>}
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

      {/* How it works */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-[#0d1f35] mb-3">How to use this tracker</div>
        <div className="grid grid-cols-3 gap-3 text-[12px] text-stone-500">
          <div className="rounded-lg p-3" style={{ background: '#eaf7f1' }}>
            <div className="font-bold text-emerald-700 mb-1">1. Set your subscriber value</div>
            <div>What's a subscriber worth to you? For most romance authors, $1–$3 is a reasonable starting point based on expected book purchases over time.</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#fdf5e3' }}>
            <div className="font-bold text-amber-700 mb-1">2. Add your campaign data</div>
            <div>After each BookFunnel or list-swap campaign, enter your Meta ad spend and how many new subscribers you gained from BookFunnel.</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#f0f4ff' }}>
            <div className="font-bold text-blue-700 mb-1">3. Act on the status badges</div>
            <div>🟢 Scale = profitable, add budget. 🟡 Watch = close to break-even, optimise first. 🔴 Cut = losing money, pause and test new creative.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
