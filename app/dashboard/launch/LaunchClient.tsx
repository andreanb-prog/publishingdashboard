'use client'
// app/dashboard/launch/LaunchClient.tsx
import { useState, useEffect, useCallback, useRef } from 'react'

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
  // Parse using UTC components to avoid midnight-UTC dates shifting back one day
  // in timezones behind UTC (e.g. US Eastern).
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
  const day = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7)) // shift so Mon=0
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Channel colors — using hex to avoid Tailwind purging dynamically-composed class names
// (the custom `sky` override in tailwind.config.js clobbers the sky scale)
const CHANNEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Ads:     { bg: '#EFF6FF', text: '#1E40AF', dot: '#60A5FA' },
  Email:   { bg: '#DCFCE7', text: '#166534', dot: '#6EBF8B' },
  Creative:{ bg: '#F3E8FF', text: '#6B21A8', dot: '#A78BFA' },
  Social:  { bg: '#DCFCE7', text: '#166534', dot: '#86EFAC' },
  General: { bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
}

function channelStyle(channel: string) {
  return CHANNEL_COLORS[channel] ?? CHANNEL_COLORS.General
}

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

// ── Channel pill ───────────────────────────────────────────────────────────────
function ChannelPill({ channel }: { channel: string }) {
  const s = channelStyle(channel)
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {channel}
    </span>
  )
}

// ── Phase offset label ─────────────────────────────────────────────────────────
function PhaseLabel({ dueDate, launchDate }: { dueDate: string; launchDate: string }) {
  const due = toLocalDate(dueDate)
  const launch = toLocalDate(launchDate)
  const diff = daysBetween(launch, due)
  const label = diff < 0 ? `${diff}d` : diff === 0 ? 'Launch' : `+${diff}d`
  return (
    <span className="text-[11px] text-gray-400 tabular-nums">{label}</span>
  )
}

// ── Action button ──────────────────────────────────────────────────────────────
function ActionButton({ actionType, actionPrompt, launchDate, bookTitle, daysToLaunch, phase, adTasks, onCopy }: {
  actionType: string
  actionPrompt: string
  launchDate: string
  bookTitle: string | null
  daysToLaunch: number
  phase: string
  adTasks: LaunchTask[]
  onCopy: (msg: string) => void
}) {
  const labels: Record<string, string> = { copy: 'Copy ↗', brief: 'Brief ↗', review: 'Review ↗' }
  const label = labels[actionType] ?? 'Action ↗'

  const handleClick = async () => {
    const title = bookTitle ?? 'my book'
    const launchFormatted = toLocalDate(launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const daysLabel = daysToLaunch > 0
      ? `${daysToLaunch} days out`
      : daysToLaunch === 0
      ? 'launch day'
      : `${Math.abs(daysToLaunch)} days post-launch`

    let prompt: string

    if (actionType === 'review') {
      const adLines = adTasks.length > 0
        ? adTasks.map(t => `${t.name} (${t.status.replace(/_/g, ' ')})`).join(' | ')
        : null
      if (adLines) {
        prompt = `I'm running Meta ads for ${title} launching ${launchFormatted} — ${daysLabel}. Here are my current ad tasks: ${adLines}. Tell me which to kill (under 1% CTR), which to scale, and what copy angle to test next.`
      } else {
        prompt = `I'm launching ${title} on ${launchFormatted} — ${daysLabel}. I'm in the ${phase} phase and haven't started running ads yet. Help me plan my Meta ads strategy: what copy angles to test, what audience targeting to use, and what budget to allocate.`
      }
    } else if (actionType === 'copy') {
      prompt = `Write pre-order ad copy for ${title}. Launch date: ${launchFormatted} — ${daysLabel}. We're in the ${phase} phase. Use the emotional/tension angle — lead with feeling, not trope lists. Write 3 caption variants with headline and link description for each.`
    } else if (actionType === 'brief') {
      prompt = `Give me a Canva creative brief for ${title} — ${phase} phase, ${daysLabel}. I need 4 static image variants sized for Meta feed (1080x1080) and stories (1080x1920). Describe the visual direction, text overlay, and mood for each. The winning angle should be emotional/tension-driven.`
    } else {
      // Fallback: resolve placeholders in the stored prompt
      prompt = (actionPrompt ?? '')
        .replace(/\[BOOK_TITLE\]/g, title)
        .replace(/\[LAUNCH_DATE\]/g, launchFormatted)
    }

    await navigator.clipboard.writeText(prompt)
    window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer')
    onCopy('Prompt copied — paste it into Claude to get started')
  }

  return (
    <button
      onClick={handleClick}
      className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  )
}

// ── Task row ───────────────────────────────────────────────────────────────────
function TaskRow({
  task,
  launchDate,
  bookTitle,
  daysToLaunch,
  adTasks,
  isOverdue,
  onComplete,
  onCopy,
}: {
  task: LaunchTask
  launchDate: string
  bookTitle: string | null
  daysToLaunch: number
  adTasks: LaunchTask[]
  isOverdue: boolean
  onComplete: (id: string) => void
  onCopy: (msg: string) => void
}) {
  const isDone = task.status === 'done'
  const [loading, setLoading] = useState(false)

  const handleCheck = async () => {
    if (isDone || loading) return
    setLoading(true)
    await onComplete(task.id)
    setLoading(false)
  }

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group
        ${isOverdue && !isDone ? 'border-l-2 pl-2.5' : ''}`}
      style={isOverdue && !isDone ? { borderColor: '#E9A020' } : undefined}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheck}
        disabled={loading}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
          ${isDone
            ? 'bg-amber-400 border-amber-400'
            : 'border-gray-300 hover:border-amber-400'
          }`}
        aria-label={isDone ? 'Done' : 'Mark done'}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <polyline points="1,4 3.5,6.5 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {loading && (
          <div className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        )}
      </button>

      {/* Task name */}
      <span className={`flex-1 text-sm text-[#1E2D3D] ${isDone ? 'line-through opacity-50' : ''}`}>
        {task.name}
      </span>

      {/* Phase offset */}
      <PhaseLabel dueDate={task.dueDate} launchDate={launchDate} />

      {/* Channel pill */}
      <ChannelPill channel={task.channel} />

      {/* Due date */}
      <span className="text-[11px] text-gray-400 hidden sm:block">{formatShort(task.dueDate)}</span>

      {/* Action button */}
      {task.actionType && task.actionPrompt && !isDone && (
        <ActionButton
          actionType={task.actionType}
          actionPrompt={task.actionPrompt}
          launchDate={launchDate}
          bookTitle={bookTitle}
          daysToLaunch={daysToLaunch}
          phase={task.phase}
          adTasks={adTasks}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}

// ── Task section ───────────────────────────────────────────────────────────────
function TaskSection({
  title,
  tasks,
  launchDate,
  bookTitle,
  daysToLaunch,
  adTasks,
  isOverdue,
  onComplete,
  onCopy,
}: {
  title: string
  tasks: LaunchTask[]
  launchDate: string
  bookTitle: string | null
  daysToLaunch: number
  adTasks: LaunchTask[]
  isOverdue?: boolean
  onComplete: (id: string) => void
  onCopy: (msg: string) => void
}) {
  const [collapsed, setCollapsed] = useState(isOverdue ?? false)
  if (tasks.length === 0) return null

  return (
    <div className="mb-4">
      {isOverdue ? (
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-1.5 text-sm font-semibold mb-2 hover:opacity-80 transition-opacity" style={{ color: '#E9A020' }}
        >
          <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} to catch up on
        </button>
      ) : (
        <div className="text-xs font-bold tracking-wide uppercase text-gray-400 mb-2 px-3">{title}</div>
      )}
      {!collapsed && (
        <div>
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              launchDate={launchDate}
              bookTitle={bookTitle}
              daysToLaunch={daysToLaunch}
              adTasks={adTasks}
              isOverdue={isOverdue ?? false}
              onComplete={onComplete}
              onCopy={onCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add task inline form ───────────────────────────────────────────────────────
function AddTaskForm({ onAdd }: { onAdd: (task: LaunchTask) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('General')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !dueDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/launch/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), channel, phase: 'launch', dueDate }),
      })
      if (res.ok) {
        const { task } = await res.json()
        onAdd(task)
        setName('')
        setDueDate('')
        setOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors mt-2"
      >
        <span>+</span> Add task
      </button>
    )
  }

  return (
    <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Task name"
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white mb-2 outline-none focus:border-amber-400"
      />
      <div className="flex gap-2 mb-2">
        <select
          value={channel}
          onChange={e => setChannel(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-amber-400 flex-1"
        >
          <option>General</option>
          <option>Ads</option>
          <option>Email</option>
          <option>Creative</option>
          <option>Social</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-amber-400 flex-1"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !dueDate}
          className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ background: '#E9A020', color: '#1E2D3D' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm px-4 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Week strip ─────────────────────────────────────────────────────────────────
function WeekStrip({ tasks }: { tasks: LaunchTask[] }) {
  const weekDays = getWeekDays()
  const today = new Date()
  const todayStr = fmt(today)

  // Build map of date → channels with tasks
  const tasksByDate: Record<string, Set<string>> = {}
  for (const task of tasks) {
    const d = fmt(toLocalDate(task.dueDate))
    if (!tasksByDate[d]) tasksByDate[d] = new Set()
    tasksByDate[d].add(task.channel)
  }

  return (
    <div className="flex items-stretch gap-1">
      {weekDays.map((day, i) => {
        const dStr = fmt(day)
        const isToday = dStr === todayStr
        const channels = tasksByDate[dStr] ? Array.from(tasksByDate[dStr]) : []
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">{DAY_LABELS[i]}</span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all
                ${isToday ? 'text-white' : 'text-gray-600'}`}
              style={isToday ? { background: '#1E2D3D' } : {}}
            >
              {day.getDate()}
            </div>
            <div className="flex flex-wrap justify-center gap-0.5 min-h-[10px]">
              {channels.slice(0, 3).map(ch => (
                <div
                  key={ch}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: channelStyle(ch).dot }}
                  title={ch}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Streak widget ──────────────────────────────────────────────────────────────
function StreakWidget({ streak, events }: { streak: StreakData; events: StreakEvent[] }) {
  const weekDays = getWeekDays()
  const today = new Date()
  const todayStr = fmt(today)

  // Build set of dates with events
  const eventDates = new Set(events.map(e => fmt(toLocalDate(e.date))))

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔥</span>
        <span className="text-lg font-bold" style={{ color: '#E9A020' }}>
          {streak.currentStreak}
        </span>
        <span className="text-sm font-semibold text-gray-500">day streak</span>
        {streak.longestStreak > 0 && (
          <span className="ml-auto text-xs text-gray-400">Best: {streak.longestStreak}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {weekDays.map((day, i) => {
          const dStr = fmt(day)
          const hasEvent = eventDates.has(dStr)
          const isToday = dStr === todayStr
          const isPast = day < today && !isToday
          return (
            <div
              key={i}
              className={`flex-1 h-5 rounded-full transition-all
                ${hasEvent
                  ? ''
                  : isToday
                  ? 'border-2 border-dashed border-amber-300'
                  : isPast ? 'bg-gray-100' : 'bg-gray-50 border border-gray-200'
                }`}
              style={hasEvent ? { background: '#E9A020' } : {}}
              title={`${DAY_LABELS[i]} ${day.getDate()}`}
            />
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

// ── Launches panel ─────────────────────────────────────────────────────────────
function LaunchesPanel({ initialLaunches }: { initialLaunches: LaunchRecord[] }) {
  const [launches, setLaunches]   = useState<LaunchRecord[]>(initialLaunches)
  const [showAdd,  setShowAdd]    = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const [newPhase, setNewPhase]   = useState('Pre-order')
  const [newStart, setNewStart]   = useState('')
  const [saving,   setSaving]     = useState(false)

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
        setShowAdd(false)
        setNewTitle('')
        setNewStart('')
        setNewPhase('Pre-order')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/launches/${id}`, { method: 'DELETE' })
    setLaunches(prev => prev.filter(l => l.id !== id))
  }

  const inp: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px',
    fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none', background: '#FAFAFA', color: '#1E2D3D', width: '100%',
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[14px] m-0" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Launches
        </h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: '#FFF4E0', color: '#E9A020', border: '1px solid #F6D38A' }}
          >
            + Add launch
          </button>
        )}
      </div>

      {launches.length === 0 && !showAdd && (
        <p className="text-[12px] text-gray-400 mb-0">
          No launches yet — add one to use it in the Campaign Organizer.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {launches.map(l => {
          const pc = phaseColor(l.phase)
          const displayPhase = l.phase === 'Custom' && l.customPhase ? l.customPhase : l.phase
          return (
            <div key={l.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <span className="font-semibold text-[13px] flex-1" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {l.bookTitle}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.color }}>
                {displayPhase}
              </span>
              {l.startDate && (
                <span className="text-[11px] text-gray-400 hidden sm:block">
                  {new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              <button
                onClick={() => handleDelete(l.id)}
                className="text-gray-300 hover:text-red-400 transition-colors ml-1 text-[16px] leading-none"
                title="Delete launch"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Book title"
              style={inp}
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
            />
            <div className="flex gap-2">
              <select value={newPhase} onChange={e => setNewPhase(e.target.value)} style={{ ...inp, cursor: 'pointer', flex: 1 }}>
                {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="date"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                style={{ ...inp, flex: 1 }}
                title="Start date (optional)"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || saving}
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
      if (res.ok) {
        onSetup(launchDate, bookTitle)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFF8F0' }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl mb-3">🚀</div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="e.g. The Midnight Garden"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Launch date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={launchDate}
              onChange={e => setLaunchDate(e.target.value)}
              required
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !launchDate}
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
}

export function LaunchClient({ initialTasks, initialLaunchDate, initialBookTitle, initialLaunches }: LaunchClientProps) {
  const [tasks, setTasks] = useState<LaunchTask[]>(initialTasks)
  const [launchDate, setLaunchDate] = useState<string | null>(initialLaunchDate)
  const [bookTitle, setBookTitle] = useState<string | null>(initialBookTitle)
  const [activeFilter, setActiveFilter] = useState<string>('this_week')
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [streakEvents, setStreakEvents] = useState<StreakEvent[]>([])
  const [toast, setToast] = useState({ message: '', visible: false, variant: 'navy' as 'navy' | 'amber' })
  const [showChangeDate, setShowChangeDate] = useState(false)
  const [channelFilter, setChannelFilter] = useState<string>('All')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, variant: 'navy' | 'amber' = 'navy') => {
    setToast({ message, visible: true, variant })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }))
    }, 3000)
  }, [])

  const showPromptCopiedToast = useCallback((msg: string) => {
    showToast(msg, 'amber')
  }, [showToast])

  // Restore channelFilter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('launch_channel_filter')
    if (saved) setChannelFilter(saved)
  }, [])

  // Persist channelFilter to localStorage
  useEffect(() => {
    localStorage.setItem('launch_channel_filter', channelFilter)
  }, [channelFilter])

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

  // Refresh tasks when filter changes (after setup)
  const loadTasks = useCallback(async (filter: string) => {
    try {
      const res = await fetch(`/api/launch/tasks?filter=${filter}`)
      if (res.ok) {
        const { tasks: newTasks } = await res.json()
        setTasks(newTasks)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (launchDate) {
      loadTasks(activeFilter)
    }
  }, [activeFilter, launchDate, loadTasks])

  const handleSetup = async (date: string, title: string) => {
    setLaunchDate(date)
    setBookTitle(title || null)
    await loadTasks(activeFilter)
  }

  const handleComplete = async (taskId: string) => {
    const res = await fetch(`/api/launch/tasks/${taskId}/complete`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done', updatedAt: new Date().toISOString() } : t))
      if (data.streak) setStreak(data.streak)
      // Reload streak events
      fetch('/api/streak')
        .then(r => r.json())
        .then(d => { if (d.recentEvents) setStreakEvents(d.recentEvents) })
        .catch(() => {})
      showToast('Task done! Keep the streak going.')
    }
  }

  const handleAddTask = (task: LaunchTask) => {
    setTasks(prev => [...prev, task])
  }

  if (!launchDate) {
    return <SetupCard onSetup={handleSetup} />
  }

  // ── Compute launch countdown ─────────────────────────────────────────────────
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const launchMid = toLocalDate(launchDate)
  const daysToLaunch = daysBetween(todayMid, launchMid)

  let countdownLabel: string
  if (daysToLaunch === 0) countdownLabel = '🚀 Launch day!'
  else if (daysToLaunch > 0) countdownLabel = `${daysToLaunch} days to launch`
  else countdownLabel = `${Math.abs(daysToLaunch)} days since launch`

  // ── Apply channel filter ──────────────────────────────────────────────────────
  const filteredTasks = channelFilter === 'All' ? tasks : tasks.filter(t => t.channel === channelFilter)

  // ── Split tasks into sections for This Week view ─────────────────────────────
  const todayStr = fmt(todayMid)
  const weekEndDate = new Date(todayMid)
  weekEndDate.setDate(weekEndDate.getDate() + 7)

  const overdueTasks: LaunchTask[] = []
  const todayTasks: LaunchTask[] = []
  const thisWeekTasks: LaunchTask[] = []
  const upcomingTasks: LaunchTask[] = []

  for (const task of filteredTasks) {
    if (task.status === 'done' || task.status === 'skipped') continue
    const due = toLocalDate(task.dueDate)
    const dueStr = fmt(due)

    if (due < todayMid) {
      overdueTasks.push(task)
    } else if (dueStr === todayStr) {
      todayTasks.push(task)
    } else if (due <= weekEndDate) {
      thisWeekTasks.push(task)
    } else {
      upcomingTasks.push(task)
    }
  }

  // ── Ads tasks (for context-aware review prompts) ─────────────────────────────
  const adTasks = tasks.filter(t => t.channel === 'Ads')

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const totalVisible = tasks.length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const progressPct = totalVisible > 0 ? Math.round((doneCount / totalVisible) * 100) : 0

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'all',         label: 'All' },
    { id: 'this_week',   label: 'This Week' },
    { id: 'pre-order',   label: 'Pre-order' },
    { id: 'launch',      label: 'Launch' },
    { id: 'post-launch', label: 'Post-launch' },
    { id: 'evergreen',   label: 'Evergreen' },
  ]

  // For non-this_week filters, show all tasks in a simple flat list
  const isThisWeek = activeFilter === 'this_week'

  return (
    <div className="min-h-screen pb-16" style={{ background: '#FFF8F0' }}>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Launches panel */}
        <LaunchesPanel initialLaunches={initialLaunches} />

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4 flex-wrap shadow-sm">
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
                  await loadTasks(activeFilter)
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

        {/* Phase tabs */}
        <div className="border-b flex gap-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          {TABS.map(tab => {
            const isActive = activeFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveFilter(tab.id); setChannelFilter('All') }}
                className="relative pb-2.5 pt-1 px-3.5 transition-colors whitespace-nowrap"
                style={{
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#C48018' : '#9CA3AF',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                    style={{ height: '2px', background: '#E9A020' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Channel filter pills */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1.5">Filter by channel</p>
          <div className="flex gap-1.5 flex-wrap">
            {(['All', 'Ads', 'Email', 'Creative', 'Social', 'General'] as const).map(ch => {
              const isActive = channelFilter === ch
              if (ch === 'All') {
                return (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter('All')}
                    className="rounded-full font-medium transition-all"
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      background: isActive ? '#1E2D3D' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#9CA3AF',
                      border: `0.5px solid ${isActive ? '#1E2D3D' : '#D1D5DB'}`,
                    }}
                  >
                    All
                  </button>
                )
              }
              const s = CHANNEL_COLORS[ch]
              return (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(prev => prev === ch ? 'All' : ch)}
                  className="rounded-full font-medium transition-all"
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    background: isActive ? s.bg : 'transparent',
                    color: isActive ? s.text : '#9CA3AF',
                    border: `0.5px solid ${isActive ? s.dot : s.dot}`,
                  }}
                >
                  {ch}
                </button>
              )
            })}
          </div>
        </div>

        {/* Week strip */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <WeekStrip tasks={tasks} />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">{doneCount} of {totalVisible} tasks complete</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#E9A020' }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-400">{progressPct}%</span>
        </div>

        {/* Task list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4">
            {isThisWeek ? (
              <>
                <TaskSection
                  title="Still to do"
                  tasks={overdueTasks}
                  launchDate={launchDate}
                  bookTitle={bookTitle}
                  daysToLaunch={daysToLaunch}
                  adTasks={adTasks}
                  isOverdue={true}
                  onComplete={handleComplete}
                  onCopy={showPromptCopiedToast}
                />
                <TaskSection
                  title="Today"
                  tasks={todayTasks}
                  launchDate={launchDate}
                  bookTitle={bookTitle}
                  daysToLaunch={daysToLaunch}
                  adTasks={adTasks}
                  onComplete={handleComplete}
                  onCopy={showPromptCopiedToast}
                />
                <TaskSection
                  title="This Week"
                  tasks={thisWeekTasks}
                  launchDate={launchDate}
                  bookTitle={bookTitle}
                  daysToLaunch={daysToLaunch}
                  adTasks={adTasks}
                  onComplete={handleComplete}
                  onCopy={showPromptCopiedToast}
                />
                <TaskSection
                  title="Upcoming"
                  tasks={upcomingTasks}
                  launchDate={launchDate}
                  bookTitle={bookTitle}
                  daysToLaunch={daysToLaunch}
                  adTasks={adTasks}
                  onComplete={handleComplete}
                  onCopy={showPromptCopiedToast}
                />
                {overdueTasks.length === 0 && todayTasks.length === 0 && thisWeekTasks.length === 0 && upcomingTasks.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm">
                    No open tasks this week — you're ahead of schedule!
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredTasks.filter(t => t.status !== 'done' && t.status !== 'skipped').length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm">No tasks in this phase.</div>
                )}
                {filteredTasks.map(task => (
                  task.status !== 'done' && task.status !== 'skipped' ? (
                    <TaskRow
                      key={task.id}
                      task={task}
                      launchDate={launchDate}
                      bookTitle={bookTitle}
                      daysToLaunch={daysToLaunch}
                      adTasks={adTasks}
                      isOverdue={false}
                      onComplete={handleComplete}
                      onCopy={showPromptCopiedToast}
                    />
                  ) : null
                ))}
                {/* Done tasks — dimmed at bottom */}
                {filteredTasks.filter(t => t.status === 'done').map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    launchDate={launchDate}
                    bookTitle={bookTitle}
                    daysToLaunch={daysToLaunch}
                    adTasks={adTasks}
                    isOverdue={false}
                    onComplete={handleComplete}
                    onCopy={showPromptCopiedToast}
                  />
                ))}
              </>
            )}

            <AddTaskForm onAdd={handleAddTask} />
          </div>
        </div>

        {/* Streak widget */}
        {streak && (
          <StreakWidget streak={streak} events={streakEvents} />
        )}

      </div>
    </div>
  )
}
