'use client'
// components/ConnectionStatus.tsx — Multi-source API health indicator
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type IntegrationStatus = {
  status: 'green' | 'amber' | 'red'
  text: string
  actionText?: string
  actionHref?: string
}

type ConnectionHealth = {
  mailerlite: IntegrationStatus
  meta: IntegrationStatus
  kdp: IntegrationStatus
  stripe: IntegrationStatus
  cachedAt: string
}

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

const CACHE_KEY = 'authordash_connection_health'
const CACHE_TTL = 5 * 60 * 1000

const DOT_COLORS = {
  green: '#6EBF8B',
  amber: '#E9A020',
  red: '#F97B6B',
}

const INTEGRATIONS: { key: keyof Omit<ConnectionHealth, 'cachedAt'>; label: string }[] = [
  { key: 'mailerlite', label: 'MailerLite' },
  { key: 'meta', label: 'Meta Ads' },
  { key: 'kdp', label: 'KDP' },
  { key: 'stripe', label: 'Stripe' },
]

function getCached(): ConnectionHealth | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_TTL) return data
  } catch {}
  return null
}

function setCache(data: ConnectionHealth) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch {}
}

// Tiny spinning icon
function Spinner() {
  return (
    <svg className="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="#E9A020" strokeWidth="1.5" strokeDasharray="6 4" />
    </svg>
  )
}

export function ConnectionStatus() {
  const [health, setHealth] = useState<ConnectionHealth | null>(null)
  const [open, setOpen] = useState(false)
  const [mlSync, setMlSync] = useState<SyncState>('idle')
  const [metaSync, setMetaSync] = useState<SyncState>('idle')
  const [allSync, setAllSync] = useState<SyncState>('idle')
  const ref = useRef<HTMLDivElement>(null)

  async function refreshHealth() {
    clearCache()
    const data = await fetch('/api/health/connections')
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => null)
    if (data) { setHealth(data); setCache(data) }
    return data
  }

  useEffect(() => {
    const cached = getCached()
    if (cached) setHealth(cached)
    // Always fetch fresh on mount
    fetch('/api/health/connections')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setHealth(data); setCache(data) })
      .catch(() => {})

    // When Meta is disconnected from settings, force a fresh fetch
    function onDisconnected() { refreshHealth() }
    window.addEventListener('meta:disconnected', onDisconnected)

    // When Meta connects via OAuth (settings page dispatches this), refresh health
    // then auto-trigger a sync so status flips to green immediately
    async function onMetaConnected() {
      await refreshHealth()
      setMetaSync('syncing')
      try {
        const res = await fetch('/api/meta/sync', { method: 'POST' })
        if (res.ok) window.dispatchEvent(new CustomEvent('meta:synced'))
        await refreshHealth()
        setMetaSync('ok')
        setTimeout(() => setMetaSync('idle'), 2500)
      } catch {
        setMetaSync('error')
        setTimeout(() => setMetaSync('idle'), 2500)
      }
    }
    window.addEventListener('meta:connected', onMetaConnected)

    return () => {
      window.removeEventListener('meta:disconnected', onDisconnected)
      window.removeEventListener('meta:connected', onMetaConnected)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function syncMailerLite() {
    setMlSync('syncing')
    try {
      await refreshHealth()
      setMlSync('ok')
      setTimeout(() => setMlSync('idle'), 2500)
    } catch {
      setMlSync('error')
      setTimeout(() => setMlSync('idle'), 2500)
    }
  }

  async function syncMeta() {
    setMetaSync('syncing')
    try {
      const res = await fetch('/api/meta/sync', { method: 'POST' })
      if (!res.ok) throw new Error()
      await refreshHealth()
      window.dispatchEvent(new CustomEvent('meta:synced'))
      setMetaSync('ok')
      setTimeout(() => setMetaSync('idle'), 2500)
    } catch {
      setMetaSync('error')
      setTimeout(() => setMetaSync('idle'), 2500)
    }
  }

  function connectMeta() {
    window.location.href = '/api/meta/connect'
  }

  async function syncAll() {
    setAllSync('syncing')
    try {
      if (health?.meta.status === 'green') {
        await fetch('/api/meta/sync', { method: 'POST' }).catch(() => {})
      }
      await refreshHealth()
      setAllSync('ok')
      setTimeout(() => setAllSync('idle'), 2500)
    } catch {
      setAllSync('error')
      setTimeout(() => setAllSync('idle'), 2500)
    }
  }

  const statuses = health ? INTEGRATIONS.map(i => (health[i.key] as IntegrationStatus).status) : []
  const greenCount = statuses.filter(s => s === 'green').length
  const overallStatus: 'green' | 'amber' | 'red' | null = !health
    ? null : greenCount === 4 ? 'green' : greenCount === 0 ? 'red' : 'amber'
  const dotColor = overallStatus ? DOT_COLORS[overallStatus] : '#D1D5DB'
  const hasConnected = greenCount > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => { if (!o) refreshHealth(); return !o }) }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-stone-50"
        style={{ background: 'white', border: '0.5px solid #EEEBE6', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: dotColor }} />
        <span className="text-[12px]" style={{ color: '#6B7280' }}>
          {health ? `${greenCount} of 4 connected` : '...'}
        </span>
      </button>

      {open && health && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl"
          style={{ width: 290, background: 'white', border: '0.5px solid #EEEBE6', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          <div className="px-4 pt-3.5 pb-1">
            <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Connections
            </div>
          </div>

          <div className="px-4 py-3 space-y-3.5">
            {INTEGRATIONS.map(({ key, label }) => {
              const item = health[key] as IntegrationStatus
              const isConnected = item.status === 'green'

              // Per-integration sync controls
              let syncBtn: React.ReactNode = null
              if (key === 'meta' && !isConnected) {
                syncBtn = (
                  <button
                    onClick={connectMeta}
                    className="text-[10px] font-semibold border-none bg-transparent cursor-pointer hover:underline p-0"
                    style={{ color: '#E9A020' }}
                  >
                    {item.actionText || 'Connect →'}
                  </button>
                )
              } else if (key === 'meta' && isConnected) {
                syncBtn = (
                  <button
                    onClick={syncMeta}
                    disabled={metaSync === 'syncing'}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border disabled:opacity-60 cursor-pointer"
                    style={{ borderColor: '#E9A020', color: metaSync === 'ok' ? '#6EBF8B' : metaSync === 'error' ? '#F97B6B' : '#E9A020', background: 'transparent' }}
                  >
                    {metaSync === 'syncing' ? <><Spinner /> Syncing...</>
                      : metaSync === 'ok' ? '✓ Synced'
                      : metaSync === 'error' ? 'Failed'
                      : '↻ Sync'}
                  </button>
                )
              } else if (key === 'mailerlite' && isConnected) {
                syncBtn = (
                  <button
                    onClick={syncMailerLite}
                    disabled={mlSync === 'syncing'}
                    className="text-[10px] font-semibold border-none bg-transparent cursor-pointer disabled:opacity-60 hover:underline p-0"
                    style={{ color: mlSync === 'ok' ? '#6EBF8B' : mlSync === 'error' ? '#F97B6B' : '#E9A020' }}
                  >
                    {mlSync === 'syncing' ? '↻ Syncing...'
                      : mlSync === 'ok' ? '✓ Synced'
                      : mlSync === 'error' ? 'Failed'
                      : '↻ Sync'}
                  </button>
                )
              } else if (key === 'kdp') {
                syncBtn = (
                  <Link
                    href="/dashboard?upload=1"
                    className="text-[10px] font-semibold no-underline hover:underline"
                    style={{ color: '#E9A020' }}
                    onClick={() => setOpen(false)}
                  >
                    Upload →
                  </Link>
                )
              }

              return (
                <div key={key} className="flex items-start gap-2.5">
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: DOT_COLORS[item.status], marginTop: 3 }}
                  />
                  <div className="flex-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>{label}</span>
                      {syncBtn}
                    </div>
                    <div className="text-[12px]" style={{ color: '#6B7280' }}>
                      {item.text}
                      {item.actionText && item.actionHref && key !== 'meta' && (
                        <>
                          {' · '}
                          <Link
                            href={item.actionHref}
                            className="font-semibold no-underline hover:underline"
                            style={{ color: '#E9A020' }}
                            onClick={() => setOpen(false)}
                          >
                            {item.actionText}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sync all footer */}
          {hasConnected && (
            <div className="px-4 py-2.5 border-t" style={{ borderColor: '#EEEBE6' }}>
              <button
                onClick={syncAll}
                disabled={allSync === 'syncing'}
                className="text-[11px] font-semibold border-none bg-transparent cursor-pointer disabled:opacity-60 hover:underline p-0"
                style={{ color: allSync === 'ok' ? '#6EBF8B' : allSync === 'error' ? '#F97B6B' : '#E9A020' }}
              >
                {allSync === 'syncing' ? '↻ Syncing all...'
                  : allSync === 'ok' ? '✓ All synced'
                  : allSync === 'error' ? 'Sync failed — try again'
                  : '↻ Sync all connected accounts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
