'use client'
import { useEffect, useRef, useState } from 'react'

export interface BoutiqueDropdownOption {
  label: string
  value: string
  disabled?: boolean
}

interface BoutiqueDropdownProps {
  options: BoutiqueDropdownOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  width?: number | string
  style?: React.CSSProperties
}

export function BoutiqueDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  label,
  width = '100%',
  style,
}: BoutiqueDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', width, ...style }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          color: '#6B7280',
          marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: selected ? '#1E2D3D' : '#9CA3AF',
          background: '#FFFFFF',
          border: open ? '1px solid #D97706' : '1px solid #E8E1D3',
          borderRadius: 2,
          padding: '8px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left' as const,
          boxShadow: 'none',
          transition: 'border-color 0.15s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: '#9CA3AF',
          flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s ease',
          display: 'inline-block',
        }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          right: 0,
          zIndex: 40,
          background: '#FFFFFF',
          border: '1px solid #E8E1D3',
          borderRadius: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width: '100%',
                display: 'block',
                textAlign: 'left' as const,
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: opt.disabled ? '#9CA3AF' : opt.value === value ? '#D97706' : '#1E2D3D',
                background: opt.value === value ? '#FFF8EC' : '#FFFFFF',
                border: 'none',
                borderBottom: '0.5px solid #EEEBE6',
                padding: '9px 12px',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!opt.disabled && opt.value !== value)
                  (e.currentTarget as HTMLElement).style.background = '#F7F1E6'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background =
                  opt.value === value ? '#FFF8EC' : '#FFFFFF'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
