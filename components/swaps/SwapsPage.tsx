'use client'

import { useState } from 'react'
import { CalendarDays, ChevronDown, ArrowLeftRight } from 'lucide-react'

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

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function fmtWeekHeader(mondayStr: string): string {
  const d = new Date(mondayStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtDay(iso: string): { day: string; month: string } {
  const d = new Date(promoDateStr(iso) + 'T12:00:00')
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  }
}

function fmtDate(iso: string): string {
  const d = new Date(promoDateStr(iso) + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtListSize(n: number | null): string {
  if (!n) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K subs` : `${n} subs`
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

// ─── Swap Card ────────────────────────────────────────────────────────────────

function SwapCard({ swap, onStatusChange }: {
  swap: SwapRecord
  onStatusChange: (id: string, status: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const { day, month } = fmtDay(swap.promoDate)
  const isYou = swap.direction === 'you_promote'
  const isThey = swap.direction === 'they_promote'

  async function patch(status: string) {
    setLoading(true)
    await onStatusChange(swap.id, status)
    setLoading(false)
    setExpanded(false)
  }

  const showMarkSent = isYou && swap.status !== 'sent' && swap.status !== 'complete' && swap.status !== 'cancelled'
  const showDidTheySend = isThey && (swap.status === 'booked' || swap.status === 'confirmed')

  return (
    <div style={{
      background: 'white', border: '1px solid rgba(30,45,61,0.08)',
      borderRadius: 12, padding: 16, marginBottom: 8,
      opacity: swap.status === 'cancelled' ? 0.55 : 1,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Date column */}
        <div style={{ width: 60, flexShrink: 0, textAlign: 'center', paddingTop: 2 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1E2D3D', lineHeight: 1 }}>{day}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{month}</div>
        </div>

        {/* Center column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <DirectionBadge direction={swap.direction} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1E2D3D' }}>{swap.partnerName}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1E2D3D', marginBottom: 3 }}>
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

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={swap.status} />
          <ChevronDown
            size={14}
            strokeWidth={2}
            color="#9CA3AF"
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
              onClick={() => patch('complete')}
              disabled={loading}
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
              onClick={() => patch('sent')}
              disabled={loading}
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
              onClick={() => patch('cancelled')}
              disabled={loading}
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
    <div style={{
      background: '#F97B6B', borderRadius: 12, padding: '16px 20px', marginBottom: 20,
    }}>
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
                background: 'white', color: '#F97B6B', border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap',
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
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
          partnerName: form.partnerName,
          bookTitle: form.bookTitle,
          promoDate: form.promoDate,
          direction: form.direction,
          promoFormat: form.promoFormat || null,
          partnerListSize: form.partnerListSize ? Number(form.partnerListSize) : null,
          partnerEmail: form.partnerEmail || null,
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
    display: 'block', fontSize: 12, fontWeight: 500,
    color: '#6B7280', marginBottom: 4,
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelSty}>Partner Name *</label>
            <input
              value={form.partnerName}
              onChange={e => f('partnerName', e.target.value)}
              placeholder="Author or publisher name"
              style={inputSty}
            />
          </div>

          <div>
            <label style={labelSty}>Book Being Promoted *</label>
            <input
              value={form.bookTitle}
              onChange={e => f('bookTitle', e.target.value)}
              placeholder="Title of the book being promoted in this swap"
              style={inputSty}
            />
          </div>

          <div>
            <label style={labelSty}>Promo Date *</label>
            <input
              type="date"
              value={form.promoDate}
              onChange={e => f('promoDate', e.target.value)}
              style={inputSty}
            />
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
                    type="radio"
                    name="direction"
                    value={opt.value}
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
            <input
              type="number"
              value={form.partnerListSize}
              onChange={e => f('partnerListSize', e.target.value)}
              placeholder="e.g. 4200"
              style={inputSty}
            />
          </div>

          <div>
            <label style={labelSty}>Partner Email</label>
            <input
              type="email"
              value={form.partnerEmail}
              onChange={e => f('partnerEmail', e.target.value)}
              placeholder="partner@email.com"
              style={inputSty}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: '#F97B6B', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 700,
                background: '#E9A020', color: '#1E2D3D', border: 'none',
                borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving...' : 'Save Swap'}
            </button>
            <button
              type="button"
              onClick={onClose}
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
  const [swaps, setSwaps] = useState<SwapRecord[]>(initialSwaps)
  const [showModal, setShowModal] = useState(false)

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/swaps/${id}`, {
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
    setSwaps(prev =>
      [...prev, swap].sort((a, b) => a.promoDate.localeCompare(b.promoDate))
    )
    setShowModal(false)
  }

  // Group visible swaps by week (exclude cancelled from view? Keep them but dim via card opacity)
  const grouped: Array<{ monday: string; swaps: SwapRecord[] }> = []
  for (const s of swaps) {
    const monday = getMondayOf(promoDateStr(s.promoDate))
    const existing = grouped.find(g => g.monday === monday)
    if (existing) {
      existing.swaps.push(s)
    } else {
      grouped.push({ monday, swaps: [s] })
    }
  }

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header strip */}
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

        {/* Empty state */}
        {swaps.length === 0 && (
          <div style={{
            background: 'white', borderRadius: 16, border: '1px solid rgba(30,45,61,0.08)',
          }}>
            <EmptyState onAdd={() => setShowModal(true)} />
          </div>
        )}

        {swaps.length > 0 && (
          <>
            {/* Section 1 — Action Required Banner */}
            <ActionBanner swaps={swaps} onStatusChange={handleStatusChange} />

            {/* Section 2 — Upcoming Swaps calendar view */}
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1E2D3D', margin: '0 0 16px' }}>
                Upcoming Swaps
              </p>

              {grouped.map(group => (
                <div key={group.monday} style={{ marginBottom: 24 }}>
                  {/* Week header */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: '#E9A020', marginBottom: 10,
                  }}>
                    Week of {fmtWeekHeader(group.monday)}
                  </div>

                  {/* Swap cards */}
                  {group.swaps.map(s => (
                    <SwapCard key={s.id} swap={s} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              ))}
            </div>
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
