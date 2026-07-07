'use client'

// Secondary month-grid view of the send queue, linked from the Swaps page footer.
// Reads the same SwapEntry data with the same semantics as the main page:
// amber marks dates with outbound-send obligations, sage marks dates where
// partners promote Andrea's books, both on mixed days. Clicking a day opens that
// date's manifest — the same row component as the hero.

import { useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { SerializedSwap } from '@/lib/swaps'
import {
  NAVY, AMBER, SAGE, SERIF, Dot, SectionLabel,
  ManifestList, patchSwapStatus, dstr, fmtShort,
} from '@/components/swaps/manifest'

function fmtDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function SwapsCalendar({ swaps: initialSwaps, today }: { swaps: SerializedSwap[]; today: string }) {
  const now = new Date()
  const [swaps,       setSwaps]       = useState<SerializedSwap[]>(initialSwaps)
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

  async function toggleSent(swap: SerializedSwap) {
    // Same optimistic mark-sent as the main page; unchecking goes back to approved.
    const status = swap.confirmation === 'complete' ? 'confirmed' : 'complete'
    const optimistic = status === 'complete' ? 'complete' : 'approved'
    const prev = swaps
    setSwaps(p => p.map(s => s.id === swap.id ? { ...s, confirmation: optimistic } : s))
    const confirmed = await patchSwapStatus(swap.id, status)
    if (confirmed === null) setSwaps(prev)
    else setSwaps(p => p.map(s => s.id === swap.id ? { ...s, confirmation: confirmed } : s))
  }

  // Per-date buckets, same role mapping as the main page: outbound-send = your
  // sends (amber) · inbound + approved = partners promoting your books (sage).
  const { sendsByDate, promosByDate, multiList } = useMemo(() => {
    const sendsByDate = new Map<string, SerializedSwap[]>()
    const promosByDate = new Map<string, SerializedSwap[]>()
    const active = swaps.filter(s => s.confirmation !== 'cancelled')
    for (const s of active) {
      const d = dstr(s.promoDate)
      if (s.role === 'outbound-send') {
        if (!sendsByDate.has(d)) sendsByDate.set(d, [])
        sendsByDate.get(d)!.push(s)
      } else if (s.role === 'inbound' && s.confirmation === 'approved') {
        if (!promosByDate.has(d)) promosByDate.set(d, [])
        promosByDate.get(d)!.push(s)
      }
    }
    const multiList = new Set(active.filter(s => s.role === 'outbound-send').map(s => s.myList)).size > 1
    return { sendsByDate, promosByDate, multiList }
  }, [swaps])

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const monthLabel     = new Date(year, month, 15).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  function dayCount(dateStr: string): number {
    return (sendsByDate.get(dateStr)?.length ?? 0) + (promosByDate.get(dateStr)?.length ?? 0)
  }

  function handleDayClick(dateStr: string) {
    if (dayCount(dateStr) === 0) return
    setSelectedDay(prev => prev === dateStr ? null : dateStr)
  }

  const selectedSends  = selectedDay ? (sendsByDate.get(selectedDay) ?? []) : []
  const selectedPromos = selectedDay ? (promosByDate.get(selectedDay) ?? []) : []

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
        <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{monthLabel}</span>
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
          if (!dateStr) return <div key={`e-${i}`} style={{ minHeight: 58 }} />
          const sends     = sendsByDate.get(dateStr) ?? []
          const promos    = promosByDate.get(dateStr) ?? []
          const count     = sends.length + promos.length
          const isToday   = dateStr === today
          const isSelected = dateStr === selectedDay
          const dayNum    = new Date(dateStr + 'T12:00:00').getDate()

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              style={{
                minHeight: 58,
                borderRadius: 6,
                background: isSelected ? '#FFF8F0' : count > 0 ? '#FAFAFA' : 'transparent',
                border: isToday
                  ? `1.5px solid ${NAVY}`
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
              {/* Date number + send count */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, lineHeight: 1,
                  fontWeight: isToday ? 700 : count > 0 ? 600 : 400,
                  color: isToday ? NAVY : count > 0 ? NAVY : '#C9C9C9',
                }}>
                  {dayNum}
                </span>
                {sends.length > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#B57812', lineHeight: 1 }}>
                    {sends.length} send{sends.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Direction marks: amber = your sends, sage = promoting your books */}
              {count > 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 1.5,
                  flex: 1, justifyContent: 'flex-end', paddingBottom: 4,
                }}>
                  {sends.length > 0 && (
                    <div style={{ height: 3, borderRadius: 2, background: AMBER }} />
                  )}
                  {promos.length > 0 && (
                    <div style={{ height: 3, borderRadius: 2, background: SAGE }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(30,45,61,0.5)' }}>
          <Dot color={AMBER} /> Your sends
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(30,45,61,0.5)' }}>
          <Dot color={SAGE} /> Promoting your books
        </span>
      </div>

      {/* Day manifest panel */}
      {selectedDay && (selectedSends.length > 0 || selectedPromos.length > 0) && (
        <div style={{
          marginTop: 16, paddingTop: 16,
          borderTop: '0.5px solid rgba(30,45,61,0.08)',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: '0 0 4px' }}>
            {fmtDayHeader(selectedDay)}
          </p>

          {selectedSends.length > 0 && (
            <div style={{ marginBottom: selectedPromos.length > 0 ? 14 : 0 }}>
              <ManifestList rows={selectedSends} multiList={multiList} onToggle={toggleSent} />
            </div>
          )}

          {selectedPromos.length > 0 && (
            <div>
              <SectionLabel>Promoting Your Books</SectionLabel>
              {selectedPromos.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
                  borderTop: i > 0 ? '0.5px solid rgba(30,45,61,0.06)' : 'none',
                }}>
                  <div style={{ paddingTop: 5 }}><Dot color={SAGE} /></div>
                  <p style={{ fontSize: 12.5, color: 'rgba(30,45,61,0.7)', margin: 0, lineHeight: 1.45, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: NAVY }}>{s.partnerName}</span>
                    {' sends '}
                    <span style={{ fontStyle: 'italic', fontFamily: SERIF }}>{s.bookTitle}</span>
                    {' · '}{fmtShort(dstr(s.promoDate))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
