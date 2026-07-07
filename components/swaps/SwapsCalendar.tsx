'use client'

// Month calendar over SwapEntry rows. Extracted from the retired SwapsPage when
// the main Swaps page was rebuilt around the send queue — the calendar lives on
// as a secondary view at /dashboard/swaps/calendar.

import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { BOOK_COLORS } from '@/lib/bookColors'
import type { SerializedSwap } from '@/lib/swaps'

// A pending inbound request targets my LIST, not a specific book — the sync stores
// the list label (e.g. "Elle Wilder (Contemporary Romance, Slow Burn, Small Town)")
// in bookTitle. Detect it by the parenthetical genre tag: real book titles/codes
// never contain "(". Show the list name muted italic rather than as a book title.
function isListTarget(s: SerializedSwap): boolean {
  return s.role === 'inbound' && s.bookTitle.includes('(')
}
const LIST_TARGET_COLOR = '#9CA3AF'

function promoDateStr(iso: string) {
  return iso.split('T')[0]
}

function fmtDateGroupHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtListSize(n: number | null): string {
  if (!n) return ''
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K subs` : `${n} subs`
}

function getBookColor(title: string, catalog: { title: string }[]): string {
  const t = title.toLowerCase()
  const idx = catalog.findIndex(b => b.title.toLowerCase() === t)
  if (idx !== -1) return BOOK_COLORS[idx % BOOK_COLORS.length]
  return BOOK_COLORS[0]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    booked:    { bg: '#FEF3C7', color: '#92400E', label: 'Booked' },
    confirmed: { bg: '#D1FAE5', color: '#065F46', label: 'Confirmed' },
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

function DaySwapCard({ swap, catalog }: { swap: SerializedSwap; catalog: { title: string }[] }) {
  const listTarget = isListTarget(swap)
  const color = listTarget ? LIST_TARGET_COLOR : getBookColor(swap.bookTitle, catalog)
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

      {/* Row 1b: book title in book color — or, for a pending list request, the
          list name in muted italic (it targets my list, not a specific book) */}
      <p style={{
        fontSize: 12, fontWeight: listTarget ? 500 : 600, color, margin: '0 0 8px',
        fontStyle: listTarget ? 'italic' : 'normal',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {swap.bookTitle}
      </p>

      {/* Row 2: book dot + partner list label + subs + status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
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

export function SwapsCalendar({ swaps, today, catalog }: { swaps: SerializedSwap[]; today: string; catalog: { title: string }[] }) {
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
  const dateMap: Record<string, SerializedSwap[]> = {}
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
                      background: getBookColor(s.bookTitle, catalog),
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
            {(() => {
              const active    = selectedSwaps.filter(s => s.status !== 'cancelled')
              const cancelled = selectedSwaps.filter(s => s.status === 'cancelled')
              return (
                <>
                  {active.map(s => (
                    <DaySwapCard key={s.id} swap={s} catalog={catalog} />
                  ))}
                  {cancelled.length > 0 && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginTop: active.length > 0 ? 4 : 0,
                      }}>
                        <div style={{ flex: 1, height: '0.5px', background: 'rgba(30,45,61,0.08)' }} />
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: 'rgba(30,45,61,0.35)',
                          letterSpacing: '0.07em', textTransform: 'uppercase',
                        }}>
                          Cancelled
                        </span>
                        <div style={{ flex: 1, height: '0.5px', background: 'rgba(30,45,61,0.08)' }} />
                      </div>
                      {cancelled.map(s => (
                        <div key={s.id} style={{ opacity: 0.5 }}>
                          <DaySwapCard swap={s} catalog={catalog} />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
