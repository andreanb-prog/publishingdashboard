'use client'
// components/launch/LaunchCalendar.tsx

import { useState, useMemo } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CalTask {
  id: string
  name: string
  dueDate: string
  channel: string
  phase: string
  status: string
  bookId: string | null
}

interface CalLaunch {
  id: string
  bookTitle: string
  startDate: string | null
}

interface LaunchCalendarProps {
  tasks: CalTask[]
  launches: CalLaunch[]
  launchDate: string | null
  onComplete: (id: string) => void
  calendarToken: string
}

// ── Color system ───────────────────────────────────────────────────────────────
const CHANNEL_CHIP: Record<string, { bg: string; text: string; dot: string }> = {
  Ads:     { bg: '#FEE2E2', text: '#991B1B', dot: '#F97B6B' },
  Email:   { bg: '#DBEAFE', text: '#1E40AF', dot: '#60A5FA' },
  Creative:{ bg: '#FCE7F3', text: '#831843', dot: '#F472B6' },
  Social:  { bg: '#FED7AA', text: '#9A3412', dot: '#F4A261' },
  General: { bg: '#FEF3C7', text: '#92400E', dot: '#E9A020' },
}

const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

const LEGEND_ITEMS = [
  { label: 'Ads',      color: '#F97B6B' },
  { label: 'Email',    color: '#60A5FA' },
  { label: 'Creative', color: '#F472B6' },
  { label: 'Social',   color: '#F4A261' },
  { label: 'General',  color: '#E9A020' },
]

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── Helpers ────────────────────────────────────────────────────────────────────
function toLocalDate(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const days: Date[] = []

  // Leading days from prev month (Mon=0 index)
  const firstDow = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < firstDow; i++) {
    days.push(new Date(year, month, 1 - firstDow + i))
  }
  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  // Trailing days to complete last row
  const remaining = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i))
  }
  return days
}

// ── Subscribe modal ────────────────────────────────────────────────────────────
function SubscribeModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://authordash.io'
  const icsUrl = `${origin}/api/calendar/${token}`
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`

  async function handleCopy() {
    try { await navigator.clipboard.writeText(icsUrl) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(30,45,61,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        style={{ border: '0.5px solid #E5E7EB', fontFamily: 'var(--font-sans)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[15px]" style={{ color: '#1E2D3D' }}>
            Subscribe to Calendar
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}
          >
            ×
          </button>
        </div>

        <p className="text-[12px] text-gray-500 mb-3">
          Copy this URL into your calendar app to sync your launch tasks automatically.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            readOnly
            value={icsUrl}
            className="flex-1 text-[11px] px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 outline-none"
            style={{ fontFamily: 'monospace' }}
          />
          <button
            onClick={handleCopy}
            className="text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            style={{ background: copied ? '#6EBF8B' : '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12px] font-medium px-4 py-2.5 rounded-lg transition-colors"
            style={{ background: '#F8F9FA', color: '#1E2D3D', border: '0.5px solid #E5E7EB', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.5" />
              <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" />
              <path d="M8 3v3M16 3v3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add to Google Calendar
          </a>

          <a
            href={icsUrl}
            className="flex items-center gap-2 text-[12px] font-medium px-4 py-2.5 rounded-lg transition-colors"
            style={{ background: '#F8F9FA', color: '#1E2D3D', border: '0.5px solid #E5E7EB', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#6B7280" strokeWidth="1.5" />
              <path d="M14 2v6h6" stroke="#6B7280" strokeWidth="1.5" />
              <path d="M12 11v6M9 14l3 3 3-3" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add to Apple Calendar / Outlook
          </a>
        </div>

        <p className="text-[10px] text-gray-400 mt-3">
          For Apple Calendar or Outlook, copy the URL above and use "Subscribe to Calendar" or "Add calendar from URL."
        </p>
      </div>
    </div>
  )
}

// ── Day detail panel ───────────────────────────────────────────────────────────
function DayDetailPanel({
  date,
  tasks,
  onComplete,
  onClose,
}: {
  date: Date
  tasks: CalTask[]
  onComplete: (id: string) => void
  onClose: () => void
}) {
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{ background: 'white', border: '0.5px solid #E5E7EB' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '0.5px solid #E5E7EB', background: '#FFF8F0' }}
      >
        <span className="font-semibold text-[13px]" style={{ color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}>
          {dateLabel}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
        >
          ×
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-gray-400" style={{ fontFamily: 'var(--font-sans)' }}>
          No tasks scheduled for this day.
        </div>
      ) : (
        <div>
          {tasks.map(task => {
            const isDone = task.status === 'done'
            const taskDate = toLocalDate(task.dueDate)
            const isOverdue = !isDone && taskDate < todayMid
            const chip = CHANNEL_CHIP[task.channel] ?? CHANNEL_CHIP.General

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: '0.5px solid #F3EDE3',
                  borderLeft: isOverdue ? '3px solid #F97B6B' : 'none',
                  paddingLeft: isOverdue ? 13 : 16,
                }}
              >
                <button
                  onClick={() => { if (!isDone) onComplete(task.id) }}
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    background: isDone ? '#6EBF8B' : 'transparent',
                    borderColor: isDone ? '#6EBF8B' : '#D1D5DB',
                    cursor: isDone ? 'default' : 'pointer',
                  }}
                  aria-label={isDone ? 'Done' : 'Mark done'}
                  disabled={isDone}
                >
                  {isDone && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <polyline points="1,4 3.5,6.5 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <span
                  className="flex-1 text-[13px]"
                  style={{
                    color: '#1E2D3D',
                    textDecoration: isDone ? 'line-through' : 'none',
                    opacity: isDone ? 0.5 : 1,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {task.name}
                </span>

                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: chip.bg, color: chip.text }}
                >
                  {task.channel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main LaunchCalendar ────────────────────────────────────────────────────────
export function LaunchCalendar({
  tasks,
  launches,
  launchDate,
  onComplete,
  calendarToken,
}: LaunchCalendarProps) {
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayStr = fmtISO(todayMid)

  const [currentYear,  setCurrentYear]  = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [bookFilter,   setBookFilter]   = useState<string | null>(null)
  const [showSubscribe, setShowSubscribe] = useState(false)

  const launchDateStr = launchDate ? fmtISO(toLocalDate(launchDate)) : null

  // Build date → tasks map
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalTask[]> = {}
    for (const task of tasks) {
      const d = fmtISO(toLocalDate(task.dueDate))
      if (!map[d]) map[d] = []
      map[d].push(task)
    }
    return map
  }, [tasks])

  const calDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
    setSelectedDate(null)
  }

  function goToday() {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(todayStr)
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(prev => prev === dateStr ? null : dateStr)
  }

  const selectedDateObj = selectedDate
    ? new Date(
        parseInt(selectedDate.slice(0, 4)),
        parseInt(selectedDate.slice(5, 7)) - 1,
        parseInt(selectedDate.slice(8, 10))
      )
    : null

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : []

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Topbar */}
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: '0.5px solid #F0EBE3' }}
      >
        {/* Month navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            style={{ background: 'none', border: '0.5px solid #E5E7EB', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', color: '#6B7280', fontSize: 14, lineHeight: 1 }}
          >
            ‹
          </button>
          <span
            className="font-semibold text-[14px] text-center"
            style={{ minWidth: 130, color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: 'none', border: '0.5px solid #E5E7EB', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', color: '#6B7280', fontSize: 14, lineHeight: 1 }}
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="text-[12px] font-medium px-3 py-1 rounded-lg transition-colors"
            style={{ background: 'none', border: '0.5px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            Today
          </button>
        </div>

        {/* Book filter pills */}
        {launches.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {launches.map((launch, i) => {
              const color = BOOK_COLORS[i % BOOK_COLORS.length]
              const isActive = bookFilter === launch.id
              return (
                <button
                  key={launch.id}
                  onClick={() => setBookFilter(prev => prev === launch.id ? null : launch.id)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: isActive ? color : 'transparent',
                    color: isActive ? '#fff' : color,
                    border: `0.5px solid ${color}`,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  {launch.bookTitle}
                </button>
              )
            })}
          </div>
        )}

        {/* Subscribe button */}
        <button
          onClick={() => setShowSubscribe(true)}
          className="ml-auto text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: '#FFF4E0', color: '#E9A020', border: '0.5px solid #F6D38A', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
        >
          + Subscribe to calendar
        </button>
      </div>

      {/* Legend */}
      <div
        className="px-4 py-2 flex flex-wrap gap-4"
        style={{ borderBottom: '0.5px solid #F0EBE3', background: '#FAFAF9' }}
      >
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span className="text-[10px] text-gray-500" style={{ fontFamily: 'var(--font-sans)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW.map(d => (
            <div
              key={d}
              className="text-center text-[10px] font-semibold uppercase text-gray-400 py-1"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="grid grid-cols-7"
          style={{ border: '0.5px solid #E5E7EB', borderRight: 'none', borderBottom: 'none' }}
        >
          {calDays.map((day, idx) => {
            const dateStr      = fmtISO(day)
            const isCurrentMo  = day.getMonth() === currentMonth
            const isToday      = dateStr === todayStr
            const isLaunchDay  = dateStr === launchDateStr && isCurrentMo
            const isSelected   = dateStr === selectedDate
            const dayTasks     = tasksByDate[dateStr] ?? []
            const visibleTasks = dayTasks.slice(0, 3)
            const overflow     = dayTasks.length - visibleTasks.length

            let cellBg = 'white'
            if (isToday)      cellBg = '#FFFBEB'
            else if (isLaunchDay) cellBg = '#F0FDF4'
            else if (isSelected)  cellBg = '#FFF8F0'

            const boxShadow = isToday
              ? 'inset 0 0 0 2px #E9A020'
              : isSelected
              ? 'inset 0 0 0 1px #F6D38A'
              : 'none'

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(dateStr)}
                style={{
                  minHeight: 90,
                  borderRight: '0.5px solid #E5E7EB',
                  borderBottom: '0.5px solid #E5E7EB',
                  background: cellBg,
                  boxShadow,
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'background 0.1s',
                }}
                className="hover:brightness-[0.97]"
              >
                {/* Date number */}
                <div
                  className="text-[11px] font-semibold mb-0.5"
                  style={{
                    color: !isCurrentMo ? '#C4B9AF' : isToday ? '#E9A020' : '#1E2D3D',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {day.getDate()}
                </div>

                {/* Launch badge */}
                {isLaunchDay && (
                  <div
                    className="text-[9px] font-bold px-1 py-0.5 rounded mb-0.5 inline-block"
                    style={{ background: '#D1FAE5', color: '#065F46', fontFamily: 'var(--font-sans)' }}
                  >
                    Launch
                  </div>
                )}

                {/* Task chips */}
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {visibleTasks.map(task => {
                    const isDone    = task.status === 'done'
                    const taskDate  = toLocalDate(task.dueDate)
                    const isOverdue = !isDone && taskDate < todayMid
                    const chip      = CHANNEL_CHIP[task.channel] ?? CHANNEL_CHIP.General

                    let bg        = chip.bg
                    let textColor = chip.text
                    if (isDone)        { bg = '#D1FAE5'; textColor = '#065F46' }
                    else if (isOverdue){ bg = '#FEE2E2'; textColor = '#991B1B' }

                    return (
                      <div
                        key={task.id}
                        title={task.name}
                        className="text-[9px] font-medium px-1 py-0.5 rounded truncate"
                        style={{
                          background: bg,
                          color: textColor,
                          textDecoration: isDone ? 'line-through' : 'none',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {task.name}
                      </div>
                    )
                  })}
                  {overflow > 0 && (
                    <div
                      className="text-[9px] font-medium"
                      style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}
                    >
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Day detail panel */}
        {selectedDate && selectedDateObj && (
          <DayDetailPanel
            date={selectedDateObj}
            tasks={selectedTasks}
            onComplete={onComplete}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>

      {/* Subscribe modal */}
      {showSubscribe && (
        <SubscribeModal token={calendarToken} onClose={() => setShowSubscribe(false)} />
      )}
    </div>
  )
}
