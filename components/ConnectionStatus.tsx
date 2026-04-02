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

const CACHE_KEY = 'authordash_connection_health'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

export function ConnectionStatus() {
  const [health, setHealth] = useState<ConnectionHealth | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cached = getCached()
    if (cached) {
      setHealth(cached)
      return
    }
    fetch('/api/health/connections')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setHealth(data); setCache(data) })
      .catch(() => {/* silently fail — button stays in loading state */})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const statuses = health
    ? INTEGRATIONS.map(i => (health[i.key] as IntegrationStatus).status)
    : []
  const greenCount = statuses.filter(s => s === 'green').length
  const overallStatus: 'green' | 'amber' | 'red' | null = !health
    ? null
    : greenCount === 4
    ? 'green'
    : greenCount === 0
    ? 'red'
    : 'amber'
  const dotColor = overallStatus ? DOT_COLORS[overallStatus] : '#D1D5DB'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-stone-50"
        style={{
          background: 'white',
          border: '0.5px solid #EEEBE6',
          cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 8, height: 8, background: dotColor }}
        />
        <span className="text-[12px]" style={{ color: '#6B7280' }}>
          {health ? `${greenCount} of 4 connected` : '...'}
        </span>
      </button>

      {open && health && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl"
          style={{
            width: 280,
            background: 'white',
            border: '0.5px solid #EEEBE6',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          <div className="px-4 pt-3.5 pb-1">
            <div
              className="text-[13px] font-semibold"
              style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Connections
            </div>
          </div>
          <div className="px-4 py-3 space-y-3.5">
            {INTEGRATIONS.map(({ key, label }) => {
              const item = health[key] as IntegrationStatus
              return (
                <div key={key} className="flex items-start gap-2.5">
                  <span
                    className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: DOT_COLORS[item.status], marginTop: 3 }}
                  />
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <div className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>
                      {label}
                    </div>
                    <div className="text-[12px]" style={{ color: '#6B7280' }}>
                      {item.text}
                      {item.actionText && item.actionHref && (
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
        </div>
      )}
    </div>
  )
}
