'use client'
// app/(dashboard)/mailerlite/page.tsx
import { Suspense, useEffect, useState } from 'react'
import { DarkPage, DarkKPIStrip, DarkCoachBox } from '@/components/DarkPage'
import { FreshBanner } from '@/components/FreshBanner'
import { GoalSection } from '@/components/GoalSection'
import { getCoachTitle } from '@/lib/coachTitle'
import type { Analysis } from '@/types'

const COACH_TITLE = getCoachTitle('mailerlite')

export default function MailerLitePage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (d.analysis) setAnalysis(d.analysis as Analysis)
      })
      .catch(() => {})
  }, [])

  const ml = analysis?.mailerLite
  const coach = (analysis as any)?.emailCoach

  const benchmarks = [
    { metric: 'Open Rate', yours: ml?.openRate || 0, avg: 22, unit: '%', good: (v: number) => v >= 24 },
    { metric: 'Click Rate', yours: ml?.clickRate || 0, avg: 2, unit: '%', good: (v: number) => v >= 1.5 },
    { metric: 'List Size', yours: ml?.listSize || 0, avg: null, unit: '', good: () => true },
    { metric: 'Unsubscribes (recent)', yours: ml?.unsubscribes || 0, avg: 20, unit: '', good: (v: number) => v < 20 },
  ]

  return (
    <DarkPage title="📧 MailerLite — Email Marketing" subtitle="Open rates · List health · Subscriber trends">
      <Suspense fallback={null}><FreshBanner /></Suspense>
      {!ml ? (
        <div className="text-center py-16" style={{ color: '#a8a29e' }}>
          <div className="text-4xl mb-4">📧</div>
          <div className="font-serif text-xl mb-2" style={{ color: '#fafaf9' }}>MailerLite not connected</div>
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
            { label: 'Open Rate', value: `${ml.openRate}%`, sub: 'Industry avg: 22%', color: ml.openRate >= 24 ? '#34d399' : '#fbbf24' },
            { label: 'List Size', value: ml.listSize.toLocaleString(), sub: 'Active subscribers', color: '#38bdf8' },
            { label: 'Click Rate', value: `${ml.clickRate}%`, sub: 'Romance avg: 1.5–2.5%', color: '#fbbf24' },
            { label: 'Unsubscribes', value: ml.unsubscribes, sub: 'Recent period', color: ml.unsubscribes > 30 ? '#fb7185' : '#34d399' },
          ]} />

          {coach && <DarkCoachBox color="#34d399" title={COACH_TITLE}>{coach}</DarkCoachBox>}

          {/* Benchmarks table */}
          <div className="rounded-xl overflow-hidden mb-5"
            style={{ background: '#1c1917', border: '1px solid #292524' }}>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr style={{ background: '#292524' }}>
                  {['Metric', 'Your Number', 'Industry Average', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.8px]"
                      style={{ color: '#a8a29e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((row, i) => {
                  const isGood = row.good(row.yours)
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3" style={{ color: '#d6d3d1' }}>{row.metric}</td>
                      <td className="px-4 py-3 font-mono font-bold"
                        style={{ color: isGood ? '#34d399' : '#fb7185' }}>
                        {row.yours}{row.unit}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#a8a29e' }}>
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
              style={{ background: '#1c1917', border: '1px solid #292524' }}>
              <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#d6d3d1', borderBottom: '1px solid #292524' }}>
                Recent Campaigns
              </div>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr style={{ background: '#292524' }}>
                    {['Campaign', 'Sent', 'Open Rate', 'Click Rate', 'Unsubs'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-[0.8px]"
                        style={{ color: '#a8a29e' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ml.campaigns.slice(0, 8).map((c, i) => (
                    <tr key={i} className="border-t hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: '#fafaf9' }}>{c.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: '#a8a29e' }}>
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
                        style={{ color: c.unsubscribes > 10 ? '#fb7185' : '#a8a29e' }}>
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
