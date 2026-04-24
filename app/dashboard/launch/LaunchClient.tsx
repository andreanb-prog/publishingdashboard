'use client'
// app/dashboard/launch/LaunchClient.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Pencil } from 'lucide-react'
import { BoutiqueChannelPageLayout, BoutiquePageHeader, BoutiqueStatusChip } from '@/components/boutique'

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
        <div style={{ fontSize: '12px', padding: '8px 16px', background: '#D97706', color: 'white', fontFamily: 'var(--font-sans)', fontWeight: 500, borderRadius: 0 }}>
          {message}
        </div>
      ) : (
        <div style={{ background: '#1E2D3D', color: 'white', fontSize: 13, padding: '10px 16px', fontFamily: 'var(--font-sans)', fontWeight: 500, borderRadius: 0 }}>
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

// ── Inline AI panel ────────────────────────────────────────────────────────────
function InlineAIPanel({
  actionType,
  taskName,
  phase,
  channel,
  bookTitle,
  launchDate,
  daysToLaunch,
  adTasks,
  onClose,
}: {
  actionType: string
  taskName: string
  phase: string
  channel: string
  bookTitle: string | null
  launchDate: string
  daysToLaunch: number
  adTasks: LaunchTask[]
  onClose: () => void
}) {
  const [content, setContent]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [copied,  setCopied]      = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setContent('')
    setLoading(true)

    fetch('/api/launch/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType,
        taskName,
        phase,
        channel,
        bookTitle,
        launchDate,
        daysToLaunch,
        adTasks: adTasks.map(t => ({ name: t.name, status: t.status })),
      }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok || !res.body) { setLoading(false); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            setContent(prev => prev + decoder.decode(value, { stream: true }))
          }
        } catch {
          // AbortError or cancelled reader — stop silently
        }
        setLoading(false)
      })
      .catch(err => {
        if (err?.name !== 'AbortError') setLoading(false)
      })

    return () => { controller.abort() }
  }, [actionType, taskName, phase, channel, bookTitle, launchDate, daysToLaunch, adTasks])

  async function handleCopy() {
    try { await navigator.clipboard.writeText(content) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = actionType === 'brief' ? 'Creative Brief' : 'Task Review'

  return (
    <div
      style={{ background: '#FFFDF7', border: '1px solid rgba(217,119,6,0.3)', borderLeft: '3px solid #D97706', borderRadius: 0, marginTop: 8, marginLeft: 40, overflow: 'hidden' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: collapsed ? 'none' : '1px solid #F6D38A', background: '#FFF8EC' }}>
        <div className="flex items-center gap-1.5">
          {/* Collapse/expand chevron */}
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(v => !v) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px 4px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              <polyline points="2,3.5 5,6.5 8,3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[11px] font-bold" style={{ color: '#D97706', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && !loading && content && (
            <button
              onClick={e => { e.stopPropagation(); handleCopy() }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors"
              style={{ background: copied ? '#6EBF8B' : '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1, padding: '4px 6px' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div className="px-3 py-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {loading && !content && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: '#9CA3AF' }}>
              <span className="inline-block w-3 h-3 border-2 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
              Generating…
            </div>
          )}
          {content && (
            <p className="text-[12px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: '#1E2D3D' }}>
              {content}
              {loading && <span className="inline-block w-1 h-3 ml-0.5 animate-pulse" style={{ background: '#D97706', verticalAlign: 'text-bottom' }} />}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Action button (stateless — panel state managed by TaskRow) ─────────────────
function ActionButton({ actionType, actionPrompt, phase, bookTitle, launchDate, daysToLaunch, isActive, onInlineToggle, onCopy }: {
  actionType: string
  actionPrompt: string
  phase: string
  bookTitle: string | null
  launchDate: string
  daysToLaunch: number
  isActive: boolean
  onInlineToggle: () => void
  onCopy: (msg: string) => void
}) {
  const isInline = actionType === 'brief' || actionType === 'review'
  const labels: Record<string, string> = { copy: 'Copy ↗', brief: 'Brief', review: 'Review' }
  const label = labels[actionType] ?? 'Action'

  const handleClick = async () => {
    if (isInline) { onInlineToggle(); return }

    // "copy" — original clipboard behaviour
    const title = bookTitle ?? 'my book'
    const launchFormatted = toLocalDate(launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const daysLabel = daysToLaunch > 0 ? `${daysToLaunch} days out` : daysToLaunch === 0 ? 'launch day' : `${Math.abs(daysToLaunch)} days post-launch`
    const prompt = actionType === 'copy'
      ? `Write pre-order ad copy for ${title}. Launch date: ${launchFormatted} — ${daysLabel}. We're in the ${phase} phase. Use the emotional/tension angle — lead with feeling, not trope lists. Write 3 caption variants with headline and link description for each.`
      : (actionPrompt ?? '').replace(/\[BOOK_TITLE\]/g, title).replace(/\[LAUNCH_DATE\]/g, launchFormatted)
    await navigator.clipboard.writeText(prompt)
    onCopy('Prompt copied — paste it into Claude to get started')
  }

  return (
    <button
      onClick={handleClick}
      className="text-[11px] font-medium px-2.5 py-1 transition-colors whitespace-nowrap"
      style={isActive
        ? { background: '#FFF8EC', border: '1px solid #D97706', color: '#D97706', borderRadius: 2 }
        : { background: 'transparent', border: '1px solid #E8E1D3', color: '#6B7280', borderRadius: 2 }}
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
  const [loading,     setLoading]     = useState(false)
  const [showPanel,   setShowPanel]   = useState(false)
  const isInlineAction = task.actionType === 'brief' || task.actionType === 'review'

  const handleCheck = async () => {
    if (isDone || loading) return
    setLoading(true)
    await onComplete(task.id)
    setLoading(false)
  }

  return (
    <div
      className={`flex flex-col transition-colors group
        ${isOverdue && !isDone ? 'border-l-2' : ''}`}
      style={isOverdue && !isDone ? { borderColor: '#D97706' } : undefined}
    >
      {/* Main row */}
      <div className={`flex items-center gap-3 py-2.5 px-3 hover:bg-stone-50 ${isOverdue && !isDone ? 'pl-2.5' : ''}`}>
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

        {/* Meta line: channel · due date · action type */}
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 12,
          color: '#9CA3AF',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {task.channel} · {formatShort(task.dueDate)}{task.actionType ? ` · ${task.actionType}` : ''}
        </span>

        {/* Action button */}
        {task.actionType && task.actionPrompt && !isDone && (
          <ActionButton
            actionType={task.actionType}
            actionPrompt={task.actionPrompt}
            phase={task.phase}
            bookTitle={bookTitle}
            launchDate={launchDate}
            daysToLaunch={daysToLaunch}
            isActive={showPanel}
            onInlineToggle={() => setShowPanel(v => !v)}
            onCopy={onCopy}
          />
        )}
      </div>

      {/* Inline AI panel — rendered below the row */}
      {showPanel && isInlineAction && task.actionType && (
        <InlineAIPanel
          actionType={task.actionType}
          taskName={task.name}
          phase={task.phase}
          channel={task.channel}
          bookTitle={bookTitle}
          launchDate={launchDate}
          daysToLaunch={daysToLaunch}
          adTasks={adTasks}
          onClose={() => setShowPanel(false)}
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
          className="flex items-center gap-1.5 text-sm font-semibold mb-2 hover:opacity-80 transition-opacity" style={{ color: '#D97706' }}
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
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 text-sm text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors mt-2"
        style={{ borderRadius: 0 }}
      >
        <span>+</span> Add task
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 0, border: '1px solid #E8E1D3', background: '#F7F1E6' }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Task name"
        className="w-full text-sm px-3 py-2 mb-2 outline-none focus:border-amber-400"
        style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: '#FFFFFF', color: '#1E2D3D' }}
      />
      <div className="flex gap-2 mb-2">
        <select
          value={channel}
          onChange={e => setChannel(e.target.value)}
          className="text-sm px-3 py-2 outline-none focus:border-amber-400 flex-1"
          style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: '#FFFFFF', color: '#1E2D3D' }}
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
          className="text-sm px-3 py-2 outline-none focus:border-amber-400 flex-1"
          style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: '#FFFFFF', color: '#1E2D3D' }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !dueDate}
          className="text-sm px-4 py-1.5 font-medium transition-colors disabled:opacity-50"
          style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm px-4 py-1.5 text-gray-500 hover:bg-gray-200 transition-colors"
          style={{ borderRadius: 2, border: '1px solid #E8E1D3', background: 'transparent', cursor: 'pointer' }}
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
              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all"
              style={isToday ? {
                border: '2px solid #D97706',
                color: '#D97706',
              } : { color: '#6B7280' }}
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
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: 16, marginTop: 16 }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 600,
          color: '#D97706',
          lineHeight: 1,
        }}>
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
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: hasEvent ? '#D97706' : 'transparent',
                  border: hasEvent
                    ? 'none'
                    : isToday
                    ? '2px solid #D97706'
                    : '1.5px solid #E8E1D3',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
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

// ── Inline edit helpers ─────────────────────────────────────────────────────────

function InlineTextField({
  value,
  onSave,
  placeholder,
  className: extraClass,
  style,
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

  const fieldStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    ...style,
  }

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
        style={{ ...fieldStyle, borderColor: '#D97706' }}
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

function InlineDateField({
  value,
  onSave,
}: {
  value: string | null
  onSave: (val: string) => void | Promise<void>
}) {
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
        onBlur={async e => {
          if (e.target.value) await onSave(e.target.value)
          setEditing(false)
        }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="text-[11px] bg-transparent outline-none border-b"
        style={{ borderColor: '#D97706', color: '#6B7280', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
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

function InlinePhaseSelect({
  value,
  onSave,
}: {
  value: string
  onSave: (val: string) => void | Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const pc = phaseColor(value)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value}
        onBlur={async e => { await onSave(e.target.value); setEditing(false) }}
        onChange={async e => { await onSave(e.target.value); setEditing(false) }}
        className="text-[10px] font-bold px-2 py-0.5 outline-none cursor-pointer"
        style={{ borderRadius: 2, background: pc.bg, color: pc.color, border: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    )
  }
  const tone = value === 'Launch Week' ? 'green' : value === 'Evergreen' ? 'plum' : value === 'Pre-order' ? 'amber' : 'coral'
  return (
    <span
      className="inline-flex items-center gap-1 group/iphase cursor-pointer"
      onClick={() => setEditing(true)}
    >
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
        <InlineTextField
          value={data.bookTitle}
          onSave={title => patch({ bookTitle: title })}
          style={{ color: '#1E2D3D' }}
        />
      </div>
      <InlinePhaseSelect value={displayPhase} onSave={phase => patch({ phase })} />
      <InlineDateField
        value={data.startDate}
        onSave={date => patch({ startDate: date })}
      />
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
    border: '1px solid #E8E1D3', borderRadius: 2, padding: '6px 10px',
    fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none', background: '#FFFFFF', color: '#1E2D3D', width: '100%',
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: '16px 20px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[14px] m-0" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Launches
        </h3>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] font-semibold px-3 py-1.5 transition-colors"
            style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
          >
            + Plan next launch
          </button>
        )}
      </div>

      {!activeLaunch && launches.length === 0 && !showAdd && (
        <p className="text-[12px] text-gray-400 mb-0">
          No launches yet — plan one to get started.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {/* Active task-based launch */}
        {activeLaunch && (() => {
          const phase = deriveLaunchPhase(activeLaunch.launchDate)
          const pc = phaseColor(phase)
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

        {/* Campaign Organizer launches */}
        {launches.map(l => (
          <LaunchRow key={l.id} launch={l} onDelete={handleDelete} />
        ))}
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
                className="text-[12px] font-bold px-4 py-1.5 disabled:opacity-50"
                style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewTitle(''); setNewStart(''); setNewPhase('Pre-order') }}
                className="text-[12px] font-semibold px-3 py-1.5"
                style={{ background: 'transparent', color: '#6B7280', border: '1px solid #E8E1D3', borderRadius: 2, cursor: 'pointer' }}
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F7F1E6' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: 32 }} className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)', color: '#D97706', fontSize: 36 }}>L</div>
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
              className="w-full text-sm px-4 py-2.5 outline-none focus:border-amber-400 transition-colors"
              style={{ borderRadius: 2, border: '1px solid #E8E1D3', color: '#1E2D3D' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">Launch date <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={launchDate}
              onChange={e => setLaunchDate(e.target.value)}
              required
              className="w-full text-sm px-4 py-2.5 outline-none focus:border-amber-400 transition-colors"
              style={{ borderRadius: 2, border: '1px solid #E8E1D3', color: '#1E2D3D' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !launchDate}
            className="w-full py-3 font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}
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

  const handleActiveLaunchTitleChange = useCallback((title: string) => {
    setBookTitle(title || null)
  }, [])

  // Restore channelFilter and bookTitle from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('launch_channel_filter')
    if (savedFilter) setChannelFilter(savedFilter)
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

  const handleActiveLaunchDateChange = useCallback(async (date: string) => {
    const res = await fetch('/api/launch/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ launchDate: date, bookTitle: bookTitle }),
    })
    if (res.ok) {
      setLaunchDate(date)
      await loadTasks(activeFilter)
    }
  }, [bookTitle, activeFilter, loadTasks])

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
  if (daysToLaunch === 0) countdownLabel = 'Launch day!'
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

        {/* Header card */}
        <div id="launch-tasks" style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: '16px 20px' }} className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {bookTitle && (
              <span className="inline-flex items-center px-3 py-1 text-sm font-semibold"
                style={{ background: '#FFF4E0', color: '#D97706', borderRadius: 2, border: '1px solid #F6D38A' }}>
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
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            style={{ border: '1px solid #E8E1D3', borderRadius: 2, padding: '6px 12px', background: 'transparent', cursor: 'pointer' }}
          >
            Change date
          </button>
        </div>

        {/* Change date form */}
        {showChangeDate && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: 16 }}>
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
                className="text-sm px-3 py-2 outline-none flex-1 min-w-[180px]"
                style={{ borderRadius: 2, border: '1px solid #E8E1D3', color: '#1E2D3D' }} />
              <input name="newDate" type="date" defaultValue={launchDate.split('T')[0]} required
                className="text-sm px-3 py-2 outline-none"
                style={{ borderRadius: 2, border: '1px solid #E8E1D3', color: '#1E2D3D' }} />
              <button type="submit" className="text-sm px-4 py-2 font-semibold transition-all"
                style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 2, cursor: 'pointer' }}>
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
                    style={{ height: '2px', background: '#D97706' }}
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
                    className="font-medium transition-all"
                    style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: 2,
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
                  className="font-medium transition-all"
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: 2,
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
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0, padding: 16 }}>
          <WeekStrip tasks={tasks} />
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">{doneCount} of {totalVisible} tasks complete</span>
          <div className="flex-1 h-1.5 overflow-hidden" style={{ background: '#F3EDE3' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#D97706' }}
            />
          </div>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#9CA3AF',
          }}>{progressPct}%</span>
        </div>

        {/* Task list */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: 0 }} className="overflow-hidden">
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
    </BoutiqueChannelPageLayout>
  )
}
