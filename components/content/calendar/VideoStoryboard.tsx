'use client'

interface Beat {
  time: string
  action: string
}

interface Props {
  beats: Beat[]
}

export default function VideoStoryboard({ beats }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {beats.map((beat, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '8px 12px',
            background: 'var(--paper-2)',
            borderRadius: 4,
            border: '1px solid var(--rule)',
          }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--rose)',
            fontWeight: 600,
            flexShrink: 0,
            marginTop: 2,
            minWidth: 36,
          }}>
            {beat.time}
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: 'var(--ink)',
            lineHeight: 1.5,
          }}>
            {beat.action}
          </div>
        </div>
      ))}
    </div>
  )
}
