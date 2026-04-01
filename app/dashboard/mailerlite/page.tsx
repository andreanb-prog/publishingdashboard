'use client'
// app/(dashboard)/mailerlite/page.tsx
import { Suspense, useEffect, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox, PageSkeleton } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { GoalSection } from '@/components/GoalSection'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis } from '@/types'


export default function MailerLitePage() {
  const [coachTitle] = useState(() => getCoachTitle())
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [goals, setGoals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analyze')
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { if (d.analysis) setAnalysis(d.analysis as Analysis) })
        .catch(() => {}),
      fetch('/api/prefs')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => { if (d.goals) setGoals(d.goals) })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const ml = analysis?.mailerLite
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
        <div className="text-center py-16" style={{ color: '#9CA3AF' }}>
          <div className="text-4xl mb-4">📧</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#1E2D3D' }}>MailerLite not connected</div>
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

          <DarkKPIStrip cols={4} items={[
            { label: 'Open Rate',    value: `${ml.openRate}%`,           sub: openSub,  color: ml.openRate  >= openTarget  ? '#34d399' : '#fbbf24' },
            { label: 'List Size',    value: ml.listSize.toLocaleString(), sub: 'Active subscribers', color: '#38bdf8' },
            { label: 'Click Rate',   value: `${ml.clickRate}%`,           sub: clickSub, color: ml.clickRate >= clickTarget ? '#34d399' : '#fbbf24' },
            { label: 'Unsubscribes', value: ml.unsubscribes,              sub: 'Total unsubscribed', color: ml.unsubscribes > 30 ? '#fb7185' : '#34d399' },
          ]} />

          {coach && <DarkCoachBox color="#34d399" title={coachTitle}>{coach}</DarkCoachBox>}

          {/* Benchmarks table */}
          <div className="rounded-xl overflow-hidden mb-5"
            style={{ background: 'white', border: '1px solid #F0E0C8' }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #F0E0C8' }}>
              <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>How you compare</span>
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

          {/* Recent campaigns */}
          {ml.campaigns.length > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ background: 'white', border: '1px solid #F0E0C8' }}>
              <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#1E2D3D', borderBottom: '1px solid #F0E0C8' }}>
                Recent Campaigns
              </div>
              <table className="w-full border-collapse text-[12px]">
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
                      <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#1E2D3D' }}>{c.name}</td>
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
