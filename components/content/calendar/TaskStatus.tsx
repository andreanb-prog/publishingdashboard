'use client'

import { useState } from 'react'

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

  const [perfOpen, setPerfOpen] = useState(false)
  const [reach, setReach] = useState('')
  const [saves, setSaves] = useState('')
  const [clicks, setClicks] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function markScheduled() {
    const res = await fetch(`/api/content/projects/${projectId}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
    })
    if (res.ok) onScheduled()
  }

  async function logPerformance() {
    setSaving(true)
    try {
      await fetch(`/api/content/projects/${projectId}/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reach: reach ? parseInt(reach, 10) : undefined,
          saves: saves ? parseInt(saves, 10) : undefined,
          clicks: clicks !== null ? clicks : undefined,
        }),
      })
      setSaved(true)
      setPerfOpen(false)
    } finally {
      setSaving(false)
    }
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

      {/* Performance logger — only when scheduled */}
      {scheduledAt && (
        <div style={{ marginTop: 18, borderTop: '0.5px solid var(--rule)', paddingTop: 14 }}>
          <button
            onClick={() => { setPerfOpen(v => !v); setSaved(false) }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--ink-4)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {perfOpen ? '↑' : '↓'} Log how it performed
            {saved && (
              <span style={{ color: '#6EBF8B', marginLeft: 4 }}>✓ Logged</span>
            )}
          </button>

          {perfOpen && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: 4,
                }}>
                  Reach
                </label>
                <input
                  type="number"
                  value={reach}
                  onChange={e => setReach(e.target.value)}
                  placeholder="How many people saw it?"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--ink)',
                    background: 'var(--paper-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: 4,
                }}>
                  Saves / Shares
                </label>
                <input
                  type="number"
                  value={saves}
                  onChange={e => setSaves(e.target.value)}
                  placeholder="Saves or shares"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--ink)',
                    background: 'var(--paper-2)',
                    border: '1px solid var(--rule)',
                    borderRadius: 4,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: 6,
                }}>
                  Drove clicks?
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      onClick={() => setClicks(val)}
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '5px 14px',
                        borderRadius: 4,
                        border: '1px solid var(--rule)',
                        cursor: 'pointer',
                        background: clicks === val ? 'var(--ink)' : 'transparent',
                        color: clicks === val ? 'white' : 'var(--ink-3)',
                        transition: 'background 0.12s',
                      }}
                    >
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={logPerformance}
                disabled={saving}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'white',
                  background: '#6EBF8B',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  cursor: saving ? 'default' : 'pointer',
                  width: '100%',
                  opacity: saving ? 0.7 : 1,
                  marginTop: 2,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
