'use client'
// app/dashboard/launch/LaunchClient.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Pencil } from 'lucide-react'
import { BoutiqueChannelPageLayout, BoutiquePageHeader, BoutiqueStatusChip } from '@/components/boutique'
import { LaunchCalendar } from '@/components/launch/LaunchCalendar'

// ── Types ──────────────────────────────────────────────────────────────────────
interface LaunchTask {
  id: string
  userId: string
  bookId: string | null
  templateId: string | null
  name: string
  channel: string
  phase: string
  dueDate: string
  status: string
  actionType: string | null
  actionPrompt: string | null
  createdAt: string
  updatedAt: string
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastCheckInDate: string | null
  totalCheckIns: number
  freezesAvailable: number
}

interface StreakEvent {
  id: string
  date: string
  actionType: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(date: Date): string {
  return date.toISOString().split('T')[0]
}

function toLocalDate(isoStr: string): Date {
  const d = new Date(isoStr)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function formatDate(isoStr: string): string {
  const d = toLocalDate(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShort(isoStr: string): string {
  const d = toLocalDate(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

function getWeekDays(): Date[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, visible, variant = 'navy' }: { message: string; visible: boolean; variant?: 'navy' | 'amber' }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, pointerEvents: 'none', transform: `translateX(-50%) translateY(${visible ? 0 : 8}px)` }}
    >
      {variant === 'amber' ? (
        <div className="text-white shadow-lg font-medium rounded-full" style={{ fontSize: '12px', padding: '8px 16px', background: '#E9A020' }}>
          {message}
        </div>
      ) : (
        <div className="bg-[#1E2D3D] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg font-medium">
          {message}
        </div>
      )}
    </div>
  )
}

// ── Streak widget ──────────────────────────────────────────────────────────────
function StreakWidget({ streak, events }: { streak: StreakData; events: StreakEvent[] }) {
  const weekDays = getWeekDays()
  const today = new Date()
  const todayStr = fmt(today)
  const eventDates = new Set(events.map(e => fmt(toLocalDate(e.date))))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: '#D97706', lineHeight: 1 }}>
          {streak.currentStreak}
        </span>
        <span className="text-sm font-semibold text-gray-500">day streak</span>
        {streak.longestStreak > 0 && (
          <span className="ml-auto text-xs text-gray-400">Best: {streak.longestStreak}</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {weekDays.map((day, i) => {
          const dStr = fmt(day)
          const hasEvent = eventDates.has(dStr)
          const isToday = dStr === todayStr
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>
                {DAY_LABELS[i]}
              </span>
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: hasEvent ? '#D97706' : 'transparent',
                  border: hasEvent ? 'none' : isToday ? '2px solid #D97706' : '1.5px solid #E8E1D3',
                  transition: 'all 0.15s ease', flexShrink: 0,
                }}
                title={`${DAY_LABELS[i]} ${day.getDate()}`}
              />
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400">Any completed task counts toward your streak</p>
    </div>
  )
}

// ── Launch record type ─────────────────────────────────────────────────────────
interface LaunchRecord {
  id: string
  bookTitle: string
  asin: string | null
  phase: string
  customPhase: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  status: string
  createdAt: string
  updatedAt: string
}

const PHASE_OPTIONS = ['Pre-order', 'Launch Week', 'Evergreen', 'Custom']

function phaseColor(phase: string): { bg: string; color: string } {
  if (phase === 'Pre-order')   return { bg: '#EFF6FF', color: '#1E40AF' }
  if (phase === 'Launch Week') return { bg: '#F0FFF4', color: '#166534' }
  if (phase === 'Evergreen')   return { bg: '#F5F3FF', color: '#6B21A8' }
  return { bg: '#F3F4F6', color: '#4B5563' }
}

// ── Inline edit helpers ────────────────────────────────────────────────────────
function InlineTextField({
  value, onSave, placeholder, className: extraClass, style,
}: {
  value: string
  onSave: (val: string) => void | Promise<void>
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  async function commit() {
    const t = draft.trim()
    setEditing(false)
    if (t !== value) await onSave(t)
  }

  const fieldStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', ...style }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); void commit() }
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        className={`font-semibold text-[13px] bg-transparent border-b outline-none w-full ${extraClass ?? ''}`}
        style={{ ...fieldStyle, borderColor: '#E9A020' }}
        placeholder={placeholder}
      />
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 group/ifield cursor-text ${extraClass ?? ''}`}
      style={fieldStyle}
      onClick={() => { setEditing(true); setDraft(value) }}
    >
      <span className="font-semibold text-[13px]">
        {value || <span style={{ color: '#9CA3AF' }}>{placeholder ?? 'Click to edit'}</span>}
      </span>
      <Pencil size={10} className="opacity-0 group-hover/ifield:opacity-50 transition-opacity shrink-0" style={{ color: '#9CA3AF' }} />
    </span>
  )
}

function InlineDateField({ value, onSave }: { value: string | null; onSave: (val: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const display = value
    ? toLocalDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Set date'

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        defaultValue={value ? value.slice(0, 10) : ''}
        onBlur={async e => { if (e.target.value) await onSave(e.target.value); setEditing(false) }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="text-[11px] bg-transparent outline-none border-b"
        style={{ borderColor: '#E9A020', color: '#6B7280', fontFamily: 'var(--font-sans)' }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 group/idate cursor-pointer text-[11px] text-gray-400 hidden sm:inline-flex"
      onClick={() => setEditing(true)}
    >
      {display}
      <Pencil size={9} className="opacity-0 group-hover/idate:opacity-50 transition-opacity shrink-0" style={{ color: '#9CA3AF' }} />
    </span>
  )
}

function InlinePhaseSelect({ value, onSave }: { value: string; onSave: (val: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const pc = phaseColor(value)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value}
        onBlur={async e => { await onSave(e.target.value); setEditing(false) }}
        onChange={async e => { await onSave(e.target.value); setEditing(false) }}
        className="text-[10px] font-bold px-2 py-0.5 rounded-full outline-none cursor-pointer"
        style={{ background: pc.bg, color: pc.color, border: 'none', fontFamily: 'var(--font-sans)' }}
      >
        {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    )
  }
  const tone = value === 'Launch Week' ? 'green' : value === 'Evergreen' ? 'plum' : value === 'Pre-order' ? 'amber' : 'coral'
  return (
    <span className="inline-flex items-center gap-1 group/iphase cursor-pointer" onClick={() => setEditing(true)}>
      <BoutiqueStatusChip tone={tone as 'green' | 'amber' | 'plum' | 'coral'} label={value} />
      <Pencil size={8} className="opacity-0 group-hover/iphase:opacity-60 transition-opacity shrink-0" style={{ color: '#9CA3AF' }} />
    </span>
  )
}

function LaunchRow({ launch, onDelete }: { launch: LaunchRecord; onDelete: (id: string) => void }) {
  const [data, setData] = useState(launch)

  async function patch(updates: Partial<LaunchRecord>) {
    const res = await fetch(`/api/launches/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      const { launch: updated } = await res.json()
      setData(prev => ({ ...prev, ...updated }))
    }
  }

  const displayPhase = data.phase === 'Custom' && data.customPhase ? data.customPhase : data.phase

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <InlineTextField value={data.bookTitle} onSave={title => patch({ bookTitle: title })} style={{ color: '#1E2D3D' }} />
      </div>
      <InlinePhaseSelect value={displayPhase} onSave={phase => patch({ phase })} />
      <InlineDateField value={data.startDate} onSave={date => patch({ startDate: date })} />
      <button
        onClick={() => onDelete(data.id)}
        className="text-gray-300 hover:text-red-400 transition-colors ml-1 text-[16px] leading-none"
        title="Delete launch"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
      >
        ×
      </button>
    </div>
  )
}

// ── Launches panel ─────────────────────────────────────────────────────────────
function deriveLaunchPhase(launchDateIso: string): string {
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const launchMid = toLocalDate(launchDateIso)
  const days = Math.round((launchMid.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24))
  if (days > 7) return 'Pre-order'
  if (days >= 0) return 'Launch Week'
  return 'Post-Launch'
}

function LaunchesPanel({ initialLaunches, activeLaunch, onActiveLaunchTitleChange, onActiveLaunchDateChange }: {
  initialLaunches: LaunchRecord[]
  activeLaunch?: { launchDate: string; bookTitle: string | null } | null
  onActiveLaunchTitleChange?: (title: string) => void
  onActiveLaunchDateChange?: (date: string) => Promise<void>
}) {
  const [launches, setLaunches] = useState<LaunchRecord[]>(initialLaunches)
  const [showAdd, setShowAdd]   = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState('Pre-order')
  const [newStart, setNewStart] = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookTitle: newTitle.trim(), phase: newPhase, startDate: newStart || null }),
      })
      if (res.ok) {
        const { launch } = await res.json()
        setLaunches(prev => [launch, ...prev])
        setShowAdd(false); setNewTitle(''); setNewStart(''); setNewPhase('Pre-order')
      }
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/launches/${id}`, { method: 'DELETE' })
    setLaunches(prev => prev.filter(l => l.id !== id))
  }

  const inp: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px',
    fontSize: 12, fontFamily: 'var(--font-sans)',
    outline: 'none', background: '#FAFAFA', color: '#1E2D3D', width: '100%',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[14px] m-0" style={{ color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}>
          My Launches
        </h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#FFF4E0', color: '#E9A020', border: '1px solid #F6D38A' }}
          >
            + Plan next launch
          </button>
        )}
      </div>

      {!activeLaunch && launches.length === 0 && !showAdd && (
        <p className="text-[12px] text-gray-400 mb-0">No launches yet — plan one to get started.</p>
      )}

      <div className="flex flex-col gap-2">
        {activeLaunch && (() => {
          const phase = deriveLaunchPhase(activeLaunch.launchDate)
          return (
            <div className="flex items-center gap-2 py-2 border-b border-gray-50">
              <div className="flex-1 min-w-0">
                <InlineTextField
                  value={activeLaunch.bookTitle ?? ''}
                  placeholder="Untitled launch"
                  onSave={title => onActiveLaunchTitleChange?.(title)}
                  style={{ color: '#1E2D3D' }}
                />
              </div>
              <BoutiqueStatusChip
                tone={phase === 'Launch Week' ? 'green' : phase === 'Post-Launch' ? 'coral' : 'amber'}
                label={phase}
              />
              <InlineDateField
                value={activeLaunch.launchDate}
                onSave={async date => { await onActiveLaunchDateChange?.(date) }}
              />
              <a
                href="#launch-tasks"
                className="text-gray-300 hover:text-amber-400 transition-colors text-[13px] leading-none shrink-0"
                style={{ textDecoration: 'none' }}
                title="Jump to tasks"
              >
                ↓
              </a>
            </div>
          )
        })()}

        {launches.map(l => (
          <LaunchRow key={l.id} launch={l} onDelete={handleDelete} />
        ))}
      </div>

      {showAdd && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <input
              autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Book title" style={inp}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
            />
            <div className="flex gap-2">
              <select value={newPhase} onChange={e => setNewPhase(e.target.value)} style={{ ...inp, cursor: 'pointer', flex: 1 }}>
                {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ ...inp, flex: 1 }} title="Start date (optional)" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd} disabled={!newTitle.trim() || saving}
                className="text-[12px] font-bold px-4 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewTitle(''); setNewStart(''); setNewPhase('Pre-order') }}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Setup card ─────────────────────────────────────────────────────────────────
function SetupCard({ onSetup }: { onSetup: (launchDate: string, bookTitle: string) => void }) {
  const [bookTitle, setBookTitle] = useState('')
  const [launchDate, setLaunchDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!launchDate) return
    setLoading(true)
    try {
      const res = await fetch('/api/launch/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launchDate, bookTitle }),
      })
      if (res.ok) onSetup(launchDate, bookTitle)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFF8F0' }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}>
            When does your book launch?
          </h1>
          <p className="text-sm text-gray-500">
            Enter your launch date and we'll generate a complete marketing plan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Book title <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)}
              placeholder="e.g. The Midnight Garden"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Launch date <span className="text-red-400">*</span></label>
            <input
              type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} required
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <button
            type="submit" disabled={loading || !launchDate}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: '#E9A020', color: '#1E2D3D' }}
          >
            {loading ? 'Generating plan…' : 'Generate my launch plan →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main client component ──────────────────────────────────────────────────────
interface LaunchClientProps {
  initialTasks: LaunchTask[]
  initialLaunchDate: string | null
  initialBookTitle: string | null
  initialLaunches: LaunchRecord[]
  calendarToken: string
}

export function LaunchClient({ initialTasks, initialLaunchDate, initialBookTitle, initialLaunches, calendarToken }: LaunchClientProps) {
  const [tasks,      setTasks]      = useState<LaunchTask[]>(initialTasks)
  const [launchDate, setLaunchDate] = useState<string | null>(initialLaunchDate)
  const [bookTitle,  setBookTitle]  = useState<string | null>(initialBookTitle)
  const [streak,     setStreak]     = useState<StreakData | null>(null)
  const [streakEvents, setStreakEvents] = useState<StreakEvent[]>([])
  const [toast, setToast] = useState({ message: '', visible: false, variant: 'navy' as 'navy' | 'amber' })
  const [showChangeDate, setShowChangeDate] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, variant: 'navy' | 'amber' = 'navy') => {
    setToast({ message, visible: true, variant })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }))
    }, 3000)
  }, [])

  const handleActiveLaunchTitleChange = useCallback((title: string) => {
    setBookTitle(title || null)
  }, [])

  // Restore bookTitle from localStorage on mount
  useEffect(() => {
    if (!bookTitle) {
      const savedTitle = localStorage.getItem('launch_book_title')
      if (savedTitle) setBookTitle(savedTitle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist bookTitle to localStorage
  useEffect(() => {
    if (bookTitle) localStorage.setItem('launch_book_title', bookTitle)
    else localStorage.removeItem('launch_book_title')
  }, [bookTitle])

  // Load streak on mount
  useEffect(() => {
    fetch('/api/streak')
      .then(r => r.json())
      .then(data => {
        if (data.streak) setStreak(data.streak)
        if (data.recentEvents) setStreakEvents(data.recentEvents)
      })
      .catch(() => {})
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/launch/tasks?filter=all')
      if (res.ok) {
        const { tasks: newTasks } = await res.json()
        setTasks(newTasks)
      }
    } catch {}
  }, [])

  const handleActiveLaunchDateChange = useCallback(async (date: string) => {
    const res = await fetch('/api/launch/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ launchDate: date, bookTitle }),
    })
    if (res.ok) {
      setLaunchDate(date)
      await loadTasks()
    }
  }, [bookTitle, loadTasks])

  const handleSetup = async (date: string, title: string) => {
    setLaunchDate(date)
    setBookTitle(title || null)
    await loadTasks()
  }

  const handleComplete = async (taskId: string) => {
    const res = await fetch(`/api/launch/tasks/${taskId}/complete`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done', updatedAt: new Date().toISOString() } : t))
      if (data.streak) setStreak(data.streak)
      fetch('/api/streak')
        .then(r => r.json())
        .then(d => { if (d.recentEvents) setStreakEvents(d.recentEvents) })
        .catch(() => {})
      showToast('Task done! Keep the streak going.')
    }
  }

  if (!launchDate) {
    return <SetupCard onSetup={handleSetup} />
  }

  // ── Compute launch countdown ───────────────────────────────────────────────
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const launchMid = toLocalDate(launchDate)
  const daysToLaunch = daysBetween(todayMid, launchMid)

  let countdownLabel: string
  if (daysToLaunch === 0) countdownLabel = '🚀 Launch day!'
  else if (daysToLaunch > 0) countdownLabel = `${daysToLaunch} days to launch`
  else countdownLabel = `${Math.abs(daysToLaunch)} days since launch`

  // ── Progress ───────────────────────────────────────────────────────────────
  const totalVisible = tasks.length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const progressPct = totalVisible > 0 ? Math.round((doneCount / totalVisible) * 100) : 0

  return (
    <BoutiqueChannelPageLayout>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />
      <BoutiquePageHeader
        title="Launch Planner"
        subtitle="Book launches"
        badge="Launch"
        badgeColor="#8B5CF6"
      />

      <div className="max-w-3xl mx-auto space-y-4">

        {/* Launches panel */}
        <LaunchesPanel
          initialLaunches={initialLaunches}
          activeLaunch={launchDate ? { launchDate, bookTitle } : null}
          onActiveLaunchTitleChange={handleActiveLaunchTitleChange}
          onActiveLaunchDateChange={handleActiveLaunchDateChange}
        />

        {/* Active launch banner */}
        <div id="launch-tasks" className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 flex-wrap shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {bookTitle && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                style={{ background: '#FFF4E0', color: '#E9A020' }}>
                {bookTitle}
              </span>
            )}
            <span className="text-sm text-gray-500">launches</span>
            <span className="text-sm font-semibold text-gray-700">{formatDate(launchDate)}</span>
          </div>

          <div className="flex-1 flex justify-center">
            <span className="text-xl font-bold" style={{ color: '#1E2D3D' }}>{countdownLabel}</span>
          </div>

          <button
            onClick={() => setShowChangeDate(d => !d)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            Change date
          </button>
        </div>

        {/* Change date form */}
        {showChangeDate && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-600 mb-3">Set a new launch date</p>
            <p className="text-xs text-red-500 mb-3">This will replace all current tasks.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const newDate = (form.elements.namedItem('newDate') as HTMLInputElement).value
                const newTitle = (form.elements.namedItem('newTitle') as HTMLInputElement).value
                if (!newDate) return
                const res = await fetch('/api/launch/setup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ launchDate: newDate, bookTitle: newTitle }),
                })
                if (res.ok) {
                  setLaunchDate(newDate)
                  setBookTitle(newTitle || null)
                  setShowChangeDate(false)
                  await loadTasks()
                }
              }}
              className="flex flex-wrap gap-2"
            >
              <input name="newTitle" type="text" defaultValue={bookTitle ?? ''} placeholder="Book title (optional)"
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-amber-400 flex-1 min-w-[180px]" />
              <input name="newDate" type="date" defaultValue={launchDate.split('T')[0]} required
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-amber-400" />
              <button type="submit" className="text-sm px-4 py-2 rounded-lg font-semibold transition-all"
                style={{ background: '#E9A020', color: '#1E2D3D' }}>
                Update
              </button>
            </form>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">{doneCount} of {totalVisible} tasks complete</span>
          <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#F3EDE3' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#D97706' }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: '#9CA3AF' }}>
            {progressPct}%
          </span>
        </div>

        {/* Calendar */}
        <LaunchCalendar
          tasks={tasks}
          launches={initialLaunches}
          launchDate={launchDate}
          onComplete={handleComplete}
          calendarToken={calendarToken}
        />

        {/* Streak widget */}
        {streak && (
          <StreakWidget streak={streak} events={streakEvents} />
        )}

      </div>
    </BoutiqueChannelPageLayout>
  )
}
