'use client'
import React, { useState } from 'react'

interface BoutiqueInsightCardProps {
  type: 'watch' | 'nice'
  title: string
  body: string
  defaultCollapsed?: boolean
}

export function BoutiqueInsightCard({
  type,
  title,
  body,
  defaultCollapsed = true,
}: BoutiqueInsightCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const borderColor = type === 'watch' ? 'var(--amber-boutique)' : '#6EBF8B'
  const labelColor  = type === 'watch' ? 'var(--amber-text)' : 'var(--green-text)'
  const labelText   = type === 'watch' ? 'WATCH THIS' : 'NICE WORK'

  return (
    <div style={{
      borderLeft: `3px solid ${borderColor}`,
      paddingLeft: 14,
      marginBottom: 12,
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: labelColor,
            flexShrink: 0,
          }}>
            {labelText}
          </span>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 16,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: collapsed ? 'nowrap' : 'normal',
          }}>
            {title}
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--ink4)',
          flexShrink: 0,
          marginLeft: 8,
          transform: collapsed ? 'none' : 'rotate(180deg)',
          transition: 'transform 0.15s ease',
          display: 'inline-block',
        }}>
          ›
        </span>
      </div>

      {!collapsed && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          color: 'var(--ink2)',
          lineHeight: 1.65,
          marginTop: 8,
        }}>
          {body}
        </div>
      )}
    </div>
  )
}
