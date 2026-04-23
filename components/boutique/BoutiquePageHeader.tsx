'use client'
import React from 'react'

interface BoutiquePageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  actions?: React.ReactNode
}

export function BoutiquePageHeader({
  title,
  subtitle,
  badge,
  badgeColor = '#6EBF8B',
  actions,
}: BoutiquePageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 24,
      marginBottom: 32,
    }}>
      <div>
        {badge && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--ink3)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: badgeColor,
              flexShrink: 0,
            }} />
            {badge}
          </div>
        )}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: 36,
          lineHeight: 1.1,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink3)',
            margin: '6px 0 0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
