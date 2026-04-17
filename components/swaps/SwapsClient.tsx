'use client'

import { useState, useEffect } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SwapRecord {
  id: string
  partnerName: string
  partnerEmail: string | null
  partnerListSize: number | null
  bookTitle: string
  promoFormat: string | null
  promoDate: string
  direction: string
  status: string
  source: string | null
  launchWindow: string | null
  mailerLiteListId: string | null
  createdAt: string
  updatedAt: string
}

interface MLListOption {
  id: string
  name: string
  activeCount: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatK(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const AVATAR_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

function avatarColor(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ label, value, badge }: { label: string; value: string | number; badge?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'white', border: '0.5px solid #E5E7EB' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="font-semibold" style={{ color: '#1E2D3D', fontSize: 28, lineHeight: 1.2 }}>{value}</p>
        {badge && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(233,160,32,0.15)', color: '#E9A020' }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Log Swap Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  partnerName: '',
  partnerEmail: '',
  partnerListSize: '',
  bookTitle: '',
  promoFormat: '',
  promoDate: '',
  direction: 'you_promote',
  source: 'bookclicker',
  launchWindow: '',
  mailerLiteListId: '',
}

function LogSwapModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (swap: SwapRecord) => void
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mlLists, setMlLists] = useState<MLListOption[]>([])

  useEffect(() => {
    fetch('/api/mailerlite/lists/saved')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const ls: MLListOption[] = d.lists ?? []
        setMlLists(ls)
        if (ls.length === 1) {
          setForm(prev => ({ ...prev, mailerLiteListId: ls[0].id }))
        }
      })
      .catch(() => {})
  }, [])

  const f = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partnerName.trim() || !form.bookTitle.trim() || !form.promoDate) {
      setError('Partner name, book title, and promo date are required.')
      return
    }
    setError('')
    setSaving(true)

    const res = await fetch('/api/swaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        partnerListSize: form.partnerListSize ? Number(form.partnerListSize) : null,
        partnerEmail: form.partnerEmail || null,
        promoFormat: form.promoFormat || null,
        launchWindow: form.launchWindow || null,
        mailerLiteListId: form.mailerLiteListId || null,
      }),
    })
    const data = await res.json()

    if (data.success) {
      onCreated(data.swap)
    } else {
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  const inputCls = 'w-full text-sm px-3 py-2 rounded-lg outline-none'
  const inputSty = { border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }
  const lblSty = { color: '#6B7280' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'white', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}
        >
          <p className="font-semibold text-base" style={{ color: '#1E2D3D' }}>Log a Swap</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Partner name *</label>
              <input value={form.partnerName} onChange={e => f('partnerName', e.target.value)} placeholder="Author or publisher name" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Partner email</label>
              <input value={form.partnerEmail} onChange={e => f('partnerEmail', e.target.value)} placeholder="partner@email.com" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Their list size</label>
              <input type="number" value={form.partnerListSize} onChange={e => f('partnerListSize', e.target.value)} placeholder="e.g. 8500" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Their book title *</label>
              <input value={form.bookTitle} onChange={e => f('bookTitle', e.target.value)} placeholder="Book title" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Promo format</label>
              <input value={form.promoFormat} onChange={e => f('promoFormat', e.target.value)} placeholder="e.g. newsletter feature" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Promo date *</label>
              <input type="date" value={form.promoDate} onChange={e => f('promoDate', e.target.value)} className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Direction</label>
              <select value={form.direction} onChange={e => f('direction', e.target.value)} className={inputCls} style={inputSty}>
                <option value="you_promote">I promote their book</option>
                <option value="they_promote">They promote my book</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Source</label>
              <select value={form.source} onChange={e => f('source', e.target.value)} className={inputCls} style={inputSty}>
                <option value="bookclicker">BookClicker</option>
                <option value="bookfunnel">BookFunnel</option>
                <option value="direct">Direct</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={lblSty}>Launch window label</label>
              <input value={form.launchWindow} onChange={e => f('launchWindow', e.target.value)} placeholder='e.g. "Crush Season"' className={inputCls} style={inputSty} />
            </div>
            {mlLists.length >= 2 && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={lblSty}>Which list are you promoting from?</label>
                <select value={form.mailerLiteListId} onChange={e => f('mailerLiteListId', e.target.value)} className={inputCls} style={inputSty}>
                  <option value="">— select list —</option>
                  {mlLists.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.activeCount.toLocaleString()} active)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm" style={{ color: '#F97B6B' }}>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}
            >
              {saving ? 'Saving...' : 'Log Swap'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-lg"
              style={{ border: '1px solid #E5E7EB', color: '#6B7280', background: 'transparent', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="rounded-xl p-12 flex flex-col items-center justify-center" style={{ border: '2px dashed #D1D5DB' }}>
      <p className="text-base font-semibold mb-2" style={{ color: '#1E2D3D' }}>No swaps logged yet</p>
      <button
        onClick={onOpenModal}
        className="text-sm font-semibold"
        style={{ color: '#E9A020', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Log your first swap &rarr;
      </button>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SwapsClient({ swaps: initialSwaps }: { swaps: SwapRecord[] }) {
  const [swaps, setSwaps] = useState<SwapRecord[]>(initialSwaps)
  const [showModal, setShowModal] = useState(false)
  const [todayStr, setTodayStr] = useState('')

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0])
  }, [])

  // ─── Plain calculations (no useMemo) ──────────────────────────────────
  const totalBooked = swaps.length
  const estReach = swaps.reduce((sum, s) => sum + (s.partnerListSize || 0), 0)
  const youPromotePending = swaps.filter(s => s.direction === 'you_promote' && s.status !== 'complete').length
  const theyPromotePending = swaps.filter(s => s.direction === 'they_promote' && s.status !== 'complete').length

  // ─── Upcoming swaps (string comparison) ───────────────────────────────
  const upcoming = todayStr
    ? swaps
        .filter(s => s.promoDate.split('T')[0] >= todayStr && s.status !== 'complete')
        .sort((a, b) => a.promoDate.localeCompare(b.promoDate))
    : []

  // Group upcoming by date
  const grouped: Array<[string, SwapRecord[]]> = []
  for (const s of upcoming) {
    const dateKey = s.promoDate.split('T')[0]
    const last = grouped[grouped.length - 1]
    if (last && last[0] === dateKey) {
      last[1].push(s)
    } else {
      grouped.push([dateKey, [s]])
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────
  async function handleMarkComplete(id: string) {
    const res = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'complete' }),
    })
    const data = await res.json()
    if (data.success) {
      setSwaps(prev => prev.map(s => (s.id === id ? data.swap : s)))
    }
  }

  function handleSwapCreated(swap: SwapRecord) {
    setSwaps(prev =>
      [...prev, swap].sort((a, b) => a.promoDate.localeCompare(b.promoDate))
    )
    setShowModal(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Swaps &amp; Promos</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Track newsletter swaps, partner promos, and your promo calendar.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-semibold px-4 py-2 rounded-lg flex-shrink-0"
          style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}
        >
          + Log swap
        </button>
      </div>

      {/* Empty state */}
      {swaps.length === 0 && !showModal && (
        <EmptyState onOpenModal={() => setShowModal(true)} />
      )}

      {/* Metrics + upcoming */}
      {swaps.length > 0 && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total booked" value={totalBooked} />
            <MetricCard label="Est. total reach" value={formatK(estReach)} badge="⚠ estimated" />
            <MetricCard label="Your promos to send" value={youPromotePending} badge="pending" />
            <MetricCard label="Partner promos incoming" value={theyPromotePending} badge="pending" />
          </div>

          {/* Upcoming Swaps List */}
          <div className="rounded-xl p-5" style={{ background: 'white', border: '0.5px solid #E5E7EB' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>Your Upcoming Swaps</h3>

            {grouped.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: '#9CA3AF' }}>No upcoming swaps scheduled.</p>
            ) : (
              <div className="space-y-5">
                {grouped.map(([dateKey, entries]) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
                      {formatDateLabel(dateKey + 'T12:00:00Z')}
                    </p>
                    <div className="space-y-2">
                      {entries.map(s => {
                        const isYouPromote = s.direction === 'you_promote'
                        const dotColor = isYouPromote ? '#F97B6B' : '#E9A020'

                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                            style={{ background: '#FAFAFA' }}
                          >
                            {/* Status dot */}
                            <div
                              className="flex-shrink-0 rounded-full"
                              style={{ width: 8, height: 8, background: dotColor }}
                            />

                            {/* Avatar */}
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: avatarColor(s.partnerName), color: 'white' }}
                            >
                              {getInitials(s.partnerName)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium truncate" style={{ color: '#1E2D3D' }}>
                                  {s.partnerName}
                                </span>
                                {isYouPromote ? (
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: '#FAECE7', color: '#993C1D' }}
                                  >
                                    ↑ You Promote
                                  </span>
                                ) : (
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: '#FAEEDA', color: '#854F0B' }}
                                  >
                                    ↓ They Promote
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                                {isYouPromote
                                  ? `${s.bookTitle}${s.promoFormat ? ` · ${s.promoFormat}` : ''}`
                                  : `${s.bookTitle} · awaiting promotion`}
                              </p>
                            </div>

                            {/* Mark complete */}
                            {isYouPromote && s.status !== 'complete' && (
                              <button
                                onClick={() => handleMarkComplete(s.id)}
                                className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                                style={{
                                  background: 'rgba(110,191,139,0.15)',
                                  color: '#6EBF8B',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Mark complete
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <LogSwapModal onClose={() => setShowModal(false)} onCreated={handleSwapCreated} />
      )}
    </div>
  )
}
