'use client'
// components/dashboard/PerformancePanel.tsx
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'
import { BoutiqueSectionLabel } from '@/components/boutique'
import type { Analysis } from '@/types'
import type { DashboardState } from './useDashboardData'

function SafeMarkdown({ content }: { content: string }) {
  const safe = typeof window !== 'undefined' ? DOMPurify.sanitize(content) : content
  return <ReactMarkdown>{safe}</ReactMarkdown>
}

function buildChanges(current: Analysis, previous: Analysis) {
  const changes: { label: string; direction: 'up' | 'down' | 'flat'; detail: string }[] = []
  if (current.kdp && previous.kdp) {
    const cr = current.kdp.totalRoyaltiesUSD, pr = previous.kdp.totalRoyaltiesUSD
    const pct = pr > 0 ? Math.round(((cr - pr) / pr) * 100) : 0
    changes.push({ label: 'Royalties', direction: pct > 3 ? 'up' : pct < -3 ? 'down' : 'flat', detail: pct > 3 ? `Up ${pct}% vs last month ($${cr} vs $${pr})` : pct < -3 ? `Down ${Math.abs(pct)}% vs last month ($${cr} vs $${pr})` : `Flat ($${cr} vs $${pr})` })
    const cu = current.kdp.totalUnits, pu = previous.kdp.totalUnits
    const upct = pu > 0 ? Math.round(((cu - pu) / pu) * 100) : 0
    changes.push({ label: 'Units Sold', direction: upct > 3 ? 'up' : upct < -3 ? 'down' : 'flat', detail: upct > 3 ? `Up ${upct}% (${cu} vs ${pu})` : upct < -3 ? `Down ${Math.abs(upct)}% (${cu} vs ${pu})` : `Flat (${cu} vs ${pu})` })
    const ck = current.kdp.totalKENP ?? 0, pk = previous.kdp.totalKENP ?? 0
    const kpct = pk > 0 ? Math.round(((ck - pk) / pk) * 100) : 0
    changes.push({ label: 'KENP Reads', direction: kpct > 3 ? 'up' : kpct < -3 ? 'down' : 'flat', detail: kpct > 3 ? `Up ${kpct}% (${ck.toLocaleString()} vs ${pk.toLocaleString()})` : kpct < -3 ? `Down ${Math.abs(kpct)}% (${ck.toLocaleString()} vs ${pk.toLocaleString()})` : `Flat (${ck.toLocaleString()} vs ${pk.toLocaleString()})` })
  }
  if (current.meta && previous.meta) {
    const cc = current.meta.bestAd?.ctr ?? 0, pc = previous.meta.bestAd?.ctr ?? 0
    if (cc > 0 || pc > 0) changes.push({ label: 'Best CTR', direction: cc > pc + 1 ? 'up' : cc < pc - 1 ? 'down' : 'flat', detail: cc > pc + 1 ? `Improved from ${pc}% to ${cc}%` : cc < pc - 1 ? `Dropped from ${pc}% to ${cc}%` : `Holding at ${cc}%` })
  }
  if (current.mailerLite) {
    const ls = current.mailerLite.listSize
    if (ls === 0) { changes.push({ label: 'Email List', direction: 'down', detail: 'Still showing 0 — needs attention' }) }
    else if (previous.mailerLite) {
      const pls = previous.mailerLite.listSize
      changes.push({ label: 'Email List', direction: ls > pls ? 'up' : ls < pls ? 'down' : 'flat', detail: ls > pls ? `Grew to ${ls} (from ${pls})` : ls === pls ? `Steady at ${ls}` : `Dropped to ${ls} (from ${pls})` })
    }
  }
  return changes
}

const DIR_STYLE = {
  up:   { icon: '▲', color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  down: { icon: '▼', color: '#fb7185', bg: 'rgba(251,113,133,0.08)' },
  flat: { icon: '—', color: '#6B7280', bg: 'rgba(0,0,0,0.03)' },
}

function WhatHappenedCard({ current, previous, actionPlan }: { current: Analysis; previous: Analysis; actionPlan?: any[] }) {
  const [open, setOpen] = useState(true)
  useEffect(() => { setOpen(localStorage.getItem('what-happened-seen') !== current.month) }, [current.month])
  const changes = buildChanges(current, previous)
  const topActions = (actionPlan ?? []).slice(0, 3)

  function handleToggle() {
    setOpen(prev => { if (prev) localStorage.setItem('what-happened-seen', current.month ?? ''); return !prev })
  }

  if (changes.length === 0) return null

  return (
    <div className="rounded-xl mb-4 overflow-hidden" style={{ background: 'white', border: '1px solid #EEEBE6', borderLeft: '3px solid #e9a020', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <button onClick={handleToggle} className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-transparent border-none cursor-pointer">
        <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>What happened this month</span>
        <span className="text-[12px]" style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid #EEEBE6' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-2" style={{ color: '#6B7280' }}>What changed</div>
          <div className="space-y-1.5 mb-4">
            {changes.map(c => {
              const s = DIR_STYLE[c.direction]
              return (
                <div key={c.label} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px]" style={{ background: s.bg }}>
                  <span className="text-[10px] font-bold" style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ color: '#1E2D3D' }}><strong>{c.label}:</strong> {c.detail}</span>
                </div>
              )
            })}
          </div>
          {topActions.length > 0 && (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>What needs action</div>
              <div className="space-y-1.5">
                {topActions.map((item: any, i: number) => {
                  const typeColor = item.type === 'RED' ? '#fb7185' : item.type === 'YELLOW' ? '#fbbf24' : '#34d399'
                  return (
                    <div key={i} className="flex items-start gap-2 text-[12.5px]">
                      <span className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor }} />
                      <span style={{ color: '#374151' }}>{item.title}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function PerformancePanel({ dashboard }: { dashboard: DashboardState }) {
  const { analysis, analyses } = dashboard

  return (
    <>
      {/* Performance Summary */}
      {analysis?.executiveSummary && (
        <div className="mb-7">
          <BoutiqueSectionLabel label="Performance Summary" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--green-text, #245c3f)', marginBottom: 12 }}>Working Well</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {analysis.executiveSummary.whatsWorking.map((item: string, i: number) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--sage, #6EBF8B)', padding: '8px 0 8px 12px', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 14, color: 'var(--ink2, #2a2520)' }}>
                    <SafeMarkdown content={item} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', marginBottom: 12 }}>Watch This</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {analysis.executiveSummary.whereToStrengthen.map((item: string, i: number) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--amber, #E9A020)', padding: '8px 0 8px 12px', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 14, color: 'var(--ink2, #2a2520)' }}>
                    <SafeMarkdown content={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coaching narrative (month-over-month) */}
      {analyses.length >= 2 && (
        <WhatHappenedCard current={analyses[0]} previous={analyses[1]} actionPlan={analysis?.actionPlan} />
      )}
    </>
  )
}
