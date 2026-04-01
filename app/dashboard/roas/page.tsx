'use client'
// app/dashboard/roas/page.tsx
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import type { Analysis } from '@/types'

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 200
  const h = 36
  const pad = 2
  const max = Math.max(...values, 2)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const line = `M ${pts.join(' L ')}`
  const fill = `M ${pad},${h} L ${pts.join(' L ')} L ${w - pad},${h} Z`

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="roas-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9a020" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e9a020" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 1x and 2x reference lines */}
      {[1, 2].map(ref => {
        const y = h - pad - ((ref - min) / range) * (h - pad * 2)
        if (y < 0 || y > h) return null
        return (
          <line key={ref} x1={pad} y1={y} x2={w - pad} y2={y}
            stroke={ref === 2 ? '#34d39930' : '#fbbf2430'}
            strokeWidth={1} strokeDasharray="3,3" />
        )
      })}
      <path d={fill} fill="url(#roas-grad)" />
      <path d={line} fill="none" stroke="#e9a020" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roasColor(roas: number, hasEarnings: boolean) {
  if (!hasEarnings) return '#a8a29e'
  if (roas >= 2) return '#1a9e68'
  if (roas >= 1) return '#d97706'
  return '#c73c3c'
}

function roasBg(roas: number, hasEarnings: boolean) {
  if (!hasEarnings) return 'transparent'
  if (roas >= 2) return 'rgba(52,211,153,0.08)'
  if (roas >= 1) return 'rgba(251,191,36,0.08)'
  return 'rgba(251,113,133,0.08)'
}

function roasLabel(roas: number, hasEarnings: boolean) {
  if (!hasEarnings) return { text: '—', color: '#a8a29e' }
  if (roas >= 2) return { text: `🟢 ${roas.toFixed(2)}x`, color: '#1a9e68' }
  if (roas >= 1) return { text: `🟡 ${roas.toFixed(2)}x`, color: '#d97706' }
  return { text: `🔴 ${roas.toFixed(2)}x`, color: '#c73c3c' }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ROASPage() {
  const [logs,      setLogs]      = useState<any[]>([])
  const [analysis,  setAnalysis]  = useState<Analysis | null>(null)
  const [form,      setForm]      = useState({ spend: '', earnings: '', notes: '' })
  const [prefilled, setPrefilled] = useState({ spend: false, earnings: false })
  const [saving,    setSaving]    = useState(false)
  const [verdict,   setVerdict]   = useState<{ text: string; color: string } | null>(null)
  const [loading,   setLoading]   = useState(true)

  // ── Fetch logs + latest analysis ─────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/roas').then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<any>,
      fetch('/api/analyze').then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<any>,
    ]).then(([roasData, analyzeData]) => {
      if (roasData.logs) setLogs(roasData.logs)

      const a: Analysis | null = analyzeData.analysis ?? null
      setAnalysis(a)

      if (!a) return

      // ── Pre-fill spend from Meta ────────────────────────────────────────
      if (a.meta?.totalSpend) {
        // Divide by number of days in the KDP data period (or 30 as fallback)
        const days = a.kdp?.dailyUnits?.length || 30
        const dailySpend = a.meta.totalSpend / days
        setForm(f => ({ ...f, spend: dailySpend.toFixed(2) }))
        setPrefilled(p => ({ ...p, spend: true }))
      }

      // ── Pre-fill earnings from KDP daily data ───────────────────────────
      if (a.kdp) {
        const today = todayStr()
        const todayEntry = a.kdp.dailyUnits?.find(d => d.date === today)

        if (todayEntry && a.kdp.totalUnits > 0) {
          // Estimate today's royalties proportional to today's units
          const estimatedEarnings = (todayEntry.value / a.kdp.totalUnits) * a.kdp.totalRoyaltiesUSD
          setForm(f => ({ ...f, earnings: estimatedEarnings.toFixed(2) }))
          setPrefilled(p => ({ ...p, earnings: true }))
        } else if (a.kdp.dailyUnits?.length) {
          // No entry for today — use average daily royalties
          const avgEarnings = a.kdp.totalRoyaltiesUSD / a.kdp.dailyUnits.length
          setForm(f => ({ ...f, earnings: avgEarnings.toFixed(2) }))
          setPrefilled(p => ({ ...p, earnings: true }))
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  // ── Live ROAS calculation ─────────────────────────────────────────────────
  const liveROAS = useMemo(() => {
    const s = parseFloat(form.spend)
    const e = parseFloat(form.earnings)
    if (!s || s === 0) return null
    if (!e || e === 0) return null
    return e / s
  }, [form.spend, form.earnings])

  // ── Summary stats ─────────────────────────────────────────────────────────
  const avgROAS = useMemo(() => {
    const withEarnings = logs.filter(l => l.earnings > 0)
    if (!withEarnings.length) return null
    return withEarnings.reduce((s, l) => s + l.roas, 0) / withEarnings.length
  }, [logs])

  const totalSpend    = logs.reduce((s, l) => s + l.spend, 0)
  const totalEarnings = logs.reduce((s, l) => s + l.earnings, 0)

  // Last 21 days ROAS values for sparkline (only days with earnings)
  const sparkValues = useMemo(() =>
    logs.slice(0, 21).reverse().filter(l => l.earnings > 0).map(l => l.roas),
  [logs])

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const spend    = parseFloat(form.spend)
    const earnings = parseFloat(form.earnings)
    if (!spend) return

    setSaving(true)
    try {
      const res  = await fetch('/api/roas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => [json.log, ...prev])
        setForm({ spend: '', earnings: '', notes: '' })
        setPrefilled({ spend: false, earnings: false })

        const roas = earnings > 0 ? earnings / spend : 0
        if (earnings === 0) {
          setVerdict({ text: `$${spend} logged. KDP royalties lag 24–72 hours — log your earnings tomorrow when they appear.`, color: '#38bdf8' })
        } else if (roas >= 2) {
          setVerdict({ text: `🟢 ${roas.toFixed(2)}x ROAS — you earned $${earnings.toFixed(2)} on $${spend.toFixed(2)} spent. Keep the ad running.`, color: '#34d399' })
        } else if (roas >= 1) {
          setVerdict({ text: `🟡 ${roas.toFixed(2)}x ROAS — break-even with a little extra. Watch this over the next few days before changing anything.`, color: '#fbbf24' })
        } else {
          setVerdict({ text: `🔴 ${roas.toFixed(2)}x ROAS — spent more than you earned today. One day isn't a pattern. If this continues 3+ days, pause the ad.`, color: '#fb7185' })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-2xl animate-pulse space-y-4">
        <div className="h-10 rounded-xl bg-stone-100 w-48" />
        <div className="h-40 rounded-xl bg-stone-100" />
        <div className="h-64 rounded-xl bg-stone-100" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] text-[#0d1f35] mb-1">Daily ROAS Log</h1>
          <p className="text-[12.5px] text-stone-400">
            Log your ad spend and earnings every day. Takes 30 seconds.
            Builds a picture over time so you can spot trends before they cost you money.
          </p>
        </div>
        <a
          href="/api/export/ad-tracker"
          download
          className="flex-shrink-0 px-4 py-2 rounded-lg text-[12.5px] font-semibold no-underline transition-all"
          style={{ background: '#e9a020', color: '#0d1f35' }}
        >
          ⬇ Download Coaching Tracker
        </a>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Avg ROAS',            value: avgROAS != null ? `${avgROAS.toFixed(2)}x` : '—', sub: 'Days with earnings' },
          { label: 'Total Spend Logged',  value: `$${totalSpend.toFixed(2)}`,    sub: 'Across all entries' },
          { label: 'Total Earnings',      value: `$${totalEarnings.toFixed(2)}`, sub: 'Royalties attributed' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="metric-label mb-1">{s.label}</div>
            <div className="font-serif text-[26px] text-[#0d1f35] tracking-tight">{s.value}</div>
            <div className="text-[11px] text-stone-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Explainer */}
      <div className="rounded-xl px-4 py-3.5 mb-5 text-[12.5px] leading-relaxed"
        style={{ background: '#f5f0e8', border: '1px solid #e8e0d0', color: '#57534e' }}>
        <strong style={{ color: '#0d1f35' }}>Where does this come from?</strong>
        {' '}Your spend comes from your Meta Ads upload. Your earnings come from your KDP report.
        We pre-fill what we can — you adjust if needed.
        KDP royalties lag 24–72 hours so you may need to update earnings the next day.{' '}
        <Link href="/dashboard/kdp" className="font-semibold no-underline hover:underline" style={{ color: '#0d1f35' }}>
          View KDP deep dive →
        </Link>
      </div>

      {/* Log form */}
      <div className="card p-6 mb-5">
        <div className="text-[14px] font-bold text-[#0d1f35] mb-1">Log today&apos;s numbers</div>
        <div className="text-[11.5px] text-stone-400 mb-4">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Spend */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                What did you spend on ads today? <span className="font-normal text-stone-400">(from Meta)</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.spend}
                onChange={e => {
                  setForm(f => ({ ...f, spend: e.target.value }))
                  setPrefilled(p => ({ ...p, spend: false }))
                }}
                className="input-field"
                required
              />
              {prefilled.spend && (
                <div className="text-[10.5px] mt-1" style={{ color: '#e9a020' }}>
                  Pre-filled from your last upload · tap to edit
                </div>
              )}
            </div>

            {/* Earnings */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                What did you earn today? <span className="font-normal text-stone-400">(from KDP royalties)</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00 (can log tomorrow)"
                value={form.earnings}
                onChange={e => {
                  setForm(f => ({ ...f, earnings: e.target.value }))
                  setPrefilled(p => ({ ...p, earnings: false }))
                }}
                className="input-field"
              />
              {prefilled.earnings && (
                <div className="text-[10.5px] mt-1" style={{ color: '#e9a020' }}>
                  Pre-filled from your last upload · tap to edit
                </div>
              )}
            </div>
          </div>

          {/* Live ROAS */}
          {liveROAS !== null && (
            <div className="rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between"
              style={{ background: roasBg(liveROAS, true), border: '1px solid rgba(0,0,0,0.06)' }}>
              <span className="text-[11.5px] font-semibold text-stone-500">Your ROAS right now</span>
              <span className="font-mono text-[15px] font-bold" style={{ color: roasColor(liveROAS, true) }}>
                {liveROAS.toFixed(2)}x
                {liveROAS >= 2 ? '  — 🟢 Great' : liveROAS >= 1 ? '  — 🟡 Watch' : '  — 🔴 Investigate'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
              Notes <span className="font-normal text-stone-400">(optional — e.g. "paused video ads today")</span>
            </label>
            <input
              type="text"
              placeholder="Optional note..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !form.spend}
            className="btn-primary disabled:opacity-40"
          >
            {saving ? 'Logging...' : 'Log It →'}
          </button>
        </form>

        {verdict && (
          <div className="mt-4 p-3.5 rounded-xl text-[13px] font-semibold"
            style={{ background: `${verdict.color}15`, color: verdict.color }}>
            {verdict.text}
          </div>
        )}
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div className="text-[13.5px] font-semibold text-[#0d1f35]">Last 21 days</div>
            {sparkValues.length >= 2 && (
              <div className="flex items-center gap-3">
                <div className="text-[10.5px] text-stone-400">ROAS trend</div>
                <Sparkline values={sparkValues} />
              </div>
            )}
          </div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-cream">
                {['Date', 'Spend', 'Earnings', 'ROAS', 'Notes'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px] text-stone-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 21).map((log, i) => {
                const hasEarnings = log.earnings > 0
                const { text, color } = roasLabel(log.roas, hasEarnings)
                return (
                  <tr key={i} className="border-t border-stone-100 hover:bg-cream transition-colors"
                    style={{ background: roasBg(log.roas, hasEarnings) }}>
                    <td className="px-4 py-2.5 font-mono text-stone-500">
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 font-mono">${log.spend.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono">{hasEarnings ? `$${log.earnings.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5 font-mono font-bold" style={{ color }}>
                      {text}
                    </td>
                    <td className="px-4 py-2.5 text-stone-400">{log.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {logs.length === 0 && (
        <div className="card p-8 text-center text-stone-400 text-[13px]">
          No logs yet — start logging today&apos;s numbers above.
        </div>
      )}
    </div>
  )
}
