'use client'
import { useEffect } from 'react'

interface BoutiqueModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number | string
}

export function BoutiqueModal({ open, onClose, title, children, width = 560 }: BoutiqueModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(30,45,61,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E1D3',
        borderRadius: 0,
        boxShadow: 'none',
        width: typeof width === 'number' ? width : width,
        maxWidth: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {title && (
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #EEEBE6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              fontSize: 18,
              color: '#1E2D3D',
            }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280',
                fontSize: 20,
                lineHeight: 1,
                padding: '0 4px',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}
