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
  const [calMonthOffset, setCalMonthOffset] = useState(0)

  useEffect(() => {
    setTodayStr(new Date().toISOString().split('T')[0])
  }, [])

  // ─── Plain calculations (no useMemo) ──────────────────────────────────
  const totalBooked = swaps.length
  const estReach = swaps.reduce((sum, s) => sum + (s.partnerListSize || 0), 0)
  const pendingSend = swaps.filter(s => s.direction === 'you_promote' && s.status !== 'complete').length
  const pendingReceive = swaps.filter(s => s.direction === 'they_promote' && s.status !== 'complete').length
  const fmtReach = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n)

  // ─── Upcoming swaps (string comparison) ───────────────────────────────
  const upcoming = todayStr
    ? swaps
        .filter(s => s.promoDate.split('T')[0] >= todayStr)
        .sort((a, b) => a.promoDate.localeCompare(b.promoDate))
    : []

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

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Total booked</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#1E2D3D', margin: '4px 0 0' }}>{totalBooked}</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Est. total reach</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#1E2D3D', margin: '4px 0 0' }}>{fmtReach(estReach)}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>&#9888; estimated</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Your promos to send</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: pendingSend > 0 ? '#D85A30' : '#1E2D3D', margin: '4px 0 0' }}>{pendingSend}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>pending</p>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Partner promos incoming</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: pendingReceive > 0 ? '#EF9F27' : '#1E2D3D', margin: '4px 0 0' }}>{pendingReceive}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>pending</p>
        </div>
      </div>

      {/* Empty state */}
      {swaps.length === 0 && !showModal && (
        <EmptyState onOpenModal={() => setShowModal(true)} />
      )}

      {/* Swap Calendar Heatmap */}
      {swaps.length > 0 && (() => {
        const now = new Date()
        const calDate = new Date(now.getFullYear(), now.getMonth() + calMonthOffset, 1)
        const year = calDate.getFullYear()
        const month = calDate.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const realTodayStr = now.toISOString().split('T')[0]
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
        const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        const swapsByDay: Record<string, number> = {}
        const booksByDay: Record<string, string[]> = {}
        swaps.forEach(s => {
          const day = s.promoDate.split('T')[0]
          if (day.startsWith(monthStr)) {
            swapsByDay[day] = (swapsByDay[day] || 0) + 1
            if (!booksByDay[day]) booksByDay[day] = []
            if (!booksByDay[day].includes(s.bookTitle)) booksByDay[day].push(s.bookTitle)
          }
        })

        function densityColor(count: number): string {
          if (count === 0) return 'var(--color-bg-empty, #f3f4f6)'
          if (count <= 2) return '#C0DD97'
          if (count <= 5) return '#97C459'
          if (count <= 9) return '#EF9F27'
          if (count <= 14) return '#E8692A'
          return '#C23B1E'
        }
        function densityText(count: number): string {
          if (count === 0) return '#9ca3af'
          if (count <= 5) return '#27500A'
          return '#ffffff'
        }

        const dotColors = ['#F97B6B', '#F4A261', '#8B5CF6']
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        return (
          <div style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            {/* Title + nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button
                onClick={() => setCalMonthOffset(p => p - 1)}
                style={{ fontSize: 22, fontWeight: 600, padding: '8px 16px', border: '0.5px solid rgba(30,45,61,0.15)', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#1E2D3D', lineHeight: 1 }}
              >
                &#8249;
              </button>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E2D3D', margin: 0 }}>Swap Calendar &mdash; {monthLabel}</p>
              <button
                onClick={() => setCalMonthOffset(p => p + 1)}
                style={{ fontSize: 22, fontWeight: 600, padding: '8px 16px', border: '0.5px solid rgba(30,45,61,0.15)', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#1E2D3D', lineHeight: 1 }}
              >
                &#8250;
              </button>
            </div>

            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, paddingBottom: 4 }}>
              {dayLabels.map(d => (
                <div key={d} style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {/* Empty cells before day 1 */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e-${i}`} style={{ aspectRatio: '1', background: 'transparent' }} />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayStr = `${monthStr}-${String(dayNum).padStart(2, '0')}`
                const count = swapsByDay[dayStr] || 0
                const isToday = dayStr === realTodayStr
                const books = booksByDay[dayStr] || []
                return (
                  <div
                    key={dayStr}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'default',
                      background: densityColor(count),
                      outline: isToday ? '2px solid #1E2D3D' : 'none',
                      outlineOffset: isToday ? 1 : 0,
                      position: 'relative' as const,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Ghost watermark day number */}
                    <span style={{ position: 'absolute' as const, bottom: 4, right: 6, fontSize: 28, fontWeight: 700, opacity: 0.15, color: 'inherit', lineHeight: 1, pointerEvents: 'none' as const }}>{dayNum}</span>
                    {count > 0 && (
                      <span style={{ fontSize: 14, color: densityText(count), lineHeight: 1, position: 'relative' as const, zIndex: 1 }}>{count}</span>
                    )}
                    {books.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 2, position: 'relative' as const, zIndex: 1 }}>
                        {books.slice(0, 3).map((_, bi) => (
                          <div key={bi} style={{ width: 4, height: 4, borderRadius: '50%', background: dotColors[bi % dotColors.length] }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { color: '#f3f4f6', label: 'No swaps' },
                { color: '#C0DD97', label: '1-2' },
                { color: '#97C459', label: '3-5' },
                { color: '#EF9F27', label: '6-9' },
                { color: '#E8692A', label: '10-14' },
                { color: '#C23B1E', label: '15+' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: item.color }} />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Upcoming swaps */}
      {swaps.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1E2D3D', marginBottom: '1rem' }}>Your Upcoming Swaps</p>

          {upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No upcoming swaps — all caught up!</p>
          ) : (
            <div style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)', borderRadius: 12, padding: '0.75rem 1.25rem' }}>
              {upcoming.map((s, i) => {
                const isYou = s.direction === 'you_promote'
                const initials = s.partnerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                const dateLabel = new Date(s.promoDate.split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: i < upcoming.length - 1 ? '0.5px solid rgba(30,45,61,0.07)' : 'none',
                    }}
                  >
                    {/* Colored dot */}
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: isYou ? '#D85A30' : '#EF9F27', flexShrink: 0 }} />

                    {/* Initials avatar */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        flexShrink: 0,
                        background: isYou ? '#E1F5EE' : '#E6F1FB',
                        color: isYou ? '#0F6E56' : '#185FA5',
                      }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1E2D3D' }}>{s.partnerName}</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '3px 9px',
                            borderRadius: 20,
                            background: isYou ? '#FAECE7' : '#FAEEDA',
                            color: isYou ? '#993C1D' : '#854F0B',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          {isYou ? '↑ You Promote' : '↓ They Promote'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                        {isYou
                          ? s.bookTitle + (s.promoFormat ? ' · ' + s.promoFormat : '')
                          : s.bookTitle + ' · awaiting promotion'}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{dateLabel}</p>
                    </div>

                    {/* Mark complete */}
                    {isYou && s.status !== 'complete' && (
                      <button
                        onClick={() => handleMarkComplete(s.id)}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '3px 9px',
                          borderRadius: 20,
                          background: 'rgba(110,191,139,0.15)',
                          color: '#6EBF8B',
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LogSwapModal onClose={() => setShowModal(false)} onCreated={handleSwapCreated} />
      )}
    </div>
  )
}
