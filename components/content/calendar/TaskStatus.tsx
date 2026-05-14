'use client'

interface Props {
  scheduledAt?: string | null
  imageUrl?: string | null
  projectId: string
  postId: string
  onScheduled: () => void
}

export default function TaskStatus({ scheduledAt, imageUrl, projectId, postId, onScheduled }: Props) {
  const status = scheduledAt ? 'SCHEDULED' : !imageUrl ? 'NEEDS IMAGE' : 'READY TO WRITE'

  const chip = {
    SCHEDULED: { bg: '#6EBF8B20', border: '#6EBF8B40', color: '#6EBF8B', label: 'SCHEDULED' },
    'READY TO WRITE': { bg: '#E9A02015', border: '#E9A02030', color: '#E9A020', label: 'READY TO WRITE' },
    'NEEDS IMAGE': { bg: '#F472B615', border: '#F472B630', color: '#F472B6', label: 'NEEDS IMAGE' },
  }[status]

  const context = {
    SCHEDULED: 'In Hootsuite. Nothing to do today.',
    'READY TO WRITE': 'Copy the caption and schedule it.',
    'NEEDS IMAGE': 'Assign an image from your library.',
  }[status]

  async function markScheduled() {
    const res = await fetch(`/api/content/projects/${projectId}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
    })
    if (res.ok) onScheduled()
  }

  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 10,
      }}>
        Today's Task
      </div>

      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: chip.bg,
        border: `1px solid ${chip.border}`,
        borderRadius: 3,
        padding: '4px 10px',
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          color: chip.color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {chip.label}
        </span>
      </div>

      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        color: 'var(--ink-3)',
        margin: '0 0 14px',
        lineHeight: 1.55,
      }}>
        {context}
      </p>

      {status === 'READY TO WRITE' && (
        <button
          onClick={markScheduled}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'white',
            background: 'var(--ink)',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Mark as scheduled →
        </button>
      )}
    </div>
  )
}
