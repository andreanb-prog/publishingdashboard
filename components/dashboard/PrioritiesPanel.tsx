'use client'
// components/dashboard/PrioritiesPanel.tsx
import { useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import DOMPurify from 'dompurify'
import { BoutiqueSectionLabel } from '@/components/boutique'
import { InsightCallouts } from '@/components/InsightCallout'
import type { CoachingInsight } from '@/types'
import type { DashboardState } from './useDashboardData'

function SafeMarkdown({ content }: { content: string }) {
  const safe = typeof window !== 'undefined' ? DOMPurify.sanitize(content) : content
  return <ReactMarkdown>{safe}</ReactMarkdown>
}

function OtherObservations({ items }: { items: CoachingInsight[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-none cursor-pointer">
        <span className="text-[12px] font-semibold" style={{ color: '#6B7280' }}>Other observations ({items.length})</span>
        <span className="text-[11px] transition-transform duration-200" style={{ color: '#6B7280', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '0.5px solid #EEEBE6' }}>
          {items.map((item, i) => (
            <div key={i} className="pt-3">
              <div className="text-[12.5px] font-semibold mb-1" style={{ color: '#6B7280' }}>{item.title}</div>
              <div className="text-[12px] leading-[1.6]" style={{ color: '#9CA3AF' }}>{item.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PrioritiesPanel({ dashboard }: { dashboard: DashboardState }) {
  const { analysis, loading, expandedPriority, setExpandedPriority, donePriorities, toggleDone, showCompleted, setShowCompleted, coachTitle } = dashboard

  if (loading) return null

  const getPriorityLabel = (item: CoachingInsight, idx: number): { text: string; color: string } => {
    if (item.type === 'RED') return { text: 'Fix This', color: '#dc2626' }
    if (item.type === 'AMBER' || item.confidence === 'medium') return { text: 'Worth Checking', color: 'var(--amber-text, #a56b13)' }
    if (item.type === 'GREEN') return { text: 'Keep Doing This', color: 'var(--green-text, #245c3f)' }
    return idx === 0 ? { text: 'Fix This', color: '#dc2626' }
      : idx === 1 ? { text: 'Worth Checking', color: 'var(--amber-text, #a56b13)' }
      : { text: 'Keep Doing This', color: 'var(--green-text, #245c3f)' }
  }

  return (
    <div className="mb-7">
      <BoutiqueSectionLabel
        label="Today's Priorities"
        action={donePriorities.size > 0 ? (
          <button onClick={() => setShowCompleted(prev => !prev)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)' }}>
            {showCompleted ? 'Hide' : 'Show'} done ({donePriorities.size})
          </button>
        ) : undefined}
      />
      <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink3, #564e46)', marginBottom: 20, marginTop: -8 }}>
        Highest impact actions based on your real performance data
      </p>

      {analysis?.actionPlan?.length ? (() => {
        const allItems = analysis.actionPlan as CoachingInsight[]
        const mainItems  = allItems.filter(item => item.confidence !== 'low').slice(0, 3)
        const otherItems = allItems.filter(item => item.confidence === 'low')
        const visibleItems = mainItems.filter((_, i) => showCompleted || !donePriorities.has(i))

        return (
          <>
            {mainItems.length > 0 && (
              <div style={{ background: 'var(--card, white)', border: '1px solid var(--line, #d8cfbd)' }}>
                {visibleItems.map((item) => {
                  const i = mainItems.indexOf(item)
                  const href = item.channel === 'kdp' ? '/dashboard/kdp'
                    : item.channel === 'meta' ? '/dashboard/meta'
                    : item.channel === 'email' ? '/dashboard/mailerlite'
                    : item.channel === 'pinterest' ? '/dashboard/pinterest'
                    : '/dashboard?upload=1'
                  const isOpen = expandedPriority === i
                  const isDone = donePriorities.has(i)
                  const isFirst = i === 0
                  const { text: priorityText, color: priorityColor } = getPriorityLabel(item, i)

                  return (
                    <div key={i} style={{ borderBottom: i < mainItems.length - 1 ? '1px solid var(--line, #d8cfbd)' : 'none', background: 'var(--card, white)', opacity: isDone ? 0.65 : 1 }}>
                      <button onClick={() => !isDone && setExpandedPriority(isOpen ? null : i)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', textAlign: 'left', background: 'transparent', border: 'none', cursor: isDone ? 'default' : 'pointer' }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, fontWeight: 700, background: isDone ? 'transparent' : isFirst ? 'var(--ink, #14110f)' : 'transparent', border: isDone ? '1.5px solid #9CA3AF' : isFirst ? 'none' : '1.5px solid var(--amber, #D97706)', color: isDone ? '#9CA3AF' : isFirst ? 'var(--paper, #f7f1e5)' : 'var(--amber-text, #a56b13)' }}>
                          {isDone ? '✓' : i + 1}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          {!isDone && (
                            <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: priorityColor, marginBottom: 4 }}>
                              {priorityText}
                            </div>
                          )}
                          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 17, fontWeight: 500, lineHeight: 1.3, color: isDone ? 'var(--ink4, #8a8076)' : 'var(--ink, #14110f)', textDecoration: isDone ? 'line-through' : 'none' }}>
                            {item.title}
                          </div>
                        </span>
                        {!isDone && (
                          <span style={{ flexShrink: 0, fontSize: 18, lineHeight: 1, color: 'var(--ink4, #8a8076)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                        )}
                        {isDone && (
                          <button onClick={e => { e.stopPropagation(); toggleDone(i) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', flexShrink: 0 }}>
                            Undo
                          </button>
                        )}
                      </button>
                      <div style={{ overflow: 'hidden', transition: 'max-height 0.3s ease-out, opacity 0.3s ease-out', maxHeight: isOpen && !isDone ? '360px' : '0px', opacity: isOpen && !isDone ? 1 : 0 }}>
                        <div style={{ padding: '0 20px 18px 58px' }}>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, lineHeight: 1.6, color: 'var(--ink2, #2a2520)', marginBottom: 14 }}>
                            {item.body}
                            {item.action && <span style={{ marginLeft: 4 }}><strong style={{ color: 'var(--ink, #14110f)' }}>Next step:</strong> {item.action}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Link href={href} style={{ display: 'inline-block', textDecoration: 'none', background: 'var(--navy, #1E2D3D)', color: 'var(--paper, #f7f1e5)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px' }}>Full report →</Link>
                            <button onClick={() => toggleDone(i)} style={{ background: 'none', border: '1px solid var(--line, #d8cfbd)', cursor: 'pointer', padding: '7px 14px', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontStyle: 'italic', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green-text, #245c3f)' }}>Mark done</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {otherItems.length > 0 && <OtherObservations items={otherItems} />}
          </>
        )
      })() : analysis ? (
        <InsightCallouts analysis={analysis} page="overview" />
      ) : (
        <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 14, color: 'var(--ink3, #564e46)', padding: '16px 0' }}>
          Upload your files to see your priorities.
        </div>
      )}
    </div>
  )
}
