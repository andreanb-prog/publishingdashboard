'use client'
import { useEffect, useRef, useState } from 'react'

type SyncStatus = {
  hasExtension: boolean
  kdp: { lastSync: string | null }
  meta: { lastSync: string | null }
  bookclicker: { lastSync: string | null }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 90) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function mostRecentSync(status: SyncStatus): string | null {
  const times = [status.kdp.lastSync, status.meta.lastSync, status.bookclicker.lastSync]
    .filter(Boolean) as string[]
  if (!times.length) return null
  return times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

const PLATFORMS = [
  { key: 'kdp' as const, label: 'KDP' },
  { key: 'meta' as const, label: 'Meta' },
  { key: 'bookclicker' as const, label: 'BookClicker' },
]

export function FetchStatusPill() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/extension/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.hasExtension) setStatus(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!status) return null

  const latest = mostRecentSync(status)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-stone-50"
        style={{
          background: 'white',
          border: '0.5px solid #EEEBE6',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: '#6EBF8B' }} />
        <span className="text-[12px]" style={{ color: '#6B7280' }}>
          🐕 Fetch · {latest ? relativeTime(latest) : 'not yet synced'}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl"
          style={{
            width: 230,
            background: 'white',
            border: '0.5px solid #EEEBE6',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          <div className="px-4 pt-3.5 pb-1">
            <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}>
              Fetch Last Sync
            </div>
          </div>
          <div className="px-4 py-3 space-y-3">
            {PLATFORMS.map(({ key, label }) => {
              const lastSync = status[key].lastSync
              return (
                <div key={key} className="flex items-center gap-2.5">
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: 7, height: 7, background: lastSync ? '#6EBF8B' : '#D1D5DB', marginTop: 1 }}
                  />
                  <div style={{ fontFamily: 'var(--font-sans)' }}>
                    <span className="text-[12px] font-medium" style={{ color: '#1E2D3D' }}>{label}</span>
                    <span className="text-[11px] ml-2" style={{ color: '#9CA3AF' }}>
                      {lastSync ? relativeTime(lastSync) : 'not synced'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
