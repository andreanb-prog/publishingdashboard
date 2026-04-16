'use client'
// app/dashboard/tasks/page.tsx — Task Center

import { useState, useEffect, useCallback } from 'react'
import { Plus, User, Check, Trash2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Task {
  id: string
  name: string
  channel: string
  phase: string
  dueDate: string
  status: string
  assignedTo: string | null
  notes: string | null
  createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CHANNELS = ['Ads', 'Email', 'Creative', 'Social', 'General']
const PHASES   = ['pre-order', 'launch', 'post-launch', 'evergreen']

const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
  Ads:      { bg: '#EFF6FF', text: '#1E40AF' },
  Email:    { bg: '#DCFCE7', text: '#166534' },
  Creative: { bg: '#F3E8FF', text: '#6B21A8' },
  Social:   { bg: '#DCFCE7', text: '#166534' },
  General:  { bg: '#F3F4F6', text: '#4B5563' },
}

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  'pre-order':   { bg: '#FFF4E0', text: '#B45309' },
  'launch':      { bg: '#FEE2E2', text: '#991B1B' },
  'post-launch': { bg: '#DCFCE7', text: '#166534' },
  'evergreen':   { bg: '#F3E8FF', text: '#6B21A8' },
}

const FILTER_LABELS: { key: string; label: string }[] = [
  { key: 'this_week', label: 'This Week' },
  { key: 'all',       label: 'All Tasks' },
  { key: 'pre-order',   label: 'Pre-order' },
  { key: 'launch',      label: 'Launch' },
  { key: 'post-launch', label: 'Post-launch' },
  { key: 'evergreen',   label: 'Evergreen' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function toLocalDate(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function fmtDate(iso: string): string {
  return toLocalDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isOverdue(iso: string, status: string): boolean {
  if (status === 'done' || status === 'skipped') return false
  return toLocalDate(iso) < new Date(new Date().setHours(0, 0, 0, 0))
}

// ── Pill ───────────────────────────────────────────────────────────────────────
function Pill({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  )
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onToggleDone,
  onDelete,
}: {
  task: Task
  onToggleDone: (id: string, current: string) => void
  onDelete: (id: string) => void
}) {
  const done    = task.status === 'done'
  const overdue = isOverdue(task.dueDate, task.status)
  const channelColors = CHANNEL_COLORS[task.channel] ?? CHANNEL_COLORS.General
  const phaseColors   = PHASE_COLORS[task.phase]    ?? { bg: '#F3F4F6', text: '#4B5563' }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: done ? '#F9FAFB' : '#FFFFFF',
        border: `1px solid ${overdue ? '#FCA5A5' : '#EEEBE6'}`,
        opacity: done ? 0.65 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleDone(task.id, task.status)}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer"
        style={{
          background: done ? '#1E2D3D' : 'transparent',
          borderColor: done ? '#1E2D3D' : '#D1D5DB',
        }}
        aria-label={done ? 'Mark incomplete' : 'Mark done'}
      >
        {done && <Check size={11} color="#fff" strokeWidth={2.5} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-medium leading-snug"
          style={{ color: done ? '#9CA3AF' : '#1E2D3D', textDecoration: done ? 'line-through' : 'none' }}
        >
          {task.name}
        </p>

        {/* Assignee */}
        {task.assignedTo && (
          <div className="flex items-center gap-1 mt-1">
            <User size={12} color="#9CA3AF" strokeWidth={1.75} />
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{task.assignedTo}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <Pill label={task.channel} colors={channelColors} />
          <Pill label={task.phase}   colors={phaseColors} />
          <span
            className="text-[11px]"
            style={{ color: overdue ? '#EF4444' : '#9CA3AF' }}
          >
            {overdue ? '⚠ ' : ''}{fmtDate(task.dueDate)}
          </span>
        </div>

        {task.notes && (
          <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
            {task.notes}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 p-1 rounded transition-all cursor-pointer"
        style={{ background: 'transparent', border: 'none', color: '#D1D5DB' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#D1D5DB' }}
        aria-label="Delete task"
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
interface TaskFormData {
  name: string
  channel: string
  phase: string
  dueDate: string
  assignedTo: string
  notes: string
}

const EMPTY_FORM: TaskFormData = {
  name:       '',
  channel:    'General',
  phase:      'launch',
  dueDate:    todayISO(),
  assignedTo: '',
  notes:      '',
}

function AddTaskModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (data: TaskFormData) => Promise<void>
}) {
  const [form, setForm]       = useState<TaskFormData>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function set(field: keyof TaskFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Task title is required.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#4B5563',
    marginBottom: '4px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E2D3D',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none',
    background: '#FFFFFF',
    boxSizing: 'border-box',
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-xl"
        style={{ background: '#FFFFFF', padding: '28px 28px 24px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1E2D3D', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Add Task
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Write launch email sequence"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.channel} onChange={e => set('channel', e.target.value)} style={inputStyle}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Priority / Phase */}
          <div>
            <label style={labelStyle}>Priority / Phase</label>
            <select value={form.phase} onChange={e => set('phase', e.target.value)} style={inputStyle}>
              {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={labelStyle}>Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Assign To */}
          <div>
            <label style={labelStyle}>Assign to</label>
            <input
              type="text"
              placeholder="e.g. Melinda Kelly"
              value={form.assignedTo}
              onChange={e => set('assignedTo', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Optional notes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#EF4444', margin: 0 }}>{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                background: 'transparent',
                color: '#4B5563',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: '8px',
                background: '#E9A020',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {saving ? 'Saving…' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks]               = useState<Task[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState('this_week')
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast]               = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/launch/tasks?filter=${filter}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function handleSaveTask(form: TaskFormData) {
    const res = await fetch('/api/launch/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:       form.name.trim(),
        channel:    form.channel,
        phase:      form.phase,
        dueDate:    form.dueDate,
        assignedTo: form.assignedTo.trim() || null,
        notes:      form.notes.trim() || null,
      }),
    })
    if (!res.ok) throw new Error('Save failed')
    showToast('Task added')
    await fetchTasks()
  }

  async function handleToggleDone(id: string, current: string) {
    const nextStatus = current === 'done' ? 'not_started' : 'done'
    try {
      await fetch(`/api/launch/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t))
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/launch/tasks/${id}`, { method: 'DELETE' })
      setTasks(prev => prev.filter(t => t.id !== id))
      showToast('Task deleted')
    } catch { /* silent */ }
  }

  const done    = tasks.filter(t => t.status === 'done').length
  const total   = tasks.length
  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#FFF8F0', minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E2D3D', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Task Center
            </h1>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {total === 0 ? 'No tasks' : `${done} of ${total} done${overdue > 0 ? ` · ${overdue} overdue` : ''}`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold transition-all"
            style={{
              background: '#E9A020',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add task
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: filter === key ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: filter === key ? '#1E2D3D' : '#FFFFFF',
                color:      filter === key ? '#FFFFFF' : '#4B5563',
                border:     filter === key ? '1px solid #1E2D3D' : '1px solid #E5E7EB',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#F3F4F6' }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: '#9CA3AF' }}>
            <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center mb-3"
              style={{ borderColor: '#D1D5DB' }}>
              <Check size={22} color="#D1D5DB" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No tasks yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ marginTop: '12px', fontSize: '13px', color: '#E9A020', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Add your first task →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveTask}
        />
      )}

      {/* Toast */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: `translateX(-50%) translateY(${toast ? 0 : 8}px)`,
          opacity: toast ? 1 : 0,
          transition: 'all 0.25s',
          pointerEvents: 'none',
          zIndex: 60,
        }}
      >
        <div style={{
          background: '#1E2D3D',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 500,
          padding: '8px 18px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {toast}
        </div>
      </div>
    </div>
  )
}
