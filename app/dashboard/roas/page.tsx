'use client'
// app/(dashboard)/roas/page.tsx
import { useEffect, useState } from 'react'

export default function ROASPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [form, setForm] = useState({ spend: '', earnings: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [verdict, setVerdict] = useState<{ text: string; color: string } | null>(null)

  useEffect(() => {
    fetch('/api/roas')
      .then(r => r.json())
      .then(d => { if (d.logs) setLogs(d.logs) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const spend = parseFloat(form.spend)
    const earnings = parseFloat(form.earnings)
    if (!spend) return

    setSaving(true)
    try {
      const res = await fetch('/api/roas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => [json.log, ...prev])
        setForm({ spend: '', earnings: '', notes: '' })

        const roas = earnings > 0 ? earnings / spend : 0
        if (earnings === 0) {
          setVerdict({ text: `$${spend} logged. KDP royalties lag 24–72 hours — log your earnings tomorrow when they appear.`, color: '#38bdf8' })
        } else if (roas >= 2) {
          setVerdict({ text: `🟢 Great day! ${roas.toFixed(1)}x ROAS — you earned $${earnings.toFixed(2)} for every $${spend.toFixed(2)} spent. Keep running your ads.`, color: '#34d399' })
        } else if (roas >= 1) {
          setVerdict({ text: `🟡 Break-even — ${roas.toFixed(1)}x ROAS. You got your money back plus a little. Watch this over the next few days.`, color: '#fbbf24' })
        } else {
          setVerdict({ text: `🔴 ${roas.toFixed(1)}x ROAS — you spent more than you earned today. One day isn't a pattern. If this continues 3+ days, pause the ad.`, color: '#fb7185' })
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const avgROAS = logs.length > 0
    ? (logs.filter(l => l.earnings > 0).reduce((s, l) => s + l.roas, 0) / Math.max(logs.filter(l => l.earnings > 0).length, 1)).toFixed(2)
    : '—'

  const totalSpend = logs.reduce((s, l) => s + l.spend, 0).toFixed(2)
  const totalEarnings = logs.reduce((s, l) => s + l.earnings, 0).toFixed(2)

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] text-[#0d1f35] mb-1">Daily ROAS Log</h1>
          <p className="text-[12.5px] text-stone-400">
            Log your ad spend and earnings every day. Takes 30 seconds. Builds a picture over time so you can spot trends before they cost you money.
          </p>
        </div>
        <a
          href="/api/export/ad-tracker"
          download
          className="flex-shrink-0 px-4 py-2 rounded-lg text-[12.5px] font-semibold no-underline transition-all"
          style={{ background: '#0d1f35', color: '#fff' }}
        >
          ⬇ Download Coaching Tracker
        </a>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Avg ROAS', value: avgROAS === '—' ? '—' : `${avgROAS}x`, sub: 'All logged days' },
          { label: 'Total Spend Logged', value: `$${totalSpend}`, sub: 'Across all entries' },
          { label: 'Total Earnings Logged', value: `$${totalEarnings}`, sub: 'Royalties attributed' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="metric-label mb-1">{s.label}</div>
            <div className="font-serif text-[26px] text-[#0d1f35] tracking-tight">{s.value}</div>
            <div className="text-[11px] text-stone-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Log form */}
      <div className="card p-6 mb-5">
        <div className="text-[14px] font-bold text-[#0d1f35] mb-4">Log today's numbers</div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                What did you spend today? ($)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.spend}
                onChange={e => setForm(f => ({ ...f, spend: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
                What did you earn today? (royalties $)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00 (can log tomorrow)"
                value={form.earnings}
                onChange={e => setForm(f => ({ ...f, earnings: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
              Notes (optional — e.g. "paused video ads today")
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
          <div className="px-5 py-3.5 border-b border-stone-100 text-[13.5px] font-semibold text-[#0d1f35]">
            Log history
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
              {logs.map((log, i) => {
                const roasColor = log.earnings === 0 ? '#a8a29e' : log.roas >= 2 ? '#1a9e68' : log.roas >= 1 ? '#d97706' : '#c73c3c'
                return (
                  <tr key={i} className="border-t border-stone-100 hover:bg-cream">
                    <td className="px-4 py-2.5 font-mono text-stone-500">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono">${log.spend.toFixed(2)}</td>
                    <td className="px-4 py-2.5 font-mono">{log.earnings > 0 ? `$${log.earnings.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5 font-mono font-bold" style={{ color: roasColor }}>
                      {log.earnings > 0 ? `${log.roas}x` : '—'}
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
          No logs yet — start logging today's numbers above.
        </div>
      )}
    </div>
  )
}
