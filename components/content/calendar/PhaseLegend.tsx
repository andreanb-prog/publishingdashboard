'use client'

const PHASES = [
  { label: 'Normal', color: 'var(--ink-4)' },
  { label: 'Pre-launch', color: '#8B5CF6' },
  { label: 'Launch week', color: 'var(--amber)' },
  { label: 'Post-launch', color: 'var(--sage)' },
]

export default function PhaseLegend() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 28,
      flexWrap: 'wrap',
    }}>
      {PHASES.map(phase => (
        <div key={phase.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: phase.color,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            color: 'var(--ink-3)',
          }}>
            {phase.label}
          </span>
        </div>
      ))}
    </div>
  )
}
