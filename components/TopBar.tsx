'use client'
// components/TopBar.tsx
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const DAILY_CHECKS = [
  { key: 'priorities', label: 'Review priorities' },
  { key: 'ads', label: 'Check ads' },
  { key: 'list', label: 'Track list growth' },
  { key: 'revenue', label: 'Log revenue' },
]

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

interface TopBarProps {
  user: { name?: string | null; email?: string | null; id: string }
}

export function TopBar({ user }: TopBarProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const shortDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = `daily-check-${getTodayKey()}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) setChecks(JSON.parse(stored))
    } catch {}
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function toggle(checkKey: string) {
    setChecks(prev => {
      const next = { ...prev, [checkKey]: !prev[checkKey] }
      try {
        localStorage.setItem(`daily-check-${getTodayKey()}`, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const doneCount = DAILY_CHECKS.filter(c => checks[c.key]).length
  const allDone = doneCount === DAILY_CHECKS.length
  const dotColor = allDone ? '#6EBF8B' : doneCount === 0 ? 'transparent' : '#E9A020'

  return (
    <header
      className="px-8 flex-shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}
    >
      <div className="h-[56px] flex items-center justify-between">
        <div>
          <div className="font-serif text-[17px] tracking-tight leading-none" style={{ color: '#1E2D3D' }}>
            Good morning{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>
            {dateStr}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Daily Check-In — popover trigger */}
          <div ref={panelRef} className="relative">
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-stone-50"
              style={{ background: 'white', border: '0.5px solid #EEEBE6', color: '#1E2D3D', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="2" stroke="#1E2D3D" strokeWidth="1.2" />
                {doneCount > 0 && <path d="M3.5 6L5.5 8L8.5 4" stroke="#E9A020" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              Daily Check-In
              {doneCount > 0 && doneCount < DAILY_CHECKS.length && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#E9A020' }} />
              )}
              {allDone && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6EBF8B' }} />
              )}
            </button>

            {/* Popover panel */}
            {open && (
              <div className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-lg"
                style={{ width: 280, background: 'white', border: '0.5px solid #EEEBE6', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <div className="px-4 pt-4 pb-2">
                  <div className="text-[14px] font-medium mb-0.5" style={{ color: '#1E2D3D' }}>
                    Daily Check-In
                  </div>
                  <div className="text-[12px]" style={{ color: '#6B7280' }}>
                    {shortDate}
                  </div>
                </div>

                <div className="px-4 py-2 space-y-1">
                  {DAILY_CHECKS.map(c => {
                    const checked = !!checks[c.key]
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggle(c.key)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all hover:bg-stone-50"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <span
                          className="w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            width: 18, height: 18,
                            background: checked ? '#E9A020' : 'transparent',
                            border: checked ? '2px solid #E9A020' : '2px solid #D1D5DB',
                            borderRadius: 4,
                          }}
                        >
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-[13px]" style={{
                          color: checked ? '#6B7280' : '#1E2D3D',
                          textDecoration: checked ? 'line-through' : 'none',
                        }}>
                          {c.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Progress */}
                <div className="px-4 pb-4 pt-2">
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#EEEBE6' }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${(doneCount / DAILY_CHECKS.length) * 100}%`, background: allDone ? '#6EBF8B' : '#E9A020' }} />
                  </div>
                  {allDone ? (
                    <div className="text-[12px] font-medium text-center" style={{ color: '#6EBF8B' }}>
                      All done for today! 🎉
                    </div>
                  ) : (
                    <div className="text-[12px] text-center" style={{ color: '#6B7280' }}>
                      {doneCount} of {DAILY_CHECKS.length} complete
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#0f6b46' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Connected
          </div>
          <Link
            href="/dashboard/upload"
            className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold no-underline transition-all"
            style={{ background: '#e9a020', color: '#0d1f35' }}
          >
            Upload Files
          </Link>
        </div>
      </div>
    </header>
  )
}
