'use client'
// components/TopBar.tsx — three-zone header: greeting | check-in + status + upload
import { useState, useEffect, useRef } from 'react'
import { ConnectionStatus } from './ConnectionStatus'
import { UploadModal } from './UploadModal'

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

  // Daily Check-In state
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [checkOpen, setCheckOpen] = useState(false)
  const checkRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = `daily-check-${getTodayKey()}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) setChecks(JSON.parse(stored))
    } catch {}
  }, [])

  // Close check-in popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (checkRef.current && !checkRef.current.contains(e.target as Node)) setCheckOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(checkKey: string) {
    setChecks(prev => {
      const next = { ...prev, [checkKey]: !prev[checkKey] }
      try { localStorage.setItem(`daily-check-${getTodayKey()}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const doneCount = DAILY_CHECKS.filter(c => checks[c.key]).length
  const allDone = doneCount === DAILY_CHECKS.length

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)

  // Open modal from custom event (fired by MobileNav or any other component)
  useEffect(() => {
    function onOpenUpload() { setUploadOpen(true) }
    window.addEventListener('open-upload-modal', onOpenUpload)
    return () => window.removeEventListener('open-upload-modal', onOpenUpload)
  }, [])

  // Open modal when ?upload=1 query param is present (used by "Upload to unlock" links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upload') === '1') {
      setUploadOpen(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('upload')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  function handleUploadSuccess() {
    setUploadOpen(false)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  return (
    <header className="flex-shrink-0" style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}>
      <div className="h-[56px] flex items-center px-6">

        {/* Left zone: greeting */}
        <div className="flex-1">
          <div className="text-[16px] font-medium leading-none" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Good morning{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
            {dateStr}
          </div>
        </div>

        {/* Right zone: check-in, status, upload */}
        <div className="flex items-center gap-2">

          {/* Daily Check-In button + popover */}
          <div ref={checkRef} className="relative">
            <button
              onClick={() => setCheckOpen(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:bg-stone-50"
              style={{ background: 'white', border: '0.5px solid #EEEBE6', color: '#1E2D3D', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="2" stroke="#1E2D3D" strokeWidth="1.2" />
                {doneCount > 0 && <path d="M3.5 6L5.5 8L8.5 4" stroke="#E9A020" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              Check-In
              {doneCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: allDone ? '#6EBF8B' : '#E9A020' }} />
              )}
            </button>

            {checkOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-lg"
                style={{ width: 260, background: 'white', border: '0.5px solid #EEEBE6', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <div className="px-4 pt-4 pb-2">
                  <div className="text-[14px] font-medium mb-0.5" style={{ color: '#1E2D3D' }}>Daily Check-In</div>
                  <div className="text-[11px]" style={{ color: '#6B7280' }}>{shortDate}</div>
                </div>
                <div className="px-4 py-2 space-y-1">
                  {DAILY_CHECKS.map(c => {
                    const checked = !!checks[c.key]
                    return (
                      <button key={c.key} onClick={() => toggle(c.key)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all hover:bg-stone-50"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <span style={{ width: 16, height: 16, background: checked ? '#E9A020' : 'transparent', border: checked ? '2px solid #E9A020' : '2px solid #D1D5DB', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {checked && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <span className="text-[13px]" style={{ color: checked ? '#6B7280' : '#1E2D3D', textDecoration: checked ? 'line-through' : 'none' }}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="px-4 pb-3 pt-2">
                  <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#EEEBE6' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(doneCount / DAILY_CHECKS.length) * 100}%`, background: allDone ? '#6EBF8B' : '#E9A020' }} />
                  </div>
                  <div className="text-[11px] text-center" style={{ color: allDone ? '#6EBF8B' : '#6B7280' }}>
                    {allDone ? 'All done for today! 🎉' : `${doneCount} of ${DAILY_CHECKS.length} complete`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connection status */}
          <ConnectionStatus />

          {/* Upload button */}
          <button
            onClick={() => setUploadOpen(true)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
            style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}>
            Upload Files
          </button>
        </div>
      </div>

      {/* Toast — success notification */}
      {showToast && (
        <div
          className="fixed bottom-6 left-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg"
          style={{
            transform: 'translateX(-50%)',
            background: '#6EBF8B',
            color: 'white',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Files analyzed! Dashboard updated.
        </div>
      )}

      {/* Upload modal — always rendered so input stays in DOM */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </header>
  )
}
