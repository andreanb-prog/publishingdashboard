'use client'
// components/dashboard/CoachPanel.tsx
import Link from 'next/link'
import type { CoachingInsight } from '@/types'
import type { DashboardState } from './useDashboardData'

function CoachPromotedPanel({ analysis }: { analysis: any }) {
  const topInsight: CoachingInsight | undefined =
    (analysis?.actionPlan as CoachingInsight[] | undefined)?.find((i: CoachingInsight) => i.type === 'RED') ??
    (analysis?.actionPlan as CoachingInsight[] | undefined)?.[0]
  if (!topInsight) return null

  let triggerNum: string | null = null
  let triggerLabel = ''
  let triggerIsNeg = true
  const ch = topInsight.channel
  if (ch === 'meta' && analysis.meta) {
    triggerNum = `${((analysis.meta.avgCTR ?? 0) as number).toFixed(1)}%`
    triggerLabel = 'CTR'
    triggerIsNeg = (analysis.meta.avgCTR ?? 0) < 1
  } else if ((ch === 'kdp' || ch === 'general') && analysis.kdp) {
    const rev = ((analysis.kdp.totalRoyaltiesUSD ?? 0) as number) + ((analysis.kdp.totalKENP ?? 0) as number) * 0.0045
    triggerNum = `$${rev.toFixed(2)}`
    triggerLabel = 'Est. Revenue'
    triggerIsNeg = rev < 100
  } else if (ch === 'email' && analysis.mailerLite) {
    triggerNum = `${((analysis.mailerLite.openRate ?? 0) as number).toFixed(1)}%`
    triggerLabel = 'Open Rate'
    triggerIsNeg = (analysis.mailerLite.openRate ?? 0) < 20
  }

  const href = ch === 'kdp' ? '/dashboard/kdp' : ch === 'meta' ? '/dashboard/meta' : ch === 'email' ? '/dashboard/mailerlite' : ch === 'pinterest' ? '/dashboard/pinterest' : '/dashboard?upload=1'
  const titleParts = topInsight.title.split(/\b(fix|scale|cut|improve|low|high|drop|weak|strong)\b/gi)

  return (
    <div className="coach-panel-responsive" style={{ background: 'var(--card, white)', border: '1px solid var(--line, #d8cfbd)', borderLeft: '4px solid var(--amber, #E9A020)', marginBottom: 24, padding: '20px 24px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)' }}>Coach</span>
          <span style={{ background: 'var(--amber-soft, #f5deaa)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber-text, #a56b13)', padding: '2px 7px' }}>New</span>
        </div>
        <p style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 'clamp(15px, 2vw, 22px)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink, #14110f)', lineHeight: 1.45, marginBottom: 16, marginTop: 0 }}>
          {titleParts.map((part, j) =>
            /^(fix|scale|cut|improve|low|high|drop|weak|strong)$/i.test(part)
              ? <em key={j} style={{ fontStyle: 'normal', color: 'var(--amber-text, #a56b13)', fontWeight: 500 }}>{part}</em>
              : part
          )}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={href} style={{ display: 'inline-block', textDecoration: 'none', background: 'var(--navy, #1E2D3D)', color: 'var(--paper, #f7f1e5)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px' }}>Opportunity →</Link>
          <Link href={href} style={{ display: 'inline-block', textDecoration: 'none', background: 'transparent', color: 'var(--ink3, #564e46)', border: '1px solid var(--line, #d8cfbd)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px' }}>See full report</Link>
        </div>
      </div>
      {triggerNum && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink4, #8a8076)', marginBottom: 4 }}>{triggerLabel}</div>
          <div style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 34, fontWeight: 500, lineHeight: 1, color: triggerIsNeg ? '#dc2626' : 'var(--green-text, #245c3f)' }}>{triggerNum}</div>
        </div>
      )}
    </div>
  )
}

export function CoachPanel({ dashboard }: { dashboard: DashboardState }) {
  const { analysis, copying, copied, handleCopy } = dashboard
  return (
    <>
      {analysis && <CoachPromotedPanel analysis={analysis} />}
    </>
  )
}

export function CoachCopyStrip({ dashboard }: { dashboard: DashboardState }) {
  const { copying, copied, handleCopy } = dashboard
  return (
    <div className="-mx-8 -mb-8 mt-2" style={{ background: '#FFF8F0', borderTop: '1px solid #EEEBE6' }}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-5">
        <div>
          <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>Export your data to any AI</div>
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Formatted summary — paste into Claude, ChatGPT, or Gemini</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={handleCopy} disabled={copying}
            className="inline-flex items-center gap-2 px-5 py-2 text-[13px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ background: '#1E2D3D', color: '#f7f1e5' }}
          >
            {copying ? 'Copying…' : copied ? '✓ Copied' : 'Copy summary'}
          </button>
          {[
            { label: 'Claude', href: 'https://claude.ai' },
            { label: 'ChatGPT', href: 'https://chat.openai.com' },
            { label: 'Gemini', href: 'https://gemini.google.com' },
          ].map(({ label, href }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              className="text-[12px] no-underline hover:underline hidden sm:inline" style={{ color: '#9CA3AF' }}>
              {label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
