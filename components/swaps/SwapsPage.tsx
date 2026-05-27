'use client'

import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  createdAt: string
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function promoDateStr(iso: string) {
  return iso.split('T')[0]
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function fmtMonthHeader(monthKey: string): string {
  const d = new Date(monthKey + '-15T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtDate(iso: string): string {
  const d = new Date(promoDateStr(iso) + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtListSize(n: number | null): string {
  if (!n) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K subs` : `${n} subs`
}

function fmtReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtDateGroupHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function bookColor(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('billionaire') || t.includes('protector')) return '#F97B6B'
  if (t.includes('roommate')) return '#F4A261'
  if (t.includes('secret baby') || t.includes(' ex')) return '#8B5CF6'
  return '#1E2D3D'
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    booked:    { bg: '#FEF3C7', color: '#92400E', label: 'Booked' },
    confirmed: { bg: '#D1FAE5', color: '#065F46', label: 'Confirmed' },
    sent:      { bg: '#1E2D3D', color: '#fff',    label: 'Sent ✓' },
    complete:  { bg: '#D1FAE5', color: '#065F46', label: 'Complete ✓' },
    cancelled: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  }
  const s = map[status] ?? map.booked
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ─── Direction Badge ──────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: string }) {
  const isYou = direction === 'you_promote'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: isYou ? '#FAECE7' : '#FAEEDA',
      color: isYou ? '#993C1D' : '#854F0B',
      whiteSpace: 'nowrap',
    }}>
      {isYou ? 'YOU SEND' : 'THEY SEND'}
    </span>
  )
}

// ─── Metrics Row ──────────────────────────────────────────────────────────────

function MetricsRow({ swaps }: { swaps: SwapRecord[] }) {
  const totalReach = swaps.reduce((sum, s) => sum + (s.partnerListSize ?? 0), 0)
  const sendsPending = swaps.filter(s =>
    s.direction === 'you_promote' && !['sent', 'complete', 'cancelled'].includes(s.status)
  ).length
  const incomingPromos = swaps.filter(s =>
    s.direction === 'they_promote' && !['complete', 'cancelled'].includes(s.status)
  ).length

  const metrics: Array<{ label: string; value: string; estimated?: boolean }> = [
    { label: 'Total Swaps',       value: String(swaps.length) },
    { label: 'Est. Total Reach',  value: fmtReach(totalReach), estimated: true },
    { label: 'Your Sends Pending', value: String(sendsPending) },
    { label: 'Incoming Promos',   value: String(incomingPromos) },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: 'white', borderRadius: 16, border: '1px solid rgba(30,45,61,0.08)',
      marginBottom: 24, padding: '0 4px',
    }}>
      {metrics.map((m, i) => (
        <div key={m.label} style={{
          padding: '18px 16px',
          borderRight: i < 3 ? '1px solid rgba(30,45,61,0.06)' : 'none',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
          }}>
            {m.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#1E2D3D', lineHeight: 1 }}>
              {m.value}
            </span>
            {m.estimated && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: '#FEF3C7', color: '#92400E',
              }}>
                ⚠ estimated
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap Calendar ────────────────────────────────────────────────────────

function HeatmapCalendar({ swaps, today, onDayClick }: {
  swaps: SwapRecord[]
  today: string
  onDayClick: (dateStr: string) => void
}) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build dateStr → swaps map
  const dateMap: Record<string, SwapRecord[]> = {}
  for (const s of swaps) {
    const d = promoDateStr(s.promoDate)
    if (!dateMap[d]) dateMap[d] = []
    dateMap[d].push(s)
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  function cellBg(count: number): string {
    if (count === 0)  return '#F5F0EB'
    if (count <= 2)   return '#C0DD97'
    if (count <= 5)   return '#97C459'
    if (count <= 9)   return '#EF9F27'
    if (count <= 14)  return '#E8692A'
    return '#C23B1E'
  }

  const monthLabel = new Date(year, month, 15).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '20px 20px 16px',
      marginBottom: 24, border: '1px solid rgba(30,45,61,0.08)',
    }}>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D' }}>{monthLabel}</span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 9, fontWeight: 700,
            color: '#9CA3AF', letterSpacing: '0.04em', paddingBottom: 4,
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />
          const daySwaps = dateMap[dateStr] ?? []
          const count    = daySwaps.length
          const isToday  = dateStr === today
          const dayNum   = new Date(dateStr + 'T12:00:00').getDate()

          return (
            <div
              key={dateStr}
              onClick={() => count > 0 && onDayClick(dateStr)}
              style={{
                aspectRatio: '1',
                background: cellBg(count),
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: count > 0 ? 'pointer' : 'default',
                outline: isToday ? '2px solid #1E2D3D' : 'none',
                outlineOffset: '-2px',
                padding: 2,
                gap: 1,
              }}
            >
              <div style={{
                fontSize: 11, lineHeight: 1,
                fontWeight: count > 0 ? 700 : 400,
                color: count > 0 ? '#1E2D3D' : '#9CA3AF',
              }}>
                {dayNum}
              </div>
              {count > 0 && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#1E2D3D', lineHeight: 1 }}>
                    {count}
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {daySwaps.slice(0, 4).map((s, j) => (
                      <div key={j} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: bookColor(s.bookTitle), flexShrink: 0,
                      }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legends */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>Volume:</span>
          {[
            { bg: '#F5F0EB', label: '0' },
            { bg: '#C0DD97', label: '1–2' },
            { bg: '#97C459', label: '3–5' },
            { bg: '#EF9F27', label: '6–9' },
            { bg: '#E8692A', label: '10–14' },
            { bg: '#C23B1E', label: '15+' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.bg, border: '1px solid rgba(0,0,0,0.06)' }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>Books:</span>
          {[
            { color: '#F97B6B', label: 'Billionaire / Protector' },
            { color: '#F4A261', label: 'Roommate' },
            { color: '#8B5CF6', label: 'Secret Baby / Ex' },
            { color: '#1E2D3D', label: 'Other' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Swap Card ────────────────────────────────────────────────────────────────

function SwapCard({ swap, onStatusChange }: {
  swap: SwapRecord
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const isYou  = swap.direction === 'you_promote'
  const isThey = swap.direction === 'they_promote'
  const dotColor = isYou ? '#F97B6B' : '#E9A020'

  async function patch(status: string) {
    setLoading(true)
    await onStatusChange(swap.id, status)
    setLoading(false)
    setExpanded(false)
  }

  const showMarkSent    = isYou  && !['sent', 'complete', 'cancelled'].includes(swap.status)
  const showDidTheySend = isThey && (swap.status === 'booked' || swap.status === 'confirmed')

  return (
    <div style={{
      background: 'white', border: '1px solid rgba(30,45,61,0.08)',
      borderRadius: 10, padding: 14, marginBottom: 8,
      opacity: swap.status === 'cancelled' ? 0.55 : 1,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Left dot */}
        <div style={{ paddingTop: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <DirectionBadge direction={swap.direction} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1E2D3D' }}>{swap.partnerName}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E2D3D', marginBottom: 3 }}>
            {swap.bookTitle}
          </div>
          {(swap.promoFormat || swap.partnerListSize) && (
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              {swap.promoFormat}
              {swap.promoFormat && swap.partnerListSize ? ' · ' : ''}
              {swap.partnerListSize ? fmtListSize(swap.partnerListSize) : ''}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={swap.status} />
          <ChevronDown
            size={14} strokeWidth={2} color="#9CA3AF"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: '1px solid rgba(30,45,61,0.06)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
        }}>
          {showDidTheySend && (
            <button
              onClick={() => patch('complete')} disabled={loading}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                background: '#D1FAE5', color: '#065F46', border: 'none', cursor: 'pointer',
              }}
            >
              Did they send? → Mark complete
            </button>
          )}
          {showMarkSent && (
            <button
              onClick={() => patch('sent')} disabled={loading}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Mark as Sent
            </button>
          )}
          {swap.status !== 'cancelled' && swap.status !== 'complete' && (
            <button
              onClick={() => patch('cancelled')} disabled={loading}
              style={{
                fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 8,
                background: 'none', color: '#9CA3AF', border: '1px solid #E5E7EB', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          {swap.partnerEmail && (
            <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>{swap.partnerEmail}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Action Banner ────────────────────────────────────────────────────────────

function ActionBanner({ swaps, onStatusChange }: {
  swaps: SwapRecord[]
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const today = todayDateStr()
  const due = swaps.filter(s =>
    s.direction === 'you_promote' &&
    promoDateStr(s.promoDate) <= today &&
    s.status !== 'sent' && s.status !== 'complete' && s.status !== 'cancelled'
  )
  if (due.length === 0) return null

  return (
    <div style={{ background: '#F97B6B', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
          You have {due.length} send{due.length > 1 ? 's' : ''} due
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {due.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              → Promote <strong style={{ color: 'white' }}>{s.bookTitle}</strong> for {s.partnerName} · due {fmtDate(s.promoDate)}
            </span>
            <button
              onClick={() => onStatusChange(s.id, 'sent')}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                background: 'white', color: '#F97B6B', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Mark Sent
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        border: '2px dashed rgba(30,45,61,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <CalendarDays size={32} strokeWidth={1.5} color="rgba(30,45,61,0.3)" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#1E2D3D', margin: '0 0 8px' }}>No swaps yet</p>
      <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 16px', maxWidth: 340, lineHeight: 1.5 }}>
        Your BookClicker and BookFunnel swaps will appear here automatically once the Fetch extension syncs.
      </p>
      <button
        onClick={onAdd}
        style={{
          fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
          color: '#E9A020', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        + Add one manually →
      </button>
    </div>
  )
}

// ─── Past Swaps Section ───────────────────────────────────────────────────────

function PastSwapsSection({
  groups,
  onStatusChange,
}: {
  groups: Array<{ monthKey: string; swaps: SwapRecord[] }>
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const total = groups.reduce((sum, g) => sum + g.swaps.length, 0)

  return (
    <div style={{ marginTop: 32 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left',
        }}
      >
        {expanded
          ? <ChevronDown size={16} strokeWidth={2} color="#9CA3AF" />
          : <ChevronRight size={16} strokeWidth={2} color="#9CA3AF" />
        }
        <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(30,45,61,0.45)' }}>
          Past Swaps ({total})
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {groups.map(group => (
            <div key={group.monthKey} style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10,
              }}>
                {fmtMonthHeader(group.monthKey)}
              </div>
              {group.swaps.map(s => (
                <SwapCard key={s.id} swap={s} onStatusChange={onStatusChange} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Add Swap Modal ───────────────────────────────────────────────────────────

const EMPTY_FORM = {
  partnerName: '',
  bookTitle: '',
  promoDate: '',
  direction: 'you_promote',
  promoFormat: '',
  partnerListSize: '',
  partnerEmail: '',
}

function AddSwapModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (swap: SwapRecord) => void
}) {
  const [form,   setForm]   = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const f = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.partnerName.trim() || !form.bookTitle.trim() || !form.promoDate) {
      setError('Partner name, book title, and promo date are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName:    form.partnerName,
          bookTitle:      form.bookTitle,
          promoDate:      form.promoDate,
          direction:      form.direction,
          promoFormat:    form.promoFormat    || null,
          partnerListSize: form.partnerListSize ? Number(form.partnerListSize) : null,
          partnerEmail:   form.partnerEmail   || null,
          source: 'direct',
        }),
      })
      const data = await res.json()
      if (data.success) {
        onCreated(data.swap)
      } else {
        setError(data.error ?? 'Something went wrong')
        setSaving(false)
      }
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  const inputSty: React.CSSProperties = {
    width: '100%', fontSize: 14, padding: '8px 12px',
    border: '1.5px solid #D1D5DB', borderRadius: 8,
    color: '#1E2D3D', background: 'white', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  }
  const labelSty: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 500, color: '#6B7280', marginBottom: 4,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: 16, width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #F3F4F6',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E2D3D' }}>Add Swap</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSty}>Partner Name *</label>
            <input value={form.partnerName} onChange={e => f('partnerName', e.target.value)} placeholder="Author or publisher name" style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>Book Being Promoted *</label>
            <input value={form.bookTitle} onChange={e => f('bookTitle', e.target.value)} placeholder="Title of the book being promoted in this swap" style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>Promo Date *</label>
            <input type="date" value={form.promoDate} onChange={e => f('promoDate', e.target.value)} style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>Direction *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              {[
                { value: 'you_promote', label: 'I promote their book' },
                { value: 'they_promote', label: 'They promote my book' },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio" name="direction" value={opt.value}
                    checked={form.direction === opt.value}
                    onChange={() => f('direction', opt.value)}
                    style={{ accentColor: '#E9A020' }}
                  />
                  <span style={{ fontSize: 14, color: '#1E2D3D' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelSty}>Format</label>
            <select value={form.promoFormat} onChange={e => f('promoFormat', e.target.value)} style={inputSty}>
              <option value="">— select format —</option>
              <option value="Feature">Feature</option>
              <option value="Mention">Mention</option>
              <option value="Solo">Solo</option>
            </select>
          </div>
          <div>
            <label style={labelSty}>Partner List Size</label>
            <input type="number" value={form.partnerListSize} onChange={e => f('partnerListSize', e.target.value)} placeholder="e.g. 4200" style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>Partner Email</label>
            <input type="email" value={form.partnerEmail} onChange={e => f('partnerEmail', e.target.value)} placeholder="partner@email.com" style={inputSty} />
          </div>

          {error && <p style={{ fontSize: 13, color: '#F97B6B', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="submit" disabled={saving}
              style={{
                flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
                background: '#E9A020', color: '#1E2D3D', border: 'none',
                borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving...' : 'Save Swap'}
            </button>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '10px 20px', fontSize: 14, background: 'none',
                border: '1px solid #E5E7EB', borderRadius: 10, cursor: 'pointer',
                color: '#6B7280', fontFamily: 'inherit',
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SwapsPage({ swaps: initialSwaps }: { swaps: SwapRecord[] }) {
  const [swaps,     setSwaps]     = useState<SwapRecord[]>(initialSwaps)
  const [showModal, setShowModal] = useState(false)

  async function handleStatusChange(id: string, status: string) {
    const res  = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) {
      setSwaps(prev => prev.map(s => s.id === id ? { ...s, status: data.swap.status } : s))
    }
  }

  function handleSwapCreated(swap: SwapRecord) {
    setSwaps(prev => [...prev, swap].sort((a, b) => a.promoDate.localeCompare(b.promoDate)))
    setShowModal(false)
  }

  function handleDayClick(dateStr: string) {
    const el = document.getElementById(`date-group-${dateStr}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const today = todayDateStr()

  // Split into upcoming / past
  const upcomingSwaps = swaps
    .filter(s => promoDateStr(s.promoDate) >= today)
    .sort((a, b) => a.promoDate.localeCompare(b.promoDate))

  const pastSwaps = swaps
    .filter(s => promoDateStr(s.promoDate) < today)
    .sort((a, b) => b.promoDate.localeCompare(a.promoDate))

  // Group upcoming by date
  const upcomingByDate: Array<{ dateStr: string; swaps: SwapRecord[] }> = []
  for (const s of upcomingSwaps) {
    const d = promoDateStr(s.promoDate)
    const existing = upcomingByDate.find(g => g.dateStr === d)
    if (existing) existing.swaps.push(s)
    else upcomingByDate.push({ dateStr: d, swaps: [s] })
  }

  // Group past by month (most recent first)
  const pastGrouped: Array<{ monthKey: string; swaps: SwapRecord[] }> = []
  for (const s of pastSwaps) {
    const monthKey = getMonthKey(promoDateStr(s.promoDate))
    const existing = pastGrouped.find(g => g.monthKey === monthKey)
    if (existing) existing.swaps.push(s)
    else pastGrouped.push({ monthKey, swaps: [s] })
  }

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E2D3D', margin: '0 0 4px' }}>
              Book Swaps
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(30,45,61,0.5)', margin: 0 }}>
              Your swap calendar and send responsibilities
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              fontSize: 14, fontWeight: 700, padding: '10px 18px', borderRadius: 10,
              background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            + Add Swap
          </button>
        </div>

        {/* Empty state — no swaps at all */}
        {swaps.length === 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(30,45,61,0.08)' }}>
            <EmptyState onAdd={() => setShowModal(true)} />
          </div>
        )}

        {swaps.length > 0 && (
          <>
            {/* Section 1 — Metrics */}
            <MetricsRow swaps={swaps} />

            {/* Section 2 — Heatmap Calendar */}
            <HeatmapCalendar swaps={swaps} today={today} onDayClick={handleDayClick} />

            {/* Section 3 — Action Required Banner */}
            <ActionBanner swaps={swaps} onStatusChange={handleStatusChange} />

            {/* Section 4 — Upcoming Swaps */}
            {upcomingSwaps.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(30,45,61,0.08)' }}>
                <EmptyState onAdd={() => setShowModal(true)} />
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2D3D', margin: '0 0 16px' }}>
                  Your Upcoming Swaps
                </p>

                {upcomingByDate.map(group => {
                  const dailyReach = group.swaps.reduce((sum, s) => sum + (s.partnerListSize ?? 0), 0)
                  return (
                    <div key={group.dateStr} id={`date-group-${group.dateStr}`} style={{ marginBottom: 20 }}>
                      {/* Date group header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 8,
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: '#E9A020',
                        }}>
                          {fmtDateGroupHeader(group.dateStr)}
                        </span>
                        {dailyReach > 0 && (
                          <span style={{ fontSize: 12, color: 'rgba(30,45,61,0.4)', fontWeight: 500 }}>
                            {fmtReach(dailyReach)} reach
                          </span>
                        )}
                      </div>

                      {group.swaps.map(s => (
                        <SwapCard key={s.id} swap={s} onStatusChange={handleStatusChange} />
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Section 5 — Past Swaps (collapsible) */}
            {pastSwaps.length > 0 && (
              <PastSwapsSection groups={pastGrouped} onStatusChange={handleStatusChange} />
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddSwapModal onClose={() => setShowModal(false)} onCreated={handleSwapCreated} />
      )}
    </div>
  )
}
