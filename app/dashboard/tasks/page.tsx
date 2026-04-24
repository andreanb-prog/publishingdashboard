'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { Task } from '@/types'
import { BoutiqueChannelPageLayout, BoutiquePageHeader } from '@/components/boutique'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_COLOR: Record<string, string> = {
  high: '#F97B6B',
  medium: '#D97706',
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
      <BoutiqueChannelPageLayout>
        <div className="max-w-3xl mx-auto">
          <div className="h-7 w-40 rounded-md mb-4" style={{ background: '#E5E2DD' }} />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse" style={{ background: 'white', border: '1px solid #EEEBE6', padding: 16 }}>
                <div style={{ height: 14, width: '66%', background: '#E5E2DD' }} />
                <div style={{ height: 11, width: '33%', background: '#E5E2DD', marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </BoutiqueChannelPageLayout>
    )
  }

  return (
    <BoutiqueChannelPageLayout>
      <BoutiquePageHeader
        title="Task Center"
        subtitle="Your action plan"
        badge="Tasks"
        badgeColor="#D97706"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={generateAI}
              disabled={aiLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid #D97706',
                color: '#D97706',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                cursor: aiLoading ? 'wait' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: 14 }}>&#10022;</span>
              {aiLoading ? 'Analyzing...' : 'Suggest tasks'}
            </button>
            <button
              onClick={() => setShowExport(!showExport)}
              style={{
                padding: '8px 14px',
                background: 'white',
                border: '1px solid #E8E1D3',
                color: '#1E2D3D',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Export
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '8px 14px',
                background: '#1E2D3D',
                color: '#fff',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add task
            </button>
          </div>
        }
      />
      <div className="max-w-3xl mx-auto">

        {/* AI error */}
        {aiError && (
          <div style={{ padding: '12px 16px', marginBottom: 16, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, background: '#FFF4E0', color: '#92610E', border: '1px solid #D97706' }}>
            {aiError}
          </div>
        )}

        {/* Export panel */}
        {showExport && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16, marginBottom: 16, background: '#F7F1E6', border: '1px solid #E8E1D3' }}>
            <button onClick={copyToClipboard}
              style={{ padding: '7px 12px', background: 'white', border: '1px solid #E8E1D3', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
              {copyMsg || 'Copy to clipboard'}
            </button>
            <button onClick={exportCSV}
              style={{ padding: '7px 12px', background: 'white', border: '1px solid #E8E1D3', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
              Export .csv
            </button>
            <span style={{ padding: '7px 12px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, background: 'rgba(30,45,61,0.04)', color: 'rgba(30,45,61,0.4)' }}>
              Email summary — coming soon
            </span>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'high', label: 'High priority' },
            ...CATEGORIES.map(c => ({ key: c, label: c })),
            { key: 'ai', label: 'AI suggested' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                fontWeight: 500,
                background: filter === f.key ? '#1E2D3D' : 'white',
                color: filter === f.key ? 'white' : 'rgba(30,45,61,0.6)',
                border: filter === f.key ? '1px solid #1E2D3D' : '1px solid #E8E1D3',
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
              <button onClick={() => setShowModal(true)} className="text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#D97706' }}>
                Add your first task
              </button>
              <button onClick={generateAI} className="text-[13px] font-semibold bg-transparent border-none cursor-pointer" style={{ color: '#D97706' }}>
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
                border: '1px solid #D97706',
                color: '#D97706',
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
            <TaskSection label="This week" color="#D97706" tasks={groups.thisWeek} onToggle={toggleTask} onDelete={deleteTask} />
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
    </BoutiqueChannelPageLayout>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(30,45,61,0.5)' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(30,45,61,0.35)' }}>{tasks.length}</span>
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
      className="group"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px',
        background: 'white',
        border: '1px solid #EEEBE6',
      }}
      onMouseEnter={e => { (e.currentTarget.style.borderColor = '#E8E1D3') }}
      onMouseLeave={e => { (e.currentTarget.style.borderColor = '#EEEBE6') }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        style={{
          width: 18, height: 18, flexShrink: 0, marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? '#6EBF8B' : 'transparent',
          border: done ? 'none' : '1.5px solid rgba(30,45,61,0.25)',
          cursor: 'pointer',
        }}
      >
        {done && <span style={{ color: 'white', fontSize: '12px', lineHeight: 1 }}>&#10003;</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {!done && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLOR[task.priority] ?? '#D97706' }} />}
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 500,
              color: done ? 'rgba(30,45,61,0.4)' : '#1E2D3D',
              textDecoration: done ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
          {task.isAISuggested && (
            <span style={{
              padding: '2px 6px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontStyle: 'italic',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: '#F7F1E6',
              border: '1px solid #D97706',
              color: '#D97706',
              flexShrink: 0,
            }}>
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
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 11, color: 'rgba(30,45,61,0.5)' }}>
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

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 440,
          margin: '0 16px', padding: 24,
          background: '#F7F1E6',
          fontFamily: 'var(--font-sans)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: '#1E2D3D', marginBottom: 20 }}>Add task</h2>

        {/* Title */}
        <input
          autoFocus
          placeholder="Task title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
        />

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 12, boxSizing: 'border-box' }}
        />

        {/* Priority */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(30,45,61,0.5)', marginBottom: 6 }}>Priority</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{
                  padding: '5px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'capitalize',
                  background: priority === p ? PRIORITY_COLOR[p] : 'white',
                  color: priority === p ? 'white' : 'rgba(30,45,61,0.6)',
                  border: `1px solid ${priority === p ? PRIORITY_COLOR[p] : '#E8E1D3'}`,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(30,45,61,0.5)', marginBottom: 6 }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }}
          >
            <option value="">None</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(30,45,61,0.5)', marginBottom: 6 }}>Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Assign to */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(30,45,61,0.5)', marginBottom: 6 }}>Assign to</label>
          <input
            type="text"
            placeholder="e.g. Melinda Kelly"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E8E1D3', background: 'white', color: '#1E2D3D', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          style={{
            width: '100%', padding: '11px', marginBottom: 8,
            background: title.trim() ? '#1E2D3D' : 'rgba(30,45,61,0.1)',
            color: title.trim() ? '#fff' : 'rgba(30,45,61,0.3)',
            border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
            cursor: title.trim() ? 'pointer' : 'default',
          }}
        >
          Save task
        </button>
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(30,45,61,0.5)' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
