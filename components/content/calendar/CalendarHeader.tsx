'use client'

import { useState } from 'react'
import ExportMenu from './ExportMenu'

interface Props {
  projectId: string
  postCount: number
  onRegenerate: () => void
  generating: boolean
}

export default function CalendarHeader({ projectId, postCount, onRegenerate, generating }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 12,
        }}>
          STEP 05 · THE CALENDAR
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: '0 0 14px',
        }}>
          Thirty <em style={{ fontStyle: 'italic', fontWeight: 400 }}>intentional</em> days.
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14,
          color: 'var(--ink-4)',
          lineHeight: 1.65,
          margin: 0,
          maxWidth: 480,
        }}>
          Every post knows its pillar, its phase, and its job. You decide which day is for shooting,
          which is for writing. The work just goes on the calendar.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexShrink: 0 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          HOOTSUITE · TAILWIND · LATER
        </div>

        {postCount > 0 && <ExportMenu projectId={projectId} />}

        <button
          onClick={onRegenerate}
          disabled={generating}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: generating ? 'var(--ink-4)' : 'var(--ink)',
            background: 'transparent',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            padding: '7px 14px',
            cursor: generating ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          ↺ {postCount > 0 ? 'Regenerate' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
