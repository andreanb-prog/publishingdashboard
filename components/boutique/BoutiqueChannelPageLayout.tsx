'use client'
import React from 'react'

interface BoutiqueChannelPageLayoutProps {
  children: React.ReactNode
}

export function BoutiqueChannelPageLayout({ children }: BoutiqueChannelPageLayoutProps) {
  return (
    <div style={{
      background: 'var(--paper)',
      padding: '40px 48px 64px',
      minHeight: '100%',
    }}>
      {children}
    </div>
  )
}
