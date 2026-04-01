'use client'
// components/TopBar.tsx
import { useState, useEffect } from 'react'
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

  // Daily Check state — persists per day in localStorage
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const key = `daily-check-${getTodayKey()}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) setChecks(JSON.parse(stored))
    } catch {}
  }, [])

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
          {/* Daily Check — desktop: inline, mobile: toggle */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            <span className="text-[11px] font-medium" style={{ color: '#1E2D3D', letterSpacing: '0.5px' }}>
              Daily Check-In
            </span>
            <span className="w-px h-4" style={{ background: '#EEEBE6' }} />
            {DAILY_CHECKS.map(c => (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className="flex items-center gap-1.5 text-[11px] font-medium transition-all"
                style={{
                  color: checks[c.key] ? '#6B7280' : '#1E2D3D',
                  textDecoration: checks[c.key] ? 'line-through' : 'none',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] flex-shrink-0 transition-all"
                  style={{
                    background: checks[c.key] ? '#E9A020' : 'transparent',
                    border: checks[c.key] ? '1.5px solid #E9A020' : '1.5px solid #D4D0CB',
                    color: checks[c.key] ? 'white' : 'transparent',
                  }}
                >
                  {checks[c.key] ? '✓' : ''}
                </span>
                {c.label}
              </button>
            ))}
          </div>

          {/* Mobile: compact toggle */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="md:hidden flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all"
            style={{ background: 'rgba(233,160,32,0.1)', color: '#E9A020', border: 'none', cursor: 'pointer' }}
          >
            ✓ {doneCount}/{DAILY_CHECKS.length}
          </button>

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

      {/* Mobile accordion */}
      {expanded && (
        <div className="md:hidden pb-3 flex flex-wrap gap-2">
          {DAILY_CHECKS.map(c => (
            <button
              key={c.key}
              onClick={() => toggle(c.key)}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: checks[c.key] ? 'rgba(233,160,32,0.1)' : '#F5F5F4',
                border: `1px solid ${checks[c.key] ? '#E9A020' : '#EEEBE6'}`,
                color: checks[c.key] ? '#E9A020' : '#1E2D3D',
                textDecoration: checks[c.key] ? 'line-through' : 'none',
                cursor: 'pointer',
              }}
            >
              {checks[c.key] ? '✓' : '○'} {c.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
