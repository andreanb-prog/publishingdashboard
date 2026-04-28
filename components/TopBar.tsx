'use client'
// components/TopBar.tsx — three-zone header: greeting | date range (dashboard only) | check-in + status + upload
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ConnectionStatus } from './ConnectionStatus'
import { UploadModal } from './UploadModal'

function getDefaultDateRange() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return { from, to }
}

function loadStoredDateRange(): { from: string; to: string } {
  try {
    const stored = localStorage.getItem('authordash_date_range')
    if (stored) return JSON.parse(stored)
  } catch {}
  return getDefaultDateRange()
}

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
  user: { name?: string | null; email?: string | null; id: string; preferredGreetingName?: string | null }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname()

  // Client-only time-derived values (avoid server/client timezone mismatch)
  const [greeting, setGreeting] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [shortDate, setShortDate] = useState('')
  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting())
    setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    setShortDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  // Date range state — only used on /dashboard
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from)
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to)
  useEffect(() => {
    const stored = loadStoredDateRange()
    setDateFrom(stored.from)
    setDateTo(stored.to)
  }, [])

  function handleApplyDateRange() {
    const range = { from: dateFrom, to: dateTo }
    try { localStorage.setItem('authordash_date_range', JSON.stringify(range)) } catch {}
    try { window.dispatchEvent(new CustomEvent('date-range-change', { detail: range })) } catch {}
  }

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

  // Story Mode state — persisted in localStorage, default ON
  const [storyMode, setStoryMode] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('story-mode')
      if (stored !== null) setStoryMode(stored === 'true')
    } catch {}
  }, [])

  function toggleStoryMode() {
    setStoryMode(prev => {
      const next = !prev
      try { localStorage.setItem('story-mode', String(next)) } catch {}
      try { window.dispatchEvent(new CustomEvent('story-mode-change', { detail: { on: next } })) } catch {}
      return next
    })
  }

  // Upload modal state (used by MobileNav / settings page via open-upload-modal event)
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

  const handleUploadClose = useCallback(() => setUploadOpen(false), [])

  const handleUploadSuccess = useCallback(() => {
    setUploadOpen(false)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }, [])

  // Direct-upload state for the header "Upload Files" button
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  async function handleDirectFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    setUploadStatus('loading')
    setUploadMessage('')

    let totalRows = 0
    let errorMsg = ''

    for (const file of files) {
      const name = file.name.toLowerCase()
      console.log('[TopBar] direct upload:', { fileName: file.name, mimeType: file.type, ext: name.split('.').pop() })
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/parse-auto', { method: 'POST', body: form })
        const json = await res.json()

        if (!res.ok) {
          errorMsg = json.error || 'Upload failed. Please try again.'
        } else {
          totalRows += json.rowCount ?? json.data?.books?.length ?? 0
        }
      } catch {
        errorMsg = 'Upload failed. Check your connection and try again.'
      }
    }

    if (errorMsg && totalRows === 0) {
      setUploadStatus('error')
      setUploadMessage(errorMsg)
    } else {
      setUploadStatus('success')
      setUploadMessage(`✓ Uploaded — ${totalRows} row${totalRows !== 1 ? 's' : ''} imported`)
      try { window.dispatchEvent(new CustomEvent('dashboard-data-refresh')) } catch {}
      setTimeout(() => setUploadStatus('idle'), 5000)
    }
  }

  return (
    <header className="flex-shrink-0" style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}>
      <div className="h-[56px] flex items-center px-6">

        {/* Left zone: greeting */}
        <div className="flex-1">
          <div className="text-[16px] font-medium leading-none" style={{ color: '#1E2D3D', fontFamily: "var(--font-sans)" }}>
            {greeting}{greeting && (user.preferredGreetingName ?? user.name) ? `, ${user.preferredGreetingName ?? user.name!.split(' ')[0]}` : ''}
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#6B7280' }}>
            {dateStr}
          </div>
        </div>

        {/* Middle zone: date range picker (main dashboard only) */}
        {pathname === '/dashboard' && (
          <div className="flex items-center mx-4 flex-shrink-0">
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(30,45,61,0.5)', fontFamily: "var(--font-sans)", marginBottom: 3 }}>
                Date Range
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 20,
                    border: '0.5px solid #1E2D3D',
                    background: 'white',
                    color: '#1E2D3D',
                    fontFamily: "var(--font-sans)",
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.4)' }}>→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 20,
                    border: '0.5px solid #1E2D3D',
                    background: 'white',
                    color: '#1E2D3D',
                    fontFamily: "var(--font-sans)",
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <button
                  onClick={handleApplyDateRange}
                  style={{
                    fontSize: 11,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: '#E9A020',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

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

          {/* Story Mode toggle — HIDDEN */}
          {/* <button
            onClick={toggleStoryMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:bg-stone-50"
            style={{
              background: storyMode ? '#FFF8F0' : 'white',
              border: `0.5px solid ${storyMode ? '#E9A020' : '#EEEBE6'}`,
              color: storyMode ? '#E9A020' : '#6B7280',
              cursor: 'pointer',
            }}
            title={storyMode ? 'Story Mode on — click to hide copy' : 'Story Mode off — click to show copy'}
          >
            📖 Story Mode
          </button> */}

          {/* Connection status */}
          <ConnectionStatus />

          {/* Hidden file input — always in DOM, never conditionally mounted */}
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx"
            style={{ display: 'none', position: 'absolute', left: '-9999px' }}
            onChange={handleDirectFileChange}
          />

          {/* Inline upload status */}
          {uploadStatus !== 'idle' && (
            <span
              className="text-[11px] font-medium max-w-[160px] truncate"
              style={{ color: uploadStatus === 'success' ? '#6EBF8B' : uploadStatus === 'error' ? '#F97B6B' : '#6B7280' }}
            >
              {uploadStatus === 'loading' ? 'Uploading...' : uploadMessage}
            </span>
          )}

          {/* Upload button */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadStatus === 'loading'}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
            style={{
              background: '#E9A020',
              color: '#0d1f35',
              border: 'none',
              cursor: uploadStatus === 'loading' ? 'not-allowed' : 'pointer',
              opacity: uploadStatus === 'loading' ? 0.7 : 1,
            }}
          >
            {uploadStatus === 'loading' ? 'Uploading…' : 'Upload Files'}
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
            fontFamily: "var(--font-sans)",
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
        onClose={handleUploadClose}
        onSuccess={handleUploadSuccess}
      />
    </header>
  )
}
