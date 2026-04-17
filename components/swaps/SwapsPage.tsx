'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SwapRecord {
  id: string
  partnerName: string
  partnerEmail: string | null
  partnerListSize: number | null
  bookTitle: string
  promoFormat: string | null
  promoDate: string // ISO
  direction: string // "you_promote" | "they_promote"
  status: string // "booked" | "confirmed" | "complete"
  source: string | null
  launchWindow: string | null
  createdAt: string
  updatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BOOK_COLORS: Record<string, string> = {
  B1: '#F97B6B',
  B2: '#F4A261',
  B3: '#8B5CF6',
  B4: '#5BBFB5',
}

const DENSITY_COLORS = [
  { min: 0,  max: 0,  color: '#F5F0E8' },
  { min: 1,  max: 2,  color: '#C0DD97' },
  { min: 3,  max: 5,  color: '#97C459' },
  { min: 6,  max: 9,  color: '#EF9F27' },
  { min: 10, max: 14, color: '#E8692A' },
  { min: 15, max: 999, color: '#C23B1E' },
]

function getDensityColor(count: number): string {
  for (const d of DENSITY_COLORS) {
    if (count >= d.min && count <= d.max) return d.color
  }
  return '#F5F0E8'
}

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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  badge,
}: {
  label: string
  value: string | number
  badge?: string
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'white', border: '0.5px solid #E5E7EB' }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p
          className="font-semibold"
          style={{ color: '#1E2D3D', fontSize: 28, lineHeight: 1.2 }}
        >
          {value}
        </p>
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

// ─── Reach Bars ──────────────────────────────────────────────────────────────

function ReachBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: '#6B7280' }}>{label}</span>
        <span className="font-semibold" style={{ color: '#1E2D3D' }}>
          {formatK(value)}
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ background: '#F3F4F6' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Heatmap Calendar ────────────────────────────────────────────────────────

function HeatmapCalendar({ swaps }: { swaps: SwapRecord[] }) {
  const [monthOffset, setMonthOffset] = useState(0)

  const { year, month, days, dayNames } = useMemo(() => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const yr = d.getFullYear()
    const mo = d.getMonth()
    const firstDay = new Date(yr, mo, 1).getDay() // 0=Sun
    const daysInMonth = new Date(yr, mo + 1, 0).getDate()

    const cells: Array<{ day: number | null; date: Date | null }> = []
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, date: null })
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, date: new Date(yr, mo, d) })
    }

    return {
      year: yr,
      month: mo,
      days: cells,
      dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    }
  }, [monthOffset])

  const swapsByDate = useMemo(() => {
    const map = new Map<string, SwapRecord[]>()
    swaps.forEach(s => {
      const d = new Date(s.promoDate)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map.set(key, [...(map.get(key) ?? []), s])
    })
    return map
  }, [swaps])

  const today = new Date()
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'white', border: '0.5px solid #E5E7EB' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>
          Promo Heatmap
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="px-2 py-1 text-xs rounded"
            style={{
              border: '1px solid #E5E7EB',
              background: 'white',
              color: '#6B7280',
              cursor: 'pointer',
            }}
          >
            &larr;
          </button>
          <span
            className="text-sm font-medium min-w-[130px] text-center"
            style={{ color: '#1E2D3D' }}
          >
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset(o => o + 1)}
            className="px-2 py-1 text-xs rounded"
            style={{
              border: '1px solid #E5E7EB',
              background: 'white',
              color: '#6B7280',
              cursor: 'pointer',
            }}
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div
            key={d}
            className="text-[10px] font-semibold text-center py-1"
            style={{ color: '#9CA3AF' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, i) => {
          if (!cell.day || !cell.date) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }

          const key = `${year}-${month}-${cell.day}`
          const daySwaps = swapsByDate.get(key) ?? []
          const count = daySwaps.length
          const isToday = isSameDay(cell.date, today)

          // Get unique book "slots" for colored dots
          const bookKeys = Array.from(
            new Set(daySwaps.map(s => s.bookTitle))
          ).slice(0, 4)

          return (
            <div
              key={key}
              className="aspect-square rounded-md flex flex-col items-center justify-center relative"
              style={{
                background: getDensityColor(count),
                outline: isToday ? '2px solid #1E2D3D' : undefined,
                outlineOffset: isToday ? '-1px' : undefined,
              }}
              title={
                count > 0
                  ? `${count} swap${count !== 1 ? 's' : ''} on ${cell.day}`
                  : undefined
              }
            >
              {count > 0 && (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: count >= 6 ? 'white' : '#1E2D3D' }}
                >
                  {count}
                </span>
              )}
              {bookKeys.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {bookKeys.map((bk, j) => {
                    const colorKey = `B${j + 1}`
                    return (
                      <div
                        key={bk}
                        className="rounded-full"
                        style={{
                          width: 4,
                          height: 4,
                          background: BOOK_COLORS[colorKey] ?? '#6B7280',
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
            Less
          </span>
          {DENSITY_COLORS.map((d, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ width: 12, height: 12, background: d.color }}
            />
          ))}
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
            More
          </span>
        </div>
        <div className="flex items-center gap-3">
          {Object.entries(BOOK_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className="rounded-full"
                style={{ width: 6, height: 6, background: color }}
              />
              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                {key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Upcoming Swaps List ─────────────────────────────────────────────────────

function UpcomingSwapsList({
  swaps,
  onMarkComplete,
}: {
  swaps: SwapRecord[]
  onMarkComplete: (id: string) => void
}) {
  const upcoming = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return swaps
      .filter(s => new Date(s.promoDate) >= now && s.status !== 'complete')
      .sort(
        (a, b) =>
          new Date(a.promoDate).getTime() - new Date(b.promoDate).getTime()
      )
  }, [swaps])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, SwapRecord[]>()
    upcoming.forEach(s => {
      const dateKey = s.promoDate.split('T')[0]
      map.set(dateKey, [...(map.get(dateKey) ?? []), s])
    })
    return Array.from(map.entries())
  }, [upcoming])

  const avatarColors = [
    '#F97B6B',
    '#F4A261',
    '#8B5CF6',
    '#5BBFB5',
    '#60A5FA',
    '#F472B6',
  ]

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'white', border: '0.5px solid #E5E7EB' }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#1E2D3D' }}
      >
        Your Upcoming Swaps
      </h3>

      {grouped.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: '#9CA3AF' }}>
          No upcoming swaps scheduled.
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, entries]) => (
            <div key={dateKey}>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: '#9CA3AF' }}
              >
                {formatDateLabel(dateKey + 'T12:00:00Z')}
              </p>
              <div className="space-y-2">
                {entries.map((s, idx) => {
                  const isYouPromote = s.direction === 'you_promote'
                  const dotColor = isYouPromote ? '#F97B6B' : '#E9A020'
                  const avatarBg =
                    avatarColors[
                      s.partnerName
                        .split('')
                        .reduce((a, c) => a + c.charCodeAt(0), 0) %
                        avatarColors.length
                    ]

                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                      style={{ background: '#FAFAFA' }}
                    >
                      {/* Status dot */}
                      <div
                        className="flex-shrink-0 rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: dotColor,
                        }}
                      />

                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: avatarBg, color: 'white' }}
                      >
                        {getInitials(s.partnerName)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] font-medium truncate"
                            style={{ color: '#1E2D3D' }}
                          >
                            {s.partnerName}
                          </span>
                          {isYouPromote ? (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: '#FAECE7',
                                color: '#993C1D',
                              }}
                            >
                              ↑ You Promote
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: '#FAEEDA',
                                color: '#854F0B',
                              }}
                            >
                              ↓ They Promote
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: '#9CA3AF' }}
                        >
                          {isYouPromote
                            ? `${s.bookTitle}${s.promoFormat ? ` · ${s.promoFormat}` : ''}`
                            : `${s.bookTitle} · awaiting promotion`}
                        </p>
                      </div>

                      {/* Mark complete button */}
                      {isYouPromote && s.status !== 'complete' && (
                        <button
                          onClick={() => onMarkComplete(s.id)}
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
  )
}

// ─── Log Swap Modal ──────────────────────────────────────────────────────────

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

  const f = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

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
        partnerListSize: form.partnerListSize
          ? Number(form.partnerListSize)
          : null,
        partnerEmail: form.partnerEmail || null,
        promoFormat: form.promoFormat || null,
        launchWindow: form.launchWindow || null,
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
  const inputSty = {
    border: '1.5px solid #D1D5DB',
    color: '#1E2D3D',
    background: 'white',
  }
  const lblSty = { color: '#6B7280' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'white',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: '1px solid #F3F4F6',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 1,
          }}
        >
          <p className="font-semibold text-base" style={{ color: '#1E2D3D' }}>
            Log a Swap
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Partner name *
              </label>
              <input
                value={form.partnerName}
                onChange={e => f('partnerName', e.target.value)}
                placeholder="Author or publisher name"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Partner email
              </label>
              <input
                value={form.partnerEmail}
                onChange={e => f('partnerEmail', e.target.value)}
                placeholder="partner@email.com"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Their list size
              </label>
              <input
                type="number"
                value={form.partnerListSize}
                onChange={e => f('partnerListSize', e.target.value)}
                placeholder="e.g. 8500"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Their book title *
              </label>
              <input
                value={form.bookTitle}
                onChange={e => f('bookTitle', e.target.value)}
                placeholder="Book title"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Promo format
              </label>
              <input
                value={form.promoFormat}
                onChange={e => f('promoFormat', e.target.value)}
                placeholder="e.g. newsletter feature"
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Promo date *
              </label>
              <input
                type="date"
                value={form.promoDate}
                onChange={e => f('promoDate', e.target.value)}
                className={inputCls}
                style={inputSty}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Direction
              </label>
              <select
                value={form.direction}
                onChange={e => f('direction', e.target.value)}
                className={inputCls}
                style={inputSty}
              >
                <option value="you_promote">I promote their book</option>
                <option value="they_promote">They promote my book</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Source
              </label>
              <select
                value={form.source}
                onChange={e => f('source', e.target.value)}
                className={inputCls}
                style={inputSty}
              >
                <option value="bookclicker">BookClicker</option>
                <option value="bookfunnel">BookFunnel</option>
                <option value="direct">Direct</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label
                className="block text-xs font-medium mb-1"
                style={lblSty}
              >
                Launch window label
              </label>
              <input
                value={form.launchWindow}
                onChange={e => f('launchWindow', e.target.value)}
                placeholder='e.g. "Crush Season"'
                className={inputCls}
                style={inputSty}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#F97B6B' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                background: '#E9A020',
                color: '#1E2D3D',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Log Swap'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-lg"
              style={{
                border: '1px solid #E5E7EB',
                color: '#6B7280',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div
      className="rounded-xl p-12 flex flex-col items-center justify-center"
      style={{ border: '2px dashed #D1D5DB' }}
    >
      <p
        className="text-base font-semibold mb-2"
        style={{ color: '#1E2D3D' }}
      >
        No swaps logged yet
      </p>
      <button
        onClick={onOpenModal}
        className="text-sm font-semibold"
        style={{
          color: '#E9A020',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Log your first swap &rarr;
      </button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SwapsPage({
  initialSwaps,
}: {
  initialSwaps: SwapRecord[]
}) {
  const router = useRouter()
  const [swaps, setSwaps] = useState<SwapRecord[]>(initialSwaps)
  const [showModal, setShowModal] = useState(false)

  // ─── Metrics ───────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalBooked = swaps.length
    const estReach = swaps.reduce(
      (sum, s) => sum + (s.partnerListSize ?? 0),
      0
    )
    const youPromotePending = swaps.filter(
      s => s.direction === 'you_promote' && s.status !== 'complete'
    ).length
    const theyPromotePending = swaps.filter(
      s => s.direction === 'they_promote' && s.status !== 'complete'
    ).length
    return { totalBooked, estReach, youPromotePending, theyPromotePending }
  }, [swaps])

  // ─── Reach bar data ────────────────────────────────────────────────────
  const reachData = useMemo(() => {
    const confirmedReach = swaps
      .filter(
        s => s.status === 'confirmed' || s.status === 'complete'
      )
      .reduce((sum, s) => sum + (s.partnerListSize ?? 0), 0)
    const bookedReach = swaps
      .filter(s => s.status === 'booked')
      .reduce((sum, s) => sum + (s.partnerListSize ?? 0), 0)
    const totalReach = confirmedReach + bookedReach
    return { confirmedReach, bookedReach, totalReach }
  }, [swaps])

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleMarkComplete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/swaps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete' }),
      })
      const data = await res.json()
      if (data.success) {
        setSwaps(prev =>
          prev.map(s => (s.id === id ? data.swap : s))
        )
      }
    },
    []
  )

  const handleSwapCreated = useCallback((swap: SwapRecord) => {
    setSwaps(prev =>
      [...prev, swap].sort(
        (a, b) =>
          new Date(a.promoDate).getTime() -
          new Date(b.promoDate).getTime()
      )
    )
    setShowModal(false)
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────

  if (swaps.length === 0 && !showModal) {
    return (
      <div
        className="px-4 py-6 max-w-6xl mx-auto"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: '#1E2D3D' }}
            >
              Swaps & Promos
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Track newsletter swaps, partner promos, and your promo calendar.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{
              background: '#E9A020',
              color: '#1E2D3D',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Log swap
          </button>
        </div>
        <EmptyState onOpenModal={() => setShowModal(true)} />
        {showModal && (
          <LogSwapModal
            onClose={() => setShowModal(false)}
            onCreated={handleSwapCreated}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className="px-4 py-6 max-w-6xl mx-auto"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>
            Swaps & Promos
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Track newsletter swaps, partner promos, and your promo calendar.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm font-semibold px-4 py-2 rounded-lg flex-shrink-0"
          style={{
            background: '#E9A020',
            color: '#1E2D3D',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Log swap
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total booked" value={metrics.totalBooked} />
        <MetricCard
          label="Est. total reach"
          value={formatK(metrics.estReach)}
          badge="⚠ estimated"
        />
        <MetricCard
          label="Your promos to send"
          value={metrics.youPromotePending}
          badge="pending"
        />
        <MetricCard
          label="Partner promos incoming"
          value={metrics.theyPromotePending}
          badge="pending"
        />
      </div>

      {/* Reach Bars */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: 'white', border: '0.5px solid #E5E7EB' }}
      >
        <ReachBar
          label="Confirmed promos going out"
          value={reachData.confirmedReach}
          total={reachData.totalReach}
          color="#6EBF8B"
        />
        <ReachBar
          label="Still to confirm"
          value={reachData.bookedReach}
          total={reachData.totalReach}
          color="#E9A020"
        />
      </div>

      {/* Two-column: Heatmap + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <HeatmapCalendar swaps={swaps} />
        <UpcomingSwapsList
          swaps={swaps}
          onMarkComplete={handleMarkComplete}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <LogSwapModal
          onClose={() => setShowModal(false)}
          onCreated={handleSwapCreated}
        />
      )}
    </div>
  )
}
