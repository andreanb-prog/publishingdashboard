'use client'
import React from 'react'

interface BoutiqueDataGridProps {
  cols?: 2 | 3 | 4
  children: React.ReactNode
}

const colClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function BoutiqueDataGrid({ cols = 3, children }: BoutiqueDataGridProps) {
  return (
    <div
      className={`grid gap-px ${colClasses[cols]}`}
      style={{
        background: 'var(--line)',
        border: '1px solid var(--line)',
      }}
    >
      {children}
    </div>
  )
}
