'use client'
// components/dashboard/RailPanel.tsx
import Link from 'next/link'
import type { Task } from '@/types'

export function RailLaunchCountdown() {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', marginBottom: 16 }}>
        Launch Countdown
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px', border: '1px dashed var(--line, #d8cfbd)' }}>
        <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 15, fontWeight: 400, color: 'var(--ink3, #564e46)' }}>No launch scheduled</div>
        <Link href="/dashboard/launch" style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', textDecoration: 'none' }}>
          Plan a launch →
        </Link>
      </div>
    </div>
  )
}

export function RailTasksSection({ tasks }: { tasks: Task[] }) {
  const doneTasks = tasks.filter(t => t.status === 'done').slice(0, 2)
  const openTasks = tasks.filter(t => t.status === 'todo')
  const topTask   = openTasks[0] ?? null
  const restTasks = openTasks.slice(1, 3)
  const doneCount = tasks.filter(t => t.status === 'done').length
  const total     = Math.min(tasks.length, 5)
  const r         = 15
  const circ      = 2 * Math.PI * r
  const dashOff   = total > 0 ? circ * (1 - doneCount / total) : circ

  function fmtCompletedTime(iso: string | null | undefined) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r={r} stroke="var(--line, #d8cfbd)" strokeWidth="2.5" />
          {total > 0 && (
            <circle cx="17" cy="17" r={r} stroke="var(--amber, #D97706)" strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round" transform="rotate(-90 17 17)" />
          )}
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)' }}>Today&apos;s Tasks</div>
          {total > 0 && <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--amber-text, #a56b13)' }}>{doneCount} / {total} done</div>}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: '12px 14px', border: '1px dashed var(--line, #d8cfbd)', fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 13, color: 'var(--ink3, #564e46)' }}>
          No tasks yet.{' '}
          <Link href="/dashboard/tasks" style={{ color: 'var(--amber-text, #a56b13)', textDecoration: 'none' }}>Add one →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {doneTasks.map(t => (
            <div key={t.id} style={{ padding: '8px 12px', opacity: 0.7, border: '1px solid var(--line, #d8cfbd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink3, #564e46)', textDecoration: 'line-through', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              {t.completedAt && <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, color: 'var(--ink4, #8a8076)', flexShrink: 0 }}>{fmtCompletedTime(t.completedAt)}</span>}
            </div>
          ))}
          {topTask && (
            <div style={{ padding: '12px 14px', border: '1px solid var(--amber, #D97706)', background: 'rgba(217,119,6,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', marginBottom: 4 }}>Next up</div>
              <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink, #14110f)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{topTask.title}</div>
              {topTask.category && <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, color: 'var(--ink4, #8a8076)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{topTask.category}</div>}
              <Link href="/dashboard/tasks" style={{ display: 'inline-block', textDecoration: 'none', background: 'var(--navy, #1E2D3D)', color: 'var(--paper, #f7f1e5)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px' }}>Start →</Link>
            </div>
          )}
          {restTasks.map(t => (
            <div key={t.id} style={{ padding: '10px 12px', border: '1px solid var(--line, #d8cfbd)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 12, fontStyle: 'italic', color: 'var(--ink2, #2a2520)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              <Link href="/dashboard/tasks" style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', textDecoration: 'none', flexShrink: 0 }}>Skip</Link>
            </div>
          ))}
          {openTasks.length > 3 && (
            <Link href="/dashboard/tasks" style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', textDecoration: 'none', marginTop: 4, display: 'block' }}>
              +{openTasks.length - 3} more →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
