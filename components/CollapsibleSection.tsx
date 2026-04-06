'use client'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Collapsible section wrapper used on MailerLite and KDP pages.
 * Persists open/closed state in localStorage via `storageKey`.
 * Default state: expanded. Chevron rotates 180° when collapsed.
 * Uses CSS grid-template-rows transition for smooth height animation.
 */
export function CollapsibleSection({
  title,
  storageKey,
  badge,
  headerRight,
  subtitle,
  className = '',
  defaultOpen = true,
  children,
}: {
  title: string
  storageKey: string
  badge?: React.ReactNode
  /** Rendered right of the title area; click is isolated from the collapse toggle */
  headerRight?: React.ReactNode
  subtitle?: string
  className?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) setOpen(stored === 'true')
  }, [storageKey])

  const toggle = () => {
    const next = !open
    setOpen(next)
    localStorage.setItem(storageKey, String(next))
  }

  return (
    <div className={`rounded-xl ${className}`} style={{ background: 'white', border: '1px solid #EEEBE6' }}>
      {/* Header row — full-width, clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
        className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
        style={{ borderBottom: '1px solid #EEEBE6' }}
      >
        {/* Left: title + optional subtitle + optional badge */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>{title}</span>
            {subtitle && (
              <span className="text-[10.5px]" style={{ color: '#6B7280' }}>{subtitle}</span>
            )}
          </div>
          {badge}
        </div>

        {/* Right: optional headerRight (stops propagation) + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {headerRight && (
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              {headerRight}
            </div>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#6B7280',
              transform: open ? 'rotate(0deg)' : 'rotate(-180deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Animated content area using grid row transition */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
