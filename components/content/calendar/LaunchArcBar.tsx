'use client'

interface Props {
  launchDate: string
  frequency: number
  totalPosts: number
}

const PHASE_COLORS: Record<string, string> = {
  connect: 'var(--paper-3)',
  tease: '#D6B5A8',
  origin: '#DDB987',
  launch: 'var(--ink)',
  echo: '#9AAEB8',
}

const PHASE_TEXT: Record<string, string> = {
  connect: 'var(--ink-3)',
  tease: 'var(--ink)',
  origin: 'var(--ink)',
  launch: '#F1E8D4',
  echo: 'var(--ink)',
}

export default function LaunchArcBar({ launchDate, frequency, totalPosts }: Props) {
  const today = new Date()
  const launch = launchDate ? new Date(launchDate) : new Date()
  const daysUntil = !isNaN(launch.getTime())
    ? Math.max(0, Math.round((launch.getTime() - today.getTime()) / 86400000))
    : 0
  const postsUntilLaunch = Math.round(daysUntil * frequency / 7)

  // Phase boundaries (post counts)
  const connectEnd = Math.max(0, postsUntilLaunch - 7)
  const teaseEnd = Math.max(connectEnd, postsUntilLaunch - 3)
  const originEnd = postsUntilLaunch
  const launchEnd = Math.min(totalPosts, postsUntilLaunch + 5)
  const echoEnd = totalPosts

  const phases = [
    { key: 'connect', label: 'Connect', start: 0, end: connectEnd },
    { key: 'tease', label: 'Tease', start: connectEnd, end: teaseEnd },
    { key: 'origin', label: 'Origin Story', start: teaseEnd, end: originEnd },
    { key: 'launch', label: 'Launch Week', start: originEnd, end: launchEnd },
    { key: 'echo', label: 'Echo', start: launchEnd, end: echoEnd },
  ].filter(p => p.end > p.start)

  const launchPercent = totalPosts > 0 ? (postsUntilLaunch / totalPosts) * 100 : 50

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 10,
      }}>
        Launch Arc
      </div>

      <div style={{ position: 'relative', height: 32, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {phases.map(phase => {
          const widthPct = ((phase.end - phase.start) / totalPosts) * 100
          return (
            <div
              key={phase.key}
              style={{
                width: `${widthPct}%`,
                background: PHASE_COLORS[phase.key] ?? 'var(--paper-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: PHASE_TEXT[phase.key] ?? 'var(--ink)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '0 6px',
              }}>
                {phase.label}
              </span>
            </div>
          )
        })}

        {/* Launch day marker */}
        <div style={{
          position: 'absolute',
          left: `${Math.min(launchPercent, 98)}%`,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'var(--amber)',
        }} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        position: 'relative',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--amber)',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12,
          color: 'var(--ink-3)',
        }}>
          Launch: {launch.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
