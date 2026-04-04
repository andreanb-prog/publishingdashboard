'use client'
// app/dashboard/creative/CreativeClient.tsx
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Camera, ExternalLink, LayoutGrid, Columns, ChevronDown, X, Plus, Check,
} from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Creative {
  id: string
  userId: string
  bookId: string | null
  name: string
  variant: string | null
  phase: string
  angle: string | null
  format: string
  sizes: string[]
  status: string
  thumbnailUrl: string | null
  brief: string | null
  hookText: string | null
  captionCopy: string | null
  headlineCopy: string | null
  targeting: string | null
  ctr: number | null
  cpc: number | null
  spend: number | null
  impressions: number | null
  clicks: number | null
  costPerResult: number | null
  adAccountId: string | null
  metaAdId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Book {
  id: string
  title: string
  phase: string | null
  colorCode: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  briefed:   { label: 'Briefed',   color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  'in-canva':{ label: 'In Canva',  color: '#E9A020', bg: '#FFF4E0', border: '#F6D38A' },
  ready:     { label: 'Ready',     color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  live:      { label: 'Live',      color: '#6EBF8B', bg: '#F0FFF4', border: '#A7F3C8' },
  paused:    { label: 'Paused',    color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  cut:       { label: 'Cut',       color: '#F97B6B', bg: '#FFF1EE', border: '#FEC9C2' },
}

const ALL_STATUSES = ['briefed', 'in-canva', 'ready', 'live', 'paused', 'cut']
const KANBAN_COLS  = ['briefed', 'in-canva', 'ready', 'live', 'cut']

const PHASE_LABELS: Record<string, string> = {
  'pre-order':   'Pre-order',
  launch:        'Launch',
  'post-launch': 'Post-launch',
  evergreen:     'Evergreen',
}
const ANGLE_LABELS: Record<string, string> = {
  emotional:      'Emotional',
  tension:        'Tension',
  'trope-stack':  'Trope stack',
  'social-proof': 'Social proof',
  'passage-quote':'Passage quote',
}
const FORMAT_LABELS: Record<string, string> = {
  'static-image': 'Static image',
  reel:           'Reel',
  carousel:       'Carousel',
  story:          'Story',
}
const TARGETING_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cold:       { label: 'Cold',       color: '#3B82F6', bg: '#EFF6FF' },
  warm:       { label: 'Warm',       color: '#E9A020', bg: '#FFF4E0' },
  retarget:   { label: 'Retarget',   color: '#8B5CF6', bg: '#F5F3FF' },
  newsletter: { label: 'Newsletter', color: '#6EBF8B', bg: '#F0FFF4' },
}
const SIZE_OPTIONS: { id: string; name: string; dims: string; placements: string }[] = [
  { id: '1080x1080', name: 'Feed Square',    dims: '1080 × 1080', placements: 'Facebook feed, Instagram feed' },
  { id: '1200x628',  name: 'Feed Landscape', dims: '1200 × 628',  placements: 'Facebook feed, link preview' },
  { id: '1080x1920', name: 'Story / Reel',   dims: '1080 × 1920', placements: 'Instagram stories, Facebook stories, Reels' },
  { id: '1080x1350', name: 'Portrait',       dims: '1080 × 1350', placements: 'Instagram feed portrait, Facebook feed' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toast({ msg, ok, onDone }: { msg: string; ok: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg"
      style={{
        transform: 'translateX(-50%)',
        background: ok ? '#6EBF8B' : '#F97B6B',
        color: '#fff',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {msg}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.briefed
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

function TargetingBadge({ targeting }: { targeting: string | null }) {
  if (!targeting) return null
  const cfg = TARGETING_CONFIG[targeting]
  if (!cfg) return null
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function PerformanceChips({ creative }: { creative: Creative }) {
  if (creative.status !== 'live' && creative.status !== 'paused') return null
  const ctrBg = creative.ctr == null
    ? '#F3F4F6'
    : creative.ctr < 1
    ? '#FFF1EE'
    : creative.ctr >= 4
    ? '#F0FFF4'
    : '#F3F4F6'
  const ctrColor = creative.ctr == null
    ? '#6B7280'
    : creative.ctr < 1
    ? '#F97B6B'
    : creative.ctr >= 4
    ? '#6EBF8B'
    : '#6B7280'

  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: ctrBg, color: ctrColor }}>
        CTR {creative.ctr != null ? `${creative.ctr.toFixed(2)}%` : '—'}
      </span>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: '#F3F4F6', color: '#6B7280' }}>
        CPC {creative.cpc != null ? `$${creative.cpc.toFixed(2)}` : '—'}
      </span>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: '#F3F4F6', color: '#6B7280' }}>
        Spend {creative.spend != null ? `$${creative.spend.toFixed(0)}` : '—'}
      </span>
    </div>
  )
}

// ─── Log Performance Form ────────────────────────────────────────────────────

function LogPerformanceForm({
  creative,
  onSave,
  onCancel,
}: {
  creative: Creative
  onSave: (patch: Partial<Creative>) => Promise<void>
  onCancel: () => void
}) {
  const [ctr,        setCtr]        = useState(creative.ctr?.toString()        ?? '')
  const [cpc,        setCpc]        = useState(creative.cpc?.toString()        ?? '')
  const [spend,      setSpend]      = useState(creative.spend?.toString()      ?? '')
  const [impressions,setImpressions]= useState(creative.impressions?.toString()  ?? '')
  const [clicks,     setClicks]     = useState(creative.clicks?.toString()     ?? '')
  const [saving,     setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      ctr:        ctr        ? parseFloat(ctr)        : null,
      cpc:        cpc        ? parseFloat(cpc)        : null,
      spend:      spend      ? parseFloat(spend)      : null,
      impressions:impressions? parseInt(impressions)  : null,
      clicks:     clicks     ? parseInt(clicks)       : null,
    })
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none',
    background: '#FAFAFA',
  }

  return (
    <div className="mt-2 pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>CTR %</label>
          <input type="number" step="0.01" placeholder="e.g. 2.5" value={ctr}
            onChange={e => setCtr(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>CPC $</label>
          <input type="number" step="0.01" placeholder="e.g. 0.45" value={cpc}
            onChange={e => setCpc(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>Spend $</label>
          <input type="number" step="0.01" placeholder="e.g. 20" value={spend}
            onChange={e => setSpend(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>Impressions</label>
          <input type="number" placeholder="optional" value={impressions}
            onChange={e => setImpressions(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-semibold" style={{ color: '#6B7280' }}>Clicks</label>
          <input type="number" placeholder="optional" value={clicks}
            onChange={e => setClicks(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-[11px] font-semibold py-1.5 rounded-md"
          style={{ background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="text-[11px] font-semibold py-1.5 px-3 rounded-md"
          style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Creative Card ────────────────────────────────────────────────────────────

function CreativeCard({
  creative,
  books,
  onUpdate,
  onDelete,
  compact = false,
}: {
  creative: Creative
  books: Book[]
  onUpdate: (id: string, patch: Partial<Creative>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  compact?: boolean
}) {
  const [showLog, setShowLog] = useState(false)
  const isCut = creative.status === 'cut'
  const book  = books.find(b => b.id === creative.bookId)

  async function handleStatusChange(status: string) {
    await onUpdate(creative.id, { status })
  }

  function buildLaunchCopyPrompt() {
    const parts = [
      `Write high-converting ad copy for "${creative.name}"`,
      creative.phase      ? `— ${PHASE_LABELS[creative.phase] ?? creative.phase} phase` : '',
      creative.angle      ? `, ${ANGLE_LABELS[creative.angle] ?? creative.angle} angle`  : '',
      creative.format     ? `. Format: ${FORMAT_LABELS[creative.format] ?? creative.format}` : '',
      creative.targeting  ? `. Targeting: ${TARGETING_CONFIG[creative.targeting]?.label ?? creative.targeting} audience` : '',
      creative.hookText   ? `\n\nHook: "${creative.hookText}"` : '',
      '\n\nInclude: headline, caption copy (150 chars), and 3 hook variations.',
    ]
    return parts.join('')
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(buildLaunchCopyPrompt())
    } catch { /* ignore */ }
    window.open('https://claude.ai/new', '_blank')
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: '#FFFFFF',
        border: '0.5px solid #E5DDD5',
        opacity: isCut ? 0.5 : 1,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ height: compact ? 100 : 130, background: '#F3F4F6' }}>
        {creative.thumbnailUrl ? (
          <img
            src={creative.thumbnailUrl}
            alt={creative.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ border: '2px dashed #D1D5DB', borderRadius: 0 }}>
            <Camera size={20} color="#9CA3AF" strokeWidth={1.5} />
            <span className="text-[10px]" style={{ color: '#9CA3AF' }}>No image</span>
          </div>
        )}
        {/* Status badge top-right */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={creative.status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Name */}
        <div className="font-bold text-[14px] leading-snug" style={{ color: '#1E2D3D' }}>
          {creative.name}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          {creative.variant && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#F3F4F6', color: '#6B7280' }}>
              {creative.variant}
            </span>
          )}
          {creative.phase && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#FFF8F0', color: '#E9A020', border: '1px solid #F6D38A' }}>
              {PHASE_LABELS[creative.phase] ?? creative.phase}
            </span>
          )}
          <TargetingBadge targeting={creative.targeting} />
        </div>

        {/* Angle + format */}
        <div className="text-[12px]" style={{ color: '#9CA3AF' }}>
          {[
            creative.angle  ? ANGLE_LABELS[creative.angle]  : null,
            creative.format ? FORMAT_LABELS[creative.format] : null,
          ].filter(Boolean).join(' · ')}
        </div>

        {/* Book badge */}
        {book && (
          <div className="text-[11px]" style={{ color: '#6B7280' }}>
            {book.title}
          </div>
        )}

        {/* Performance chips */}
        {showLog ? (
          <LogPerformanceForm
            creative={creative}
            onSave={async (patch) => {
              await onUpdate(creative.id, patch)
              setShowLog(false)
            }}
            onCancel={() => setShowLog(false)}
          />
        ) : (
          <>
            <PerformanceChips creative={creative} />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
              {creative.status === 'briefed' && (
                <>
                  <a
                    href="https://www.canva.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md no-underline"
                    style={{ background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' }}
                  >
                    Open in Canva <ExternalLink size={10} />
                  </a>
                  <button onClick={() => handleStatusChange('ready')}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#F0FFF4', color: '#6EBF8B', border: '1px solid #A7F3C8', cursor: 'pointer' }}>
                    Mark ready
                  </button>
                </>
              )}
              {creative.status === 'in-canva' && (
                <button onClick={() => handleStatusChange('ready')}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                  style={{ background: '#F0FFF4', color: '#6EBF8B', border: '1px solid #A7F3C8', cursor: 'pointer' }}>
                  Mark ready
                </button>
              )}
              {creative.status === 'ready' && (
                <>
                  <button onClick={() => handleStatusChange('live')}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#F0FFF4', color: '#6EBF8B', border: '1px solid #A7F3C8', cursor: 'pointer' }}>
                    Mark live
                  </button>
                  <button onClick={handleCopyPrompt}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#FFF4E0', color: '#E9A020', border: '1px solid #F6D38A', cursor: 'pointer' }}>
                    Copy prompt <ExternalLink size={10} />
                  </button>
                </>
              )}
              {creative.status === 'live' && (
                <>
                  <button onClick={() => setShowLog(true)}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#F3F4F6', color: '#1E2D3D', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                    Log performance
                  </button>
                  <button onClick={() => handleStatusChange('cut')}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#FFF1EE', color: '#F97B6B', border: '1px solid #FEC9C2', cursor: 'pointer' }}>
                    Cut it
                  </button>
                </>
              )}
              {(creative.status === 'paused' || creative.status === 'cut') && (
                <>
                  <button onClick={() => handleStatusChange('live')}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#F0FFF4', color: '#6EBF8B', border: '1px solid #A7F3C8', cursor: 'pointer' }}>
                    Revive
                  </button>
                  <button onClick={() => onDelete(creative.id)}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
                    style={{ background: '#FFF1EE', color: '#F97B6B', border: '1px solid #FEC9C2', cursor: 'pointer' }}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sortable Card wrapper for Kanban ─────────────────────────────────────────

function SortableCreativeCard({
  creative,
  books,
  onUpdate,
  onDelete,
}: {
  creative: Creative
  books: Book[]
  onUpdate: (id: string, patch: Partial<Creative>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: creative.id,
    data: { status: creative.status },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CreativeCard creative={creative} books={books} onUpdate={onUpdate} onDelete={onDelete} compact />
    </div>
  )
}

// ─── New Creative Modal ───────────────────────────────────────────────────────

function NewCreativeModal({
  books,
  onClose,
  onCreate,
}: {
  books: Book[]
  onClose: () => void
  onCreate: (data: Partial<Creative>) => Promise<void>
}) {
  const [name,      setName]      = useState('')
  const [bookId,    setBookId]    = useState('')
  const [phase,     setPhase]     = useState('launch')
  const [angle,     setAngle]     = useState('')
  const [format,    setFormat]    = useState('static-image')
  const [sizes,     setSizes]     = useState<string[]>(['1080x1080'])
  const [targeting, setTargeting] = useState('cold')
  const [brief,     setBrief]     = useState('')
  const [hookText,  setHookText]  = useState('')
  const [saving,         setSaving]         = useState(false)
  const [generatingBrief, setGeneratingBrief] = useState(false)

  const selectedBook = books.find(b => b.id === bookId)

  async function handleGenerateBrief() {
    setGeneratingBrief(true)
    setBrief('')
    try {
      const res = await fetch('/api/creative/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedBook?.title ?? '',
          phase,
          angle: ANGLE_LABELS[angle] ?? angle,
          format: FORMAT_LABELS[format] ?? format,
          hookText,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setBrief(text)
      }
    } catch {
      setBrief('Could not generate brief. Please try again.')
    } finally {
      setGeneratingBrief(false)
    }
  }

  function toggleSize(id: string) {
    setSizes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await onCreate({ name, bookId: bookId || null, phase, angle: angle || null, format, sizes, targeting, brief, hookText })
    setSaving(false)
    onClose()
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#1E2D3D',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px',
    fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none',
    background: '#FAFAFA', color: '#1E2D3D', boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,45,61,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-y-auto"
        style={{ background: '#FFFFFF', maxHeight: '90vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #EEEBE6' }}>
          <h2 className="font-bold text-[18px]" style={{ color: '#1E2D3D', margin: 0 }}>
            New creative
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label style={labelStyle}>Creative name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Book Title — Emotional Hook v1" style={inputStyle} />
          </div>

          {/* Book + Phase row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Book</label>
              <select value={bookId} onChange={e => setBookId(e.target.value)} style={selectStyle}>
                <option value="">No book</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phase</label>
              <select value={phase} onChange={e => setPhase(e.target.value)} style={selectStyle}>
                <option value="pre-order">Pre-order</option>
                <option value="launch">Launch</option>
                <option value="post-launch">Post-launch</option>
                <option value="evergreen">Evergreen</option>
              </select>
            </div>
          </div>

          {/* Angle + Format row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Angle</label>
              <select value={angle} onChange={e => setAngle(e.target.value)} style={selectStyle}>
                <option value="">None</option>
                <option value="emotional">Emotional</option>
                <option value="tension">Tension</option>
                <option value="trope-stack">Trope stack</option>
                <option value="social-proof">Social proof</option>
                <option value="passage-quote">Passage quote</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)} style={selectStyle}>
                <option value="static-image">Static image</option>
                <option value="reel">Reel</option>
                <option value="carousel">Carousel</option>
                <option value="story">Story</option>
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label style={labelStyle}>Sizes</label>
            <div className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map(s => {
                const selected = sizes.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSize(s.id)}
                    className="text-left rounded-xl p-3 transition-all"
                    style={{
                      background:  selected ? '#FFF8EC' : '#FFFFFF',
                      border:      selected ? '2px solid #E9A020' : '1.5px solid #E5E7EB',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="font-bold text-[12px] mb-0.5" style={{ color: selected ? '#E9A020' : '#1E2D3D' }}>
                      {s.name}
                    </div>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: selected ? '#C97D0E' : '#6B7280' }}>
                      {s.dims}
                    </div>
                    <div className="text-[10px] leading-snug" style={{ color: '#9CA3AF' }}>
                      {s.placements}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] leading-relaxed mt-2" style={{ color: '#9CA3AF', margin: '8px 0 0' }}>
              For most campaigns: start with <strong style={{ color: '#6B7280' }}>Feed Square (1080×1080)</strong> + <strong style={{ color: '#6B7280' }}>Story (1080×1920)</strong>. Add <strong style={{ color: '#6B7280' }}>Portrait (1080×1350)</strong> for Instagram feed optimization.
            </p>
          </div>

          {/* Targeting */}
          <div>
            <label style={labelStyle}>Targeting</label>
            <select value={targeting} onChange={e => setTargeting(e.target.value)} style={selectStyle}>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="retarget">Retarget</option>
              <option value="newsletter">Newsletter</option>
            </select>
          </div>

          {/* Brief */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Brief</label>
              <button
                onClick={handleGenerateBrief}
                disabled={generatingBrief}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md"
                style={{ background: '#FFF4E0', color: '#E9A020', border: '1px solid #F6D38A', cursor: generatingBrief ? 'not-allowed' : 'pointer', opacity: generatingBrief ? 0.6 : 1 }}>
                {generatingBrief ? 'Generating…' : 'Generate brief'}
              </button>
            </div>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder="Click "Generate brief" to auto-fill, or type your own…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Hook */}
          <div>
            <label style={labelStyle}>Hook text</label>
            <input value={hookText} onChange={e => setHookText(e.target.value)}
              placeholder="e.g. She said yes. He had three hours to disappear." style={inputStyle} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-[14px]"
            style={{
              background: !name.trim() || saving ? '#E5E7EB' : '#1E2D3D',
              color: !name.trim() || saving ? '#9CA3AF' : '#fff',
              border: 'none',
              cursor: !name.trim() || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Creating…' : 'Create creative'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-[14px]"
            style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  creatives,
  books,
  onUpdate,
  onDelete,
}: {
  status: string
  creatives: Creative[]
  books: Book[]
  onUpdate: (id: string, patch: Partial<Creative>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.briefed
  const ids = creatives.map(c => c.id)

  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: 280 }}>
      {/* Column header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <span className="font-bold text-[13px]" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: cfg.color, color: '#fff' }}
        >
          {creatives.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 flex-1">
          {creatives.length === 0 ? (
            <div
              className="rounded-xl flex items-center justify-center py-8"
              style={{
                border: '2px dashed #E5E7EB',
                color: '#9CA3AF',
                fontSize: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Nothing here yet
            </div>
          ) : (
            creatives.map(c => (
              <SortableCreativeCard
                key={c.id}
                creative={c}
                books={books}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function CreativeClient({
  initialCreatives,
  books,
}: {
  initialCreatives: Creative[]
  books: Book[]
}) {
  const [creatives,    setCreatives]    = useState<Creative[]>(initialCreatives)
  const [selectedBook, setSelectedBook] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view,         setView]         = useState<'grid' | 'kanban'>('grid')
  const [showModal,    setShowModal]    = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [activeId,     setActiveId]     = useState<string | null>(null)

  // Persist view to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('creative-hub-view')
    if (saved === 'kanban' || saved === 'grid') setView(saved)
  }, [])
  useEffect(() => {
    localStorage.setItem('creative-hub-view', view)
  }, [view])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
  }, [])

  // Filtered by book
  const bookFiltered = useMemo(() => {
    if (selectedBook === 'all') return creatives
    return creatives.filter(c => c.bookId === selectedBook)
  }, [creatives, selectedBook])

  // Counts per status (for filter pills)
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookFiltered.length }
    for (const s of ALL_STATUSES) {
      c[s] = bookFiltered.filter(x => x.status === s).length
    }
    return c
  }, [bookFiltered])

  // Final display list (grid view)
  const displayed = useMemo(() => {
    if (statusFilter === 'all') return bookFiltered
    return bookFiltered.filter(c => c.status === statusFilter)
  }, [bookFiltered, statusFilter])

  // Kanban groups
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, Creative[]> = {}
    for (const s of KANBAN_COLS) groups[s] = []
    for (const c of bookFiltered) {
      const col = KANBAN_COLS.includes(c.status) ? c.status : 'briefed'
      groups[col].push(c)
    }
    return groups
  }, [bookFiltered])

  // Active creative for drag overlay
  const activeCreative = useMemo(
    () => creatives.find(c => c.id === activeId) ?? null,
    [creatives, activeId]
  )

  async function handleUpdate(id: string, patch: Partial<Creative>) {
    try {
      const res = await fetch(`/api/creative/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const { creative } = await res.json()
      setCreatives(prev => prev.map(c => c.id === id ? { ...c, ...creative } : c))
      if (patch.status) showToast(`Moved to ${STATUS_CONFIG[patch.status]?.label ?? patch.status}`)
    } catch {
      showToast('Update failed', false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/creative/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCreatives(prev => prev.filter(c => c.id !== id))
      showToast('Creative deleted')
    } catch {
      showToast('Delete failed', false)
    }
  }

  async function handleCreate(data: Partial<Creative>) {
    try {
      const res = await fetch('/api/creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const { creative } = await res.json()
      setCreatives(prev => [creative, ...prev])
      showToast('Creative created')
    } catch {
      showToast('Create failed', false)
    }
  }

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const draggedId    = active.id as string
    const overData     = over.data?.current as { status?: string } | undefined
    const targetStatus = overData?.status ?? (over.id as string)

    const dragged = creatives.find(c => c.id === draggedId)
    if (!dragged || !KANBAN_COLS.includes(targetStatus)) return
    if (dragged.status === targetStatus) return

    await handleUpdate(draggedId, { status: targetStatus })
  }

  const selectedBookObj = books.find(b => b.id === selectedBook)

  return (
    <div style={{ background: '#FFF8F0', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-[22px] m-0" style={{ color: '#1E2D3D' }}>
            Creative Hub
          </h1>
          {/* Book filter badge */}
          <div className="relative">
            <select
              value={selectedBook}
              onChange={e => setSelectedBook(e.target.value)}
              className="appearance-none text-[12px] font-semibold pl-3 pr-7 py-1.5 rounded-full cursor-pointer"
              style={{
                background: selectedBook !== 'all' ? '#FFF4E0' : '#F3F4F6',
                color: selectedBook !== 'all' ? '#E9A020' : '#6B7280',
                border: selectedBook !== 'all' ? '1px solid #F6D38A' : '1px solid #E5E7EB',
                outline: 'none',
              }}
            >
              <option value="all">All books</option>
              {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 pointer-events-none"
              style={{ transform: 'translateY(-50%)', color: '#6B7280' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid #E5E7EB', background: '#F3F4F6' }}
          >
            <button
              onClick={() => setView('grid')}
              title="Grid view"
              className="flex items-center justify-center w-8 h-8 transition-colors"
              style={{
                background: view === 'grid' ? '#1E2D3D' : 'transparent',
                color: view === 'grid' ? '#fff' : '#6B7280',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setView('kanban')}
              title="Kanban view"
              className="flex items-center justify-center w-8 h-8 transition-colors"
              style={{
                background: view === 'kanban' ? '#1E2D3D' : 'transparent',
                color: view === 'kanban' ? '#fff' : '#6B7280',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Columns size={15} />
            </button>
          </div>

          {/* New creative button */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-[13px]"
            style={{ background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} strokeWidth={2.5} /> New creative
          </button>
        </div>
      </div>

      {/* Status filter pills (grid view only) */}
      {view === 'grid' && (
        <div
          className="flex items-center gap-2 px-6 py-3 overflow-x-auto"
          style={{ borderBottom: '1px solid #EEEBE6', background: '#FFFFFF' }}
        >
          {(['all', ...ALL_STATUSES] as string[]).map(s => {
            const active = statusFilter === s
            const cfg    = s === 'all' ? null : STATUS_CONFIG[s]
            const label  = s === 'all' ? 'All' : cfg?.label ?? s
            const count  = counts[s] ?? 0
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: active ? (cfg?.color ?? '#1E2D3D') : '#F3F4F6',
                  color:      active ? '#fff' : '#6B7280',
                  border:     active ? 'none' : '1px solid #E5E7EB',
                  cursor: 'pointer',
                }}
              >
                {label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
                    color:      active ? '#fff' : '#6B7280',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Board */}
      <div className="p-6">
        {view === 'grid' ? (
          displayed.length === 0 ? (
            /* Empty state */
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ border: '2px dashed #D1D5DB' }}
            >
              <span className="text-[15px] font-semibold mb-3" style={{ color: '#9CA3AF' }}>
                {statusFilter === 'all' ? 'Add your first creative' : `No ${STATUS_CONFIG[statusFilter]?.label ?? statusFilter} creatives`}
              </span>
              {statusFilter === 'all' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-[13px]"
                  style={{ background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={14} strokeWidth={2.5} /> New creative
                </button>
              )}
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {displayed.map(c => (
                <CreativeCard
                  key={c.id}
                  creative={c}
                  books={books}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        ) : (
          /* Kanban */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ minHeight: '60vh' }}
            >
              {KANBAN_COLS.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  creatives={kanbanGroups[status] ?? []}
                  books={books}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCreative && (
                <div style={{ width: 280, opacity: 0.9 }}>
                  <CreativeCard
                    creative={activeCreative}
                    books={books}
                    onUpdate={async () => {}}
                    onDelete={async () => {}}
                    compact
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* New creative modal */}
      {showModal && (
        <NewCreativeModal
          books={books}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
