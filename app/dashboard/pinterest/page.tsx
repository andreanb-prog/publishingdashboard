'use client'
// app/(dashboard)/pinterest/page.tsx
import { Suspense, useEffect, useState } from 'react'
import { DarkPage, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis } from '@/types'


const ROADMAP = [
  {
    week: 'Week 1 — Foundation',
    title: 'Set up your boards',
    body: 'Create 4 boards: "Stillwater Series," "Forced Proximity Romance," "Romance Book Recommendations," and "Book Aesthetic — Elle Wilder." Add 10 saved pins to each to seed the algorithm before posting your own.',
  },
  {
    week: 'Week 2–3 — Content',
    title: 'Post your first original pins',
    body: 'Create 3 pin types: (1) Book cover + trope hook text overlay, (2) "If you like X you\'ll love MOLR" comparison, (3) Aesthetic mood board for the Stillwater world. Post 3–5x per week using Canva templates.',
  },
  {
    week: 'Week 4 — Optimize',
    title: 'Double down on what gets saves',
    body: 'After 4 weeks, check which pins got the most saves. Create 3 variations of those. Saves are the most important Pinterest metric — they mean readers are bookmarking your book for later.',
  },
]

const BENCHMARKS = [
  { period: 'Month 1–2', range: '100–500 impressions/week', note: 'Focus on posting consistency, not numbers', color: '#f472b6' },
  { period: 'Month 3–6', range: '1K–10K impressions/week', note: 'Save rate above 2% means your content resonates', color: '#34d399' },
  { period: 'Month 6–12', range: '10K–100K impressions/week', note: 'Old pins compound — this is when Pinterest pays off', color: '#38bdf8' },
]

export default function PinterestPage() {
  const [coachTitle] = useState(() => getCoachTitle())
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [logForm, setLogForm] = useState({ weekEnding: '', impressions: '', saves: '', clicks: '', pinCount: '' })
  const [logs, setLogs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [verdict, setVerdict] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { if (d.analysis) setAnalysis(d.analysis as Analysis) })
        .catch(() => {}),
      fetch('/api/pinterest-log')
        .then(r => r.json())
        .then(d => { if (d.logs) setLogs(d.logs) })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const pin = analysis?.pinterest
  const coach = (analysis as any)?.pinterestCoach

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/pinterest-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm),
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => [json.log, ...prev])
        const imp = parseInt(logForm.impressions) || 0
        const saves = parseInt(logForm.saves) || 0
        const sr = imp > 0 ? (saves / imp * 100).toFixed(1) : 0
        setVerdict(saves / imp > 0.02
          ? `🟢 Great week! ${sr}% save rate — your content is resonating. Make more pins like your best.`
          : imp === 0
            ? '📌 Week logged. Keep posting — impressions will come with consistency.'
            : `📌 ${imp} impressions logged. Normal for a new account. Keep posting 3–5x per week.`
        )
        setLogForm({ weekEnding: '', impressions: '', saves: '', clicks: '', pinCount: '' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DarkPage title="📌 Pinterest" subtitle="Dec 2025 – Mar 2026 · Building from zero · Your 30-day plan">
        <PageSkeleton cols={3} rows={3} />
      </DarkPage>
    )
  }

  return (
    <DarkPage title="📌 Pinterest" subtitle="Dec 2025 – Mar 2026 · Building from zero · Your 30-day plan">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-3.5 mb-7">
        {[
          { label: 'Total Impressions', value: pin?.totalImpressions || 20, sub: 'Dec 2025 – Mar 2026', color: '#f472b6' },
          { label: 'Active Pins', value: pin?.pinCount || 2, sub: 'Stillwater Series board', color: '#fb7185' },
          { label: 'Account Age', value: pin?.accountAge || '~6 weeks', sub: 'Active since mid-Feb 2026', color: '#fbbf24' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: 'white', border: '1px solid #F0E0C8' }}>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, ${item.color}40, ${item.color})` }} />
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2" style={{ color: '#6B7280' }}>{item.label}</div>
            <div className="text-[32px] font-semibold leading-none tracking-tight mb-1.5" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[11px]" style={{ color: '#6B7280' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Coach box */}
      <DarkCoachBox color="#f472b6" title={coachTitle}>
        {coach || `Your data is honest: 20 impressions, 2 pins, brand new account. That's not a problem — that's a starting line. Pinterest is one of the most powerful long-term channels for romance authors because pins keep working for months and years. A pin you create today about your forced proximity trope could still be driving readers to your book in 2028. Start posting this week. Consistency beats perfection here.`}
      </DarkCoachBox>

      {/* 30-day roadmap */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-serif text-[19px]" style={{ color: '#1E2D3D' }}>Your 30-Day Pinterest Launch Plan</h2>
          <div className="flex-1 h-px" style={{ background: '#F0E0C8' }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROADMAP.map((step, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #F0E0C8' }}>
              <div className="text-[10px] font-bold tracking-[1px] uppercase mb-2" style={{ color: '#e60023' }}>
                {step.week}
              </div>
              <div className="text-[13.5px] font-bold mb-2" style={{ color: '#1E2D3D' }}>{step.title}</div>
              <div className="text-[12px] leading-[1.65]" style={{ color: '#6B7280' }}>{step.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly log form */}
      <div className="rounded-xl p-5 mb-5" style={{ background: 'white', border: '1px solid #F0E0C8' }}>
        <div className="text-[13px] font-bold mb-4" style={{ color: '#1E2D3D' }}>
          Log your weekly Pinterest numbers — takes 30 seconds
        </div>
        <form onSubmit={handleLog}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            {[
              { key: 'weekEnding', label: 'Week ending', type: 'date' },
              { key: 'impressions', label: 'Impressions', type: 'number', placeholder: '0' },
              { key: 'saves', label: 'Saves', type: 'number', placeholder: '0' },
              { key: 'clicks', label: 'Link clicks', type: 'number', placeholder: '0' },
              { key: 'pinCount', label: 'Pins live', type: 'number', placeholder: '0' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[10.5px] font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={logForm[field.key as keyof typeof logForm]}
                  onChange={e => setLogForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-[13px] font-sans outline-none transition-colors"
                  style={{
                    background: 'white', border: '1.5px solid #D6D3D1',
                    color: '#1E2D3D',
                  }}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-[13.5px] font-bold transition-all disabled:opacity-40"
            style={{ background: '#e60023', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {saving ? 'Logging...' : 'Log This Week →'}
          </button>
        </form>

        {verdict && (
          <div className="mt-3 p-3 rounded-lg text-[13px] font-semibold"
            style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6' }}>
            {verdict}
          </div>
        )}
      </div>

      {/* History table */}
      <div className="rounded-xl overflow-x-auto mb-6"
        style={{ background: 'white', border: '1px solid #F0E0C8' }}>
        <table className="w-full border-collapse text-[12px]" style={{ minWidth: 580 }}>
          <thead>
            <tr style={{ background: '#F5F5F4' }}>
              {['Period', 'Impressions', 'Saves', 'Link Clicks', 'Pins', 'Save Rate', 'Trend'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                  style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Baseline from file */}
            <tr style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>Feb 18 – Mar 31</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#f472b6' }}>20</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>0</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>0</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>2</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>0%</td>
              <td className="px-4 py-3">
                <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>🔵 Just started</span>
              </td>
            </tr>
            {logs.map((log, i) => {
              const sr = log.saveRate || 0
              const isGood = sr >= 2
              return (
                <tr key={i} className="border-t hover:bg-stone-50"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>
                    {new Date(log.weekEnding).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: '#f472b6' }}>{log.impressions}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>{log.saves}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>{log.clicks}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: '#6B7280' }}>{log.pinCount}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: isGood ? '#34d399' : '#a8a29e' }}>{sr}%</td>
                  <td className="px-4 py-3">
                    <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: isGood ? 'rgba(52,211,153,0.12)' : 'rgba(244,114,182,0.12)',
                        color: isGood ? '#34d399' : '#f472b6',
                      }}>
                      {log.impressions > 100 ? '↑ Growing' : '🔵 Building'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Benchmarks */}
      <div className="rounded-xl p-5" style={{ background: 'white', border: '1px solid #F0E0C8' }}>
        <div className="text-[11px] font-bold uppercase tracking-[1px] mb-3" style={{ color: '#6B7280' }}>
          Pinterest Benchmarks for Romance Authors
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BENCHMARKS.map((b, i) => (
            <div key={i} className="rounded-lg p-3"
              style={{ background: `${b.color}10` }}>
              <div className="text-[11.5px] font-bold mb-1" style={{ color: b.color }}>{b.period}</div>
              <div className="text-[12px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{b.range}</div>
              <div className="text-[11px]" style={{ color: '#6B7280' }}>{b.note}</div>
            </div>
          ))}
        </div>
      </div>
    </DarkPage>
  )
}
