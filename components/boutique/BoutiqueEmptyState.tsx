'use client'
import React from 'react'
import Link from 'next/link'

interface BoutiqueEmptyStateProps {
  message?: string
  ctaLabel?: string
  ctaHref?: string
}

export function BoutiqueEmptyState({
  message = 'No data yet',
  ctaLabel = 'Upload to unlock →',
  ctaHref,
}: BoutiqueEmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: 12,
    }}>
      {/* Dashed circle icon */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="var(--ink4)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>

      <p style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: 15,
        color: 'var(--ink3)',
        margin: 0,
      }}>
        {message}
      </p>

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--amber-text)',
            textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  )
}
