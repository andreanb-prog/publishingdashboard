'use client'
import React from 'react'

interface BoutiqueSectionLabelProps {
  label: string
  action?: React.ReactNode
}

export function BoutiqueSectionLabel({ label, action }: BoutiqueSectionLabelProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--ink3)',
        }}>
          {label}
        </span>
        {action && (
          <div>{action}</div>
        )}
      </div>
      <div style={{
        height: 1,
        background: 'var(--line)',
      }} />
    </div>
  )
}
