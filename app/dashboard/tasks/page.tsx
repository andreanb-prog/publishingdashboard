'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Task } from '@/types'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_COLOR: Record<string, string> = {
  high: '#F97B6B',
  medium: '#E9A020',
  low: '#60A5FA',
}
const CATEGORIES = ['KDP', 'Meta ads', 'MailerLite', 'Writing', 'List building', 'Pinterest', 'General']

function isToday(d: string | null | undefined): boolean {
  if (!d) return false
  return new Date(d).toDateString() === new Date().toDateString()
}

function isTomorrow(d: string | null | undefined): boolean {
  if (!d) return false
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return new Date(d).toDateString() === tomorrow.toDateString()
}

function isThisWeek(d: string | null | undefined): boolean {
  if (!d) return false
  const date = new Date(d)
  const now = new Date()
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
  return date >= now && date <= endOfWeek
}

function formatDueDate(d: string | null | undefined): string {
  if (!d) return ''
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatCompletedDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Group tasks by urgency
function groupTasks(tasks: Task[]) {
  const todo = tasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')

  const sorted = [...todo].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1
    const pb = PRIORITY_ORDER[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const db_ = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    return da - db_
  })

  const doToday: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []

  for (const t of sorted) {
    if (isToday(t.dueDate) || isTomorrow(t.dueDate) || (t.priority === 'high' && !t.dueDate)) {
      doToday.push(t)
    } else if (isThisWeek(t.dueDate)) {
      thisWeek.push(t)
    } else {
      later.push(t)
    }
  }

  return { doToday, thisWeek, later, done: done.slice(0, 5) }
}

export default function TaskCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    }
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  const generateAI = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/tasks/generate', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        setAiError(err.error || 'Failed to generate tasks')
        return
      }
      const newTasks = await res.json()
      setTasks(prev => [...newTasks, ...prev])
    } catch {
      setAiError('Something went wrong')
    } finally {
      setAiLoading(false)
    }
  }

  // Filtered tasks
  const filtered = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'ai') return t.isAISuggested
    if (filter === 'high') return t.priority === 'high'
    return t.category === filter
  })

  const groups = groupTasks(filtered)
  const todoCount = tasks.filter(t => t.status === 'todo').length
  const aiCount = tasks.filter(t => t.isAISuggested && t.status === 'todo').length
  const dueThisWeek = tasks.filter(t => t.status === 'todo' && isThisWeek(t.dueDate)).length

  const copyToClipboard = () => {
    const g = groupTasks(tasks)
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    let text = `Task Center — ${today}\n\n`
    if (g.doToday.length) {
      text += 'DO TODAY\n'
      g.doToday.forEach(t => { text += `[ ] ${t.title}${t.category ? ` — ${t.category}` : ''}${t.dueDate ? ` — Due: ${formatDueDate(t.dueDate)}` : ''}\n` })
      text += '\n'
    }
    if (g.thisWeek.length) {
      text += 'THIS WEEK\n'
      g.thisWeek.forEach(t => { text += `[ ] ${t.title}${t.category ? ` — ${t.category}` : ''}${t.dueDate ? ` — Due: ${formatDueDate(t.dueDate)}` : ''}\n` })
      text += '\n'
    }
    if (g.later.length) {
      text += 'LATER\n'
      g.later.forEach(t => { text += `[ ] ${t.title}${t.category ? ` — ${t.category}` : ''}${t.dueDate ? ` — Due: ${formatDueDate(t.dueDate)}` : ''}\n` })
      text += '\n'
    }
    if (g.done.length) {
      text += 'DONE\n'
      g.done.forEach(t => { text += `[x] ${t.title}${t.completedAt ? ` — Completed ${formatCompletedDate(t.completedAt)}` : ''}\n` })
    }
    navigator.clipboard.writeText(text)
    setCopyMsg('Copied!')
    setTimeout(() => setCopyMsg(''), 2000)
  }

  const exportCSV = () => {
    const rows = [['Title', 'Status', 'Priority', 'Category', 'Due Date', 'AI Suggested', 'AI Reason', 'Completed At']]
    tasks.forEach(t => {
      rows.push([
        t.title,
        t.status,
        t.priority,
        t.category ?? '',
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
        t.isAISuggested ? 'Yes' : 'No',
        t.aiReason ?? '',
        t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '',
      ])
    })
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Skeleton
  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8" style={{ background: '#FFF8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="max-w-3xl mx-auto">
          <div className="h-7 w-40 rounded-md mb-4" style={{ background: '#E5E2DD' }} />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'white', border: '1px solid rgba(30,45,61,0.07)' }}>
                <div className="h-4 w-2/3 rounded" style={{ background: '#E5E2DD' }} />
                <div className="h-3 w-1/3 rounded mt-2" style={{ background: '#E5E2DD' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: '#FFF8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[20px] font-semibold m-0" style={{ color: '#1E2D3D' }}>Task center</h1>
            <p className="text-[13px] mt-1 m-0" style={{ color: 'rgba(30,45,61,0.6)' }}>
              {todoCount} task{todoCount !== 1 ? 's' : ''}
              {aiCount > 0 && <> &middot; {aiCount} AI suggested</>}
              {dueThisWeek > 0 && <> &middot; {dueThisWeek} due this week</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateAI}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid #E9A020',
                color: '#E9A020',
                cursor: aiLoading ? 'wait' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: '14px' }}>&#10022;</span>
              {aiLoading ? 'Analyzing...' : 'Suggest tasks'}
            </button>
            <button
              onClick={() => setShowExport(!showExport)}
              className="px-3 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: 'white', border: '1px solid rgba(30,45,61,0.12)', color: '#1E2D3D', cursor: 'pointer' }}
            >
              Export
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 rounded-lg text-[13px] font-bold"
              style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}
            >
              + Add task
            </button>
          </div>
        </div>

        {/* AI error */}
        {aiError && (
          <div className="rounded-lg px-4 py-3 mb-4 text-[13px]" style={{ background: '#FFF4E0', color: '#92610E', border: '1px solid #E9A020' }}>
            {aiError}
          </div>
        )}

        {/* Export panel */}
        {showExport && (
          <div className="rounded-xl p-4 mb-4 flex flex-wrap gap-3" style={{ background: '#FFF8F0', border: '1px solid rgba(30,45,61,0.07)' }}>
            <button onClick={copyToClipboard} className="px-3 py-2 rounded-lg text-[12px] font-medium"
              style={{ background: 'white', border: '1px solid rgba(30,45,61,0.12)', color: '#1E2D3D', cursor: 'pointer' }}>
              {copyMsg || 'Copy to clipboard'}
            </button>
            <button onClick={exportCSV} className="px-3 py-2 rounded-lg text-[12px] font-medium"
              style={{ background: 'white', border: '1px solid rgba(30,45,61,0.12)', color: '#1E2D3D', cursor: 'pointer' }}>
              Export .csv
            </button>
            <span className="px-3 py-2 rounded-lg text-[12px]"
              style={{ background: 'rgba(30,45,61,0.04)', color: 'rgba(30,45,61,0.4)' }}>
              Email summary — coming soon
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { key: 'all', label: 'All' },
            { key: 'high', label: 'High priority' },
            ...CATEGORIES.map(c => ({ key: c, label: c })),
            { key: 'ai', label: 'AI suggested' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
              style={{
                background: filter === f.key ? '#1E2D3D' : 'white',
                color: filter === f.key ? 'white' : 'rgba(30,45,61,0.6)',
                border: filter === f.key ? 'none' : '1px solid rgba(30,45,61,0.1)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center mb-4"
              style={{ borderColor: 'rgba(30,45,61,0.15)' }}>
              <span style={{ color: 'rgba(30,45,61,0.25)', fontSize: '24px' }}>&#10003;</span>
            </div>
            <p className="text-[15px] font-medium mb-2" style={{ color: '#1E2D3D' }}>No tasks yet</p>
            <div className="flex gap-4 mb-3">
              <button onClick={() => setShowModal(true)} className="text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#E9A020' }}>
                Add your first task
              </button>
              <button onClick={generateAI} className="text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#E9A020' }}>
                Let AI suggest some &rarr;
              </button>
            </div>
            <button
              onClick={async () => {
                setSeedLoading(true)
                try {
                  const res = await fetch('/api/tasks/seed', { method: 'POST' })
                  if (res.ok) await fetchTasks()
                } finally {
                  setSeedLoading(false)
                }
              }}
              disabled={seedLoading}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold"
              style={{
                background: 'transparent',
                border: '1px solid #E9A020',
                color: '#E9A020',
                cursor: seedLoading ? 'wait' : 'pointer',
                opacity: seedLoading ? 0.6 : 1,
              }}
            >
              {seedLoading ? 'Loading...' : 'Load starter tasks'}
            </button>
          </div>
        )}

        {/* Task sections */}
        {tasks.length > 0 && (
          <div className="space-y-6">
            <TaskSection label="Do today" color="#F97B6B" tasks={groups.doToday} onToggle={toggleTask} onDelete={deleteTask} />
            <TaskSection label="This week" color="#E9A020" tasks={groups.thisWeek} onToggle={toggleTask} onDelete={deleteTask} />
            <TaskSection label="Later" color="#60A5FA" tasks={groups.later} onToggle={toggleTask} onDelete={deleteTask} />
            {groups.done.length > 0 && (
              <TaskSection label="Done" color="#6EBF8B" tasks={groups.done} onToggle={toggleTask} onDelete={deleteTask} />
            )}
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            const res = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            if (res.ok) {
              const task = await res.json()
              setTasks(prev => [task, ...prev])
            }
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

/* ──────────────────────── Task Section ──────────────────────── */

function TaskSection({
  label, color, tasks, onToggle, onDelete,
}: {
  label: string
  color: string
  tasks: Task[]
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[12px] font-bold tracking-wide uppercase" style={{ color: 'rgba(30,45,61,0.5)' }}>
          {label}
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(30,45,61,0.35)' }}>{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map(t => (
          <TaskCard key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────── Task Card ──────────────────────── */

function TaskCard({
  task, onToggle, onDelete,
}: {
  task: Task
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
}) {
  const done = task.status === 'done'
  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3 transition-all group"
      style={{
        background: 'white',
        border: '1px solid rgba(30,45,61,0.07)',
      }}
      onMouseEnter={e => { (e.currentTarget.style.borderColor = 'rgba(30,45,61,0.15)') }}
      onMouseLeave={e => { (e.currentTarget.style.borderColor = 'rgba(30,45,61,0.07)') }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border-none cursor-pointer"
        style={{
          background: done ? '#6EBF8B' : 'transparent',
          border: done ? 'none' : '2px solid rgba(30,45,61,0.2)',
        }}
      >
        {done && <span style={{ color: 'white', fontSize: '12px', lineHeight: 1 }}>&#10003;</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!done && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] ?? '#E9A020' }} />}
          <span
            className="text-[14px]"
            style={{
              color: done ? 'rgba(30,45,61,0.4)' : '#1E2D3D',
              fontWeight: 500,
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
          {task.isAISuggested && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
              style={{ background: '#FFF8F0', border: '1px solid #E9A020', color: '#E9A020' }}
            >
              AI suggested
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignedTo && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(30,45,61,0.4)', flexShrink: 0 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[12px]" style={{ color: 'rgba(30,45,61,0.4)' }}>{task.assignedTo}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.category && (
            <span className="text-[11px]" style={{ color: 'rgba(30,45,61,0.45)' }}>{task.category}</span>
          )}
          {task.aiReason && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(30,45,61,0.04)', color: 'rgba(30,45,61,0.5)' }}>
              {task.aiReason}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.dueDate && !done && (
          <span className="text-[11px]" style={{ color: isToday(task.dueDate) ? '#F97B6B' : 'rgba(30,45,61,0.4)' }}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        {done && task.completedAt && (
          <span className="text-[11px]" style={{ color: 'rgba(30,45,61,0.35)' }}>
            {formatCompletedDate(task.completedAt)}
          </span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-transparent border-none cursor-pointer"
          style={{ color: 'rgba(30,45,61,0.3)' }}
          title="Delete"
        >
          &times;
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────── Add Task Modal ──────────────────────── */

function AddTaskModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: { title: string; description?: string; priority: string; category?: string; dueDate?: string; assignedTo?: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category: category || undefined,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl p-6"
        style={{ background: '#FFF8F0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-semibold mb-4" style={{ color: '#1E2D3D' }}>Add task</h2>

        {/* Title */}
        <input
          autoFocus
          placeholder="Task title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[14px] mb-3"
          style={{ border: '1px solid rgba(30,45,61,0.12)', background: 'white', color: '#1E2D3D', outline: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-[13px] mb-3 resize-none"
          style={{ border: '1px solid rgba(30,45,61,0.12)', background: 'white', color: '#1E2D3D', outline: 'none' }}
        />

        {/* Priority */}
        <div className="mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'rgba(30,45,61,0.5)' }}>Priority</label>
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium capitalize"
                style={{
                  background: priority === p ? PRIORITY_COLOR[p] : 'white',
                  color: priority === p ? 'white' : 'rgba(30,45,61,0.6)',
                  border: priority === p ? 'none' : '1px solid rgba(30,45,61,0.1)',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'rgba(30,45,61,0.5)' }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px]"
            style={{ border: '1px solid rgba(30,45,61,0.12)', background: 'white', color: '#1E2D3D', outline: 'none' }}
          >
            <option value="">None</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Due date */}
        <div className="mb-3">
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'rgba(30,45,61,0.5)' }}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px]"
            style={{ border: '1px solid rgba(30,45,61,0.12)', background: 'white', color: '#1E2D3D', outline: 'none' }}
          />
        </div>

        {/* Assign to */}
        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'rgba(30,45,61,0.5)' }}>Assign to</label>
          <input
            type="text"
            placeholder="e.g. Melinda Kelly"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px]"
            style={{ border: '1px solid rgba(30,45,61,0.12)', background: 'white', color: '#1E2D3D', outline: 'none' }}
          />
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="w-full py-2.5 rounded-lg text-[14px] font-bold mb-2"
          style={{
            background: title.trim() ? '#E9A020' : 'rgba(30,45,61,0.1)',
            color: title.trim() ? '#1E2D3D' : 'rgba(30,45,61,0.3)',
            border: 'none',
            cursor: title.trim() ? 'pointer' : 'default',
          }}
        >
          Save task
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg text-[13px] bg-transparent border-none cursor-pointer"
          style={{ color: 'rgba(30,45,61,0.5)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
