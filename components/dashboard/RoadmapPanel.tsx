'use client'
// components/dashboard/RoadmapPanel.tsx
import Link from 'next/link'
import { BoutiqueSectionLabel } from '@/components/boutique'
import type { DashboardState } from './useDashboardData'

export function RoadmapPanel({ dashboard }: { dashboard: DashboardState }) {
  const { analysis } = dashboard

  if (!analysis?.executiveSummary?.topActions?.length) return null

  return (
    <div className="mb-7">
      <BoutiqueSectionLabel label="Your Growth Roadmap" />
      <div>
        {analysis.executiveSummary.topActions.map((action: { label: string; href: string }, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--line, #d8cfbd)' }}>
            <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, color: 'var(--ink4, #8a8076)', textAlign: 'center' }}>{i + 1}</div>
            <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 16, fontWeight: 500, color: 'var(--ink, #14110f)' }}>{action.label}</div>
            <Link href={action.href} style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Start here →</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
