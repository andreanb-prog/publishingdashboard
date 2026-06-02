'use client'

import { useState } from 'react'
import { CalendarDays, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { BOOK_COLORS } from '@/lib/bookColors'

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

// Maps book title → design-system color (B1=coral, B2=peach, B3=plum, ...)
function getBookColorByTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('roommate')) return BOOK_COLORS[0]
  if (t.includes('billionaire') || t.includes('protector')) return BOOK_COLORS[1]
  if (t.includes("ex'") || t.includes('secret baby') || t.includes(' ex ') || t.includes('ex,')) return BOOK_COLORS[2]
  // deterministic hash for unknown titles
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffff
  return BOOK_COLORS[h % BOOK_COLORS.length]
}

function bookShortName(title: string): string {
  const words = title.trim().split(/\s+/)
  return words.slice(0, 4).join(' ') + (words.length > 4 ? '…' : '')
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

// ─── Direction Badge (used in SwapCard) ───────────────────────────────────────

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

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ swaps, today }: { swaps: SwapRecord[]; today: string }) {
  const nonCancelled = swaps.filter(s => s.status !== 'cancelled')

  const totalSwaps = nonCancelled.length

  const estReach = nonCancelled
    .filter(s => s.direction === 'you_promote')
    .reduce((sum, s) => sum + (s.partnerListSize ?? 0), 0)

  const sendsPending = nonCancelled.filter(s =>
    s.direction === 'you_promote' &&
    s.status === 'booked' &&
    promoDateStr(s.promoDate) >= today
  ).length

  const incomingBooked = nonCancelled.filter(s =>
    s.direction === 'they_promote' &&
    s.status === 'booked' &&
    promoDateStr(s.promoDate) >= today
  ).length

  const stats: Array<{ label: string; value: string; estimated?: boolean }> = [
    { label: 'Total Swaps',     value: String(totalSwaps) },
    { label: 'Est. Reach',      value: fmtReach(estReach), estimated: true },
    { label: 'Sends Pending',   value: String(sendsPending) },
    { label: 'Incoming Booked', value: String(incomingBooked) },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
      marginBottom: 20, overflow: 'hidden',
    }}>
      {stats.map((stat, i) => (
        <div key={stat.label} style={{
          padding: '18px 20px',
          borderRight: i < 3 ? '0.5px solid rgba(30,45,61,0.08)' : 'none',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(30,45,61,0.4)',
            letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px',
          }}>
            {stat.label}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#1E2D3D', lineHeight: 1 }}>
              {stat.value}
            </span>
            {stat.estimated && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                background: 'rgba(233,160,32,0.15)', color: '#E9A020',
              }}>
                ⚠ est
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Day Panel Swap Card (used inside calendar day panel) ─────────────────────

function DaySwapCard({ swap }: { swap: SwapRecord }) {
  const color = getBookColorByTitle(swap.bookTitle)
  const isSend = swap.direction === 'you_promote'
  const kind = swap.promoFormat

  return (
    <div style={{
      background: 'white', border: '0.5px solid rgba(30,45,61,0.1)', borderRadius: 10,
      padding: '12px 14px',
    }}>
      {/* Row 1: partner name + direction pill + kind badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 4, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: '#1E2D3D',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {swap.partnerName}
        </span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
            background: isSend ? 'rgba(233,160,32,0.15)' : 'rgba(110,191,139,0.15)',
            color: isSend ? '#E9A020' : '#6EBF8B',
          }}>
            {isSend ? 'YOU SEND' : 'INCOMING'}
          </span>
          {kind && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
              background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.55)',
              whiteSpace: 'nowrap',
            }}>
              {kind}
            </span>
          )}
        </div>
      </div>

      {/* Row 1b: book title in book color (RESTORE 2) */}
      {/* Note: getBookColorByTitle indices for B1 coral and B2 peach are swapped — pre-existing bug, out of scope */}
      <p style={{
        fontSize: 12, fontWeight: 600, color, margin: '0 0 8px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {swap.bookTitle}
      </p>

      {/* Row 2: book dot + launchWindow label + subs + status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
          {/* launchWindow (RESTORE 1): "List: …" — hidden when null */}
          {swap.launchWindow && (
            <span style={{
              fontSize: 11, color: 'rgba(30,45,61,0.5)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              List: {swap.launchWindow}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {swap.partnerListSize != null && swap.partnerListSize > 0 && (
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>
              {fmtListSize(swap.partnerListSize)}
            </span>
          )}
          <StatusBadge status={swap.status} />
        </div>
      </div>
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ swaps, today }: { swaps: SwapRecord[]; today: string }) {
  const now = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build dateStr → swaps[]
  const dateMap: Record<string, SwapRecord[]> = {}
  for (const s of swaps) {
    const d = promoDateStr(s.promoDate)
    if (!dateMap[d]) dateMap[d] = []
    dateMap[d].push(s)
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const monthLabel     = new Date(year, month, 15).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  function handleDayClick(dateStr: string) {
    const count = (dateMap[dateStr] ?? []).length
    if (count === 0) return
    setSelectedDay(prev => prev === dateStr ? null : dateStr)
  }

  const selectedSwaps = selectedDay ? (dateMap[selectedDay] ?? []) : []

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
      padding: '20px 20px 16px', marginBottom: 20,
    }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E2D3D' }}>{monthLabel}</span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 700,
            color: '#9CA3AF', letterSpacing: '0.04em', paddingBottom: 4,
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`e-${i}`} style={{ minHeight: 54 }} />
          const daySwaps  = dateMap[dateStr] ?? []
          const count     = daySwaps.length
          const isToday   = dateStr === today
          const isSelected = dateStr === selectedDay
          const dayNum    = new Date(dateStr + 'T12:00:00').getDate()

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              style={{
                minHeight: 54,
                borderRadius: 6,
                background: isSelected ? '#FFF8F0' : count > 0 ? '#FAFAFA' : 'transparent',
                border: isToday
                  ? '1.5px solid #1E2D3D'
                  : isSelected
                    ? '1px solid rgba(233,160,32,0.45)'
                    : '0.5px solid transparent',
                cursor: count > 0 ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                padding: '5px 5px 0',
                overflow: 'hidden',
                transition: 'background 0.1s',
              }}
            >
              {/* Date number */}
              <span style={{
                fontSize: 11, lineHeight: 1,
                fontWeight: isToday ? 700 : count > 0 ? 600 : 400,
                color: isToday ? '#1E2D3D' : count > 0 ? '#1E2D3D' : '#C9C9C9',
                marginBottom: 2,
              }}>
                {dayNum}
              </span>

              {/* Stacked book-color bars (one per swap, max 5 shown) */}
              {count > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 1.5,
                  flex: 1, justifyContent: 'flex-end', paddingBottom: 4,
                }}>
                  {daySwaps.slice(0, 5).map((s, j) => (
                    <div key={j} title={s.bookTitle} style={{
                      height: 3, borderRadius: 2,
                      background: getBookColorByTitle(s.bookTitle),
                    }} />
                  ))}
                  {count > 5 && (
                    <div style={{ height: 3, borderRadius: 2, background: '#E5E7EB' }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inline day panel */}
      {selectedDay && selectedSwaps.length > 0 && (
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: '0.5px solid rgba(30,45,61,0.08)',
        }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: '#1E2D3D', margin: '0 0 12px',
          }}>
            {fmtDateGroupHeader(selectedDay)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedSwaps.map(s => (
              <DaySwapCard key={s.id} swap={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Up Next Panel ───────────────────────────────────────────────────────────

function UpNextPanel({ swaps, today }: { swaps: SwapRecord[]; today: string }) {
  const upNext = swaps
    .filter(s =>
      s.direction === 'you_promote' &&
      s.status === 'booked' &&
      promoDateStr(s.promoDate) >= today
    )
    .sort((a, b) => a.promoDate.localeCompare(b.promoDate))
    .slice(0, 10)

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
      padding: '16px 18px',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
        letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px',
      }}>
        Up Next
      </p>

      {upNext.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '24px 0', textAlign: 'center' }}>
          No upcoming sends booked.
        </p>
      ) : (
        <div>
          {upNext.map((s, i) => {
            const color = getBookColorByTitle(s.bookTitle)
            const dateLabel = new Date(promoDateStr(s.promoDate) + 'T12:00:00')
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 0',
                  borderBottom: i < upNext.length - 1 ? '0.5px solid rgba(30,45,61,0.06)' : 'none',
                }}
              >
                {/* Book color dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />

                {/* Partner name */}
                <span style={{
                  fontSize: 13, fontWeight: 600, color: '#1E2D3D',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.partnerName}
                </span>

                {/* List / launch window (muted) */}
                {s.launchWindow && (
                  <span style={{
                    fontSize: 11, color: '#9CA3AF', flexShrink: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 64,
                  }}>
                    {s.launchWindow}
                  </span>
                )}

                {/* Date */}
                <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.45)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {dateLabel}
                </span>

                {/* Sub count */}
                {s.partnerListSize != null && s.partnerListSize > 0 && (
                  <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.partnerListSize >= 1000
                      ? `${(s.partnerListSize / 1000).toFixed(1)}K`
                      : String(s.partnerListSize)}
                  </span>
                )}

                {/* Status pill */}
                <StatusBadge status={s.status} />

                {/* Kind badge */}
                {s.promoFormat && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                    background: 'rgba(30,45,61,0.06)', color: 'rgba(30,45,61,0.5)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.promoFormat}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Partner Ledger ───────────────────────────────────────────────────────────

interface PartnerRow {
  partnerName: string
  youSend:    number  // you_promote count
  theySend:   number  // they_promote count
  /** youSend - theySend: positive = they owe you, negative = you owe them */
  balance:    number
  lastSwapDate: string
}

function BalanceBar({ balance }: { balance: number }) {
  const abs      = Math.abs(balance)
  // Each unit fills 1/3 of a half (max half at ±3)
  const fillPct  = Math.min(abs / 3, 1) * 50
  const label    = balance > 0 ? `you +${abs}` : balance < 0 ? `owe ${abs}` : 'even'
  // sage = they owe you (right fill), coral = you owe them (left fill)
  const fillColor = balance > 0 ? '#6EBF8B' : balance < 0 ? '#F97B6B' : 'transparent'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 80 }}>
      {/* Bar track */}
      <div style={{
        width: 80, height: 6, background: 'rgba(30,45,61,0.07)',
        borderRadius: 3, position: 'relative', overflow: 'hidden',
      }}>
        {/* Center divider */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', width: 1, height: '100%',
          background: 'rgba(30,45,61,0.2)', transform: 'translateX(-50%)',
        }} />
        {/* Colored fill */}
        {balance !== 0 && (
          <div style={{
            position: 'absolute', top: 0, height: '100%',
            width: `${fillPct}%`,
            background: fillColor,
            // fills left from center when you owe; right from center when they owe
            left: balance < 0 ? `${50 - fillPct}%` : '50%',
          }} />
        )}
      </div>
      {/* Text label */}
      <span style={{
        fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
        color: balance > 0 ? '#6EBF8B' : balance < 0 ? '#F97B6B' : '#9CA3AF',
      }}>
        {label}
      </span>
    </div>
  )
}

function PartnerLedger({ swaps }: { swaps: SwapRecord[] }) {
  const nonCancelled = swaps.filter(s => s.status !== 'cancelled')

  // Aggregate per partner
  const map: Record<string, { youSend: number; theySend: number; dates: string[] }> = {}
  for (const s of nonCancelled) {
    if (!map[s.partnerName]) map[s.partnerName] = { youSend: 0, theySend: 0, dates: [] }
    const r = map[s.partnerName]
    if (s.direction === 'you_promote') r.youSend++
    else r.theySend++
    r.dates.push(promoDateStr(s.promoDate))
  }

  const rows: PartnerRow[] = Object.entries(map).map(([name, d]) => ({
    partnerName:  name,
    youSend:      d.youSend,
    theySend:     d.theySend,
    balance:      d.youSend - d.theySend,
    lastSwapDate: [...d.dates].sort().reverse()[0] ?? '',
  }))
  // Most imbalanced (you owe most = most negative balance) first
  rows.sort((a, b) => a.balance - b.balance)

  const colGrid = '1fr 26px 28px 80px 46px 54px'

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '0.5px solid rgba(30,45,61,0.12)',
      padding: '16px 18px',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'rgba(30,45,61,0.4)',
        letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px',
      }}>
        Partner Ledger
      </p>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '24px 0', textAlign: 'center' }}>
          No partners yet.
        </p>
      ) : (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: colGrid,
            gap: 4, paddingBottom: 8,
            borderBottom: '0.5px solid rgba(30,45,61,0.08)', marginBottom: 2,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Partner</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>You→</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>→You</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>Balance</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(30,45,61,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>Last</span>
            <span />
          </div>

          {/* Data rows */}
          {rows.map((row, i) => {
            const lastFmt = row.lastSwapDate
              ? new Date(row.lastSwapDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'
            const youOwe  = row.balance < 0
            const theyOwe = row.balance > 0

            return (
              <div
                key={row.partnerName}
                style={{
                  display: 'grid', gridTemplateColumns: colGrid,
                  gap: 4, alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < rows.length - 1 ? '0.5px solid rgba(30,45,61,0.06)' : 'none',
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600, color: '#1E2D3D',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.partnerName}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(30,45,61,0.6)', textAlign: 'center' }}>
                  {row.youSend}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(30,45,61,0.6)', textAlign: 'center' }}>
                  {row.theySend}
                </span>
                <BalanceBar balance={row.balance} />
                <span style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {lastFmt}
                </span>
                {youOwe ? (
                  <button style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                    background: '#E9A020', color: '#1E2D3D', border: 'none',
                    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}>
                    Book
                  </button>
                ) : theyOwe ? (
                  <button style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                    background: 'none', color: 'rgba(30,45,61,0.5)',
                    border: '1px solid rgba(30,45,61,0.2)', cursor: 'pointer',
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                  }}>
                    Ask
                  </button>
                ) : (
                  <div />
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─── Swap Card (used in upcoming + past sections) ─────────────────────────────

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
        <div style={{ paddingTop: 5, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        </div>

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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={swap.status} />
          <ChevronDown
            size={14} strokeWidth={2} color="#9CA3AF"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </div>
      </div>

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
          partnerName:     form.partnerName,
          bookTitle:       form.bookTitle,
          promoDate:       form.promoDate,
          direction:       form.direction,
          promoFormat:     form.promoFormat    || null,
          partnerListSize: form.partnerListSize ? Number(form.partnerListSize) : null,
          partnerEmail:    form.partnerEmail   || null,
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

  const today = todayDateStr()

  const upcomingSwaps = swaps
    .filter(s => promoDateStr(s.promoDate) >= today)
    .sort((a, b) => a.promoDate.localeCompare(b.promoDate))

  const pastSwaps = swaps
    .filter(s => promoDateStr(s.promoDate) < today)
    .sort((a, b) => b.promoDate.localeCompare(a.promoDate))

  const upcomingByDate: Array<{ dateStr: string; swaps: SwapRecord[] }> = []
  for (const s of upcomingSwaps) {
    const d = promoDateStr(s.promoDate)
    const existing = upcomingByDate.find(g => g.dateStr === d)
    if (existing) existing.swaps.push(s)
    else upcomingByDate.push({ dateStr: d, swaps: [s] })
  }

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

        {/* Empty state */}
        {swaps.length === 0 && (
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(30,45,61,0.08)' }}>
            <EmptyState onAdd={() => setShowModal(true)} />
          </div>
        )}

        {swaps.length > 0 && (
          <>
            {/* Section 1 — Stats Bar */}
            <StatsBar swaps={swaps} today={today} />

            {/* Section 2 — Calendar */}
            <Calendar swaps={swaps} today={today} />

            {/* Section 3 — Up Next (full-width) */}
            <div style={{ marginBottom: 20 }}>
              <UpNextPanel swaps={swaps} today={today} />
            </div>

            {/* Section 4 — Action Required Banner */}
            <ActionBanner swaps={swaps} onStatusChange={handleStatusChange} />

            {/* Section 5 — Upcoming Swaps */}
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

            {/* Section 6 — Past Swaps (collapsible) */}
            {pastSwaps.length > 0 && (
              <PastSwapsSection groups={pastGrouped} onStatusChange={handleStatusChange} />
            )}

            {/* Section 7 — Partner Ledger (full-width, last section) */}
            <div style={{ marginTop: 32 }}>
              <PartnerLedger swaps={swaps} />
            </div>
          </>
        )}
      </div>

      {showModal && (
        <AddSwapModal onClose={() => setShowModal(false)} onCreated={handleSwapCreated} />
      )}
    </div>
  )
}
