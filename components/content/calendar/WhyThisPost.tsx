'use client'

const PHASE_LABELS: Record<string, string> = {
  normal: 'BUILD TRUST, NO ASKS',
  anticipation: 'ANTICIPATION BUILDING',
  prelaunch: 'ANTICIPATION BUILDING',
  launch: 'LAUNCH WEEK',
  postlaunch: 'SOCIAL PROOF',
}

interface Props {
  whyThisPost?: string | null
  phase: string
}

export default function WhyThisPost({ whyThisPost, phase }: Props) {
  const phaseLabel = PHASE_LABELS[phase] ?? 'BUILD TRUST, NO ASKS'

  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: '#E9A020',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 10,
      }}>
        Why This Post, Today
      </div>

      {whyThisPost ? (
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 14,
          color: 'var(--ink)',
          lineHeight: 1.7,
          fontStyle: 'italic',
          margin: '0 0 14px',
        }}>
          {whyThisPost}
        </p>
      ) : (
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          color: 'var(--ink-4)',
          fontStyle: 'italic',
          margin: '0 0 14px',
          lineHeight: 1.6,
        }}>
          Regenerate your calendar to get a personalized explanation.
        </p>
      )}

      <div style={{
        display: 'inline-block',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        fontWeight: 700,
        color: phase === 'launch' ? '#E9A020' : phase === 'postlaunch' ? '#6EBF8B' : phase === 'anticipation' || phase === 'prelaunch' ? '#8B5CF6' : 'var(--ink-3)',
        background: phase === 'launch' ? '#E9A02015' : phase === 'postlaunch' ? '#6EBF8B15' : phase === 'anticipation' || phase === 'prelaunch' ? '#8B5CF615' : 'var(--paper-2)',
        border: `1px solid ${phase === 'launch' ? '#E9A02030' : phase === 'postlaunch' ? '#6EBF8B30' : phase === 'anticipation' || phase === 'prelaunch' ? '#8B5CF630' : 'var(--rule)'}`,
        borderRadius: 3,
        padding: '3px 8px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {phaseLabel}
      </div>
    </div>
  )
}
