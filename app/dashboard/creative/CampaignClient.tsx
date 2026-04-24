'use client'
// app/dashboard/creative/CampaignClient.tsx
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ChevronRight, ChevronDown, Plus, Trash2, Copy, Link, X, Check, Pencil, MoreHorizontal,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Ad {
  id: string
  adSetId: string
  generatedName: string
  creativeId: string | null
  status: string
  ctr: number | null
  cpc: number | null
  spend: number | null
  metaAdId: string | null
  createdAt: string
}

interface AdSet {
  id: string
  campaignId: string
  name: string
  targeting: string
  audience: string | null
  dailyBudget: number | null
  status: string
  metaAdSetId: string | null
  createdAt: string
  ads: Ad[]
}

interface Campaign {
  id: string
  userId: string
  bookId: string | null
  name: string
  phase: string
  objective: string
  status: string
  dailyBudget: number | null
  metaCampaignId: string | null
  createdAt: string
  adSets: AdSet[]
}

interface Creative {
  id: string
  name: string
  angle: string | null
  format: string
  status: string
}

// ─── Naming convention ───────────────────────────────────────────────────────

const BOOK_SLOT_OPTIONS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'LM', 'SRS']
const PHASE_CODES: Record<string, string> = {
  'pre-order': 'PH1', launch: 'PH2', 'post-launch': 'PH3', evergreen: 'EVG',
}
const OBJECTIVE_CODES: Record<string, string> = {
  'list-building': 'LM', traffic: 'TRAFFIC', ku: 'KU', series: 'SERIES',
}
const ANGLE_OPTIONS = ['EMOTIONAL', 'TENSION', 'TROPE', 'PROOF', 'QUOTE', 'HOOK']
const FORMAT_OPTIONS = ['IMAGE', 'VIDEO', 'REEL', 'CAROUSEL']

const OBJECTIVE_LABELS: Record<string, string> = {
  'list-building': 'List Building', traffic: 'Traffic', ku: 'KU', series: 'Series',
}
const PHASE_LABELS: Record<string, string> = {
  'pre-order': 'Pre-order', launch: 'Launch', 'post-launch': 'Post-launch', evergreen: 'Evergreen',
}
const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  'pre-order':  { color: '#3B82F6', bg: '#EFF6FF' },
  launch:       { color: '#6EBF8B', bg: '#F0FFF4' },
  'post-launch':{ color: '#D97706', bg: '#FFF4E0' },
  evergreen:    { color: '#8B5CF6', bg: '#F5F3FF' },
}
const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft:  { color: '#6B7280', bg: '#F3F4F6' },
  active: { color: '#6EBF8B', bg: '#F0FFF4' },
  paused: { color: '#F97316', bg: '#FFF7ED' },
  ended:  { color: '#F97B6B', bg: '#FFF1EE' },
}
const TARGETING_COLORS: Record<string, { color: string; bg: string }> = {
  cold:       { color: '#3B82F6', bg: '#EFF6FF' },
  warm:       { color: '#D97706', bg: '#FFF4E0' },
  retarget:   { color: '#8B5CF6', bg: '#F5F3FF' },
  newsletter: { color: '#6EBF8B', bg: '#F0FFF4' },
}

function buildAdName(
  bookSlot: string,
  phase: string,
  objective: string,
  angle: string,
  format: string,
  version: number,
): string {
  const p = PHASE_CODES[phase] ?? phase.toUpperCase()
  const o = OBJECTIVE_CODES[objective] ?? objective.toUpperCase()
  return `${bookSlot}_${p}_${o}_${angle}_${format}_V${version}`
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onDone }: { msg: string; ok: boolean; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 px-4 py-2.5 text-sm font-medium"
      style={{
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transform: 'translateX(-50%)',
        background: ok ? '#D97706' : '#F97B6B',
        color: '#fff',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {msg}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.draft
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 capitalize"
      style={{ borderRadius: 2, background: cfg.bg, color: cfg.color }}>
      {status}
    </span>
  )
}

// ─── Inline editable name ────────────────────────────────────────────────────

function InlineEditableName({
  value,
  onSave,
  style,
  forceEditKey,
}: {
  value: string
  onSave: (name: string) => Promise<void>
  style?: React.CSSProperties
  forceEditKey?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (forceEditKey) { setEditing(true); setDraft(value) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceEditKey])

  async function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return }
    setSaving(true)
    await onSave(trimmed)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); void commit() }
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        onClick={e => e.stopPropagation()}
        disabled={saving}
        style={{
          ...style,
          border: '1px solid #D97706',
          borderRadius: 2,
          padding: '2px 6px',
          outline: 'none',
          background: '#FFFDF7',
          minWidth: 80,
          width: '100%',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      />
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 group/name cursor-text"
      style={style}
      onClick={e => { e.stopPropagation(); setEditing(true); setDraft(value) }}
    >
      {value}
      <Pencil
        size={10}
        className="opacity-0 group-hover/name:opacity-60 transition-opacity flex-shrink-0"
        style={{ color: '#9CA3AF' }}
      />
    </span>
  )
}

// ─── Inline add-ad form ───────────────────────────────────────────────────────

function AddAdForm({
  adSet,
  campaign,
  existingAdCount,
  onAdd,
  onCancel,
}: {
  adSet: AdSet
  campaign: Campaign
  existingAdCount: number
  onAdd: (name: string) => Promise<void>
  onCancel: () => void
}) {
  const [bookSlot, setBookSlot] = useState('B1')
  const [angle,    setAngle]    = useState('EMOTIONAL')
  const [format,   setFormat]   = useState('IMAGE')
  const [saving,   setSaving]   = useState(false)

  const version = existingAdCount + 1
  const preview = buildAdName(bookSlot, campaign.phase, campaign.objective, angle, format, version)

  async function handleAdd() {
    setSaving(true)
    await onAdd(preview)
    setSaving(false)
  }

  const sel: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 8px',
    fontSize: 11, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none',
    background: '#FAFAFA', color: '#1E2D3D', cursor: 'pointer',
  }

  return (
    <div className="flex flex-col gap-2 mt-2 p-3"
      style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #E8E1D3', marginLeft: 80 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={bookSlot} onChange={e => setBookSlot(e.target.value)} style={sel}>
          {BOOK_SLOT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={angle} onChange={e => setAngle(e.target.value)} style={sel}>
          {ANGLE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={format} onChange={e => setFormat(e.target.value)} style={sel}>
          {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="font-mono text-[11px] px-2 py-1.5" style={{ borderRadius: 2, background: '#1E2D3D', color: '#D97706' }}>
        {preview}
      </div>
      <div className="flex gap-1.5">
        <button onClick={handleAdd} disabled={saving}
          className="text-[11px] font-bold px-3 py-1.5"
          style={{ borderRadius: 2, background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Adding…' : 'Add ad'}
        </button>
        <button onClick={onCancel}
          className="text-[11px] font-semibold px-3 py-1.5"
          style={{ borderRadius: 2, background: 'transparent', color: '#6B7280', border: '1px solid #E8E1D3', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Inline add-adset form ────────────────────────────────────────────────────

function AddAdSetForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, targeting: string, audience: string) => Promise<void>
  onCancel: () => void
}) {
  const [name,      setName]      = useState('')
  const [targeting, setTargeting] = useState('cold')
  const [audience,  setAudience]  = useState('')
  const [saving,    setSaving]    = useState(false)

  const inp: React.CSSProperties = {
    border: '1px solid #E8E1D3', borderRadius: 2, padding: '6px 10px',
    fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none',
    background: '#FFFFFF', color: '#1E2D3D', width: '100%',
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name, targeting, audience)
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2 mt-2 p-3"
      style={{ borderRadius: 0, background: '#F7F1E6', border: '1px solid #E8E1D3', marginLeft: 40 }}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold mb-1 block" style={{ color: '#6B7280' }}>Ad Set name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Cold — Lookalike — US/CA" style={inp} />
        </div>
        <div>
          <label className="text-[10px] font-semibold mb-1 block" style={{ color: '#6B7280' }}>Targeting</label>
          <select value={targeting} onChange={e => setTargeting(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}>
            <option value="cold">Cold</option>
            <option value="warm">Warm</option>
            <option value="retarget">Retarget</option>
            <option value="newsletter">Newsletter</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold mb-1 block" style={{ color: '#6B7280' }}>Audience details (optional)</label>
        <input value={audience} onChange={e => setAudience(e.target.value)}
          placeholder="e.g. Romance readers, KU subscribers" style={inp} />
      </div>
      <div className="flex gap-1.5">
        <button onClick={handleAdd} disabled={!name.trim() || saving}
          className="text-[11px] font-bold px-3 py-1.5"
          style={{ borderRadius: 2, background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Adding…' : 'Add ad set'}
        </button>
        <button onClick={onCancel}
          className="text-[11px] font-semibold px-3 py-1.5"
          style={{ borderRadius: 2, background: 'transparent', color: '#6B7280', border: '1px solid #E8E1D3', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Link Creative picker ─────────────────────────────────────────────────────

function LinkCreativePicker({
  creatives,
  onLink,
  onClose,
}: {
  creatives: Creative[]
  onLink: (creativeId: string) => Promise<void>
  onClose: () => void
}) {
  const [linking, setLinking] = useState<string | null>(null)
  return (
    <div className="absolute z-30 right-0 top-7 w-72 overflow-hidden"
      style={{ borderRadius: 0, background: '#FFFFFF', border: '1px solid #E8E1D3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="px-3 py-2.5 font-semibold text-[12px] flex items-center justify-between"
        style={{ borderBottom: '1px solid #E5E7EB', color: '#1E2D3D' }}>
        Link a creative
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
          <X size={14} />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {creatives.length === 0 ? (
          <div className="px-3 py-4 text-[12px] text-center" style={{ color: '#9CA3AF' }}>
            No creatives yet
          </div>
        ) : (
          creatives.map(c => (
            <button key={c.id}
              onClick={async () => { setLinking(c.id); await onLink(c.id); onClose() }}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors hover:bg-gray-50"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate" style={{ color: '#1E2D3D' }}>{c.name}</div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {c.angle} · {c.format} · {c.status}
                </div>
              </div>
              {linking === c.id && <Check size={13} color="#6EBF8B" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Ad row ───────────────────────────────────────────────────────────────────

function AdRow({
  ad,
  creatives,
  onPatch,
  onDelete,
  onToast,
}: {
  ad: Ad
  creatives: Creative[]
  onPatch: (id: string, patch: Partial<Ad>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToast: (msg: string, ok?: boolean) => void
}) {
  const [showLinker, setShowLinker] = useState(false)
  const linkedCreative = creatives.find(c => c.id === ad.creativeId)

  async function handleCopyName() {
    try { await navigator.clipboard.writeText(ad.generatedName) } catch { /* ignore */ }
    onToast('Name copied — paste it into Ads Manager')
  }

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 group"
      style={{ borderRadius: 0, marginLeft: 80, background: '#FFFFFF', border: '1px solid #E8E1D3' }}>
      {/* Name */}
      <div className="flex-1 min-w-0">
        <InlineEditableName
          value={ad.generatedName}
          onSave={(name) => onPatch(ad.id, { generatedName: name })}
          style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1E2D3D' }}
        />
        {linkedCreative && (
          <div className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
            → {linkedCreative.name}
          </div>
        )}
        {/* Performance chips for live ads */}
        {ad.status === 'active' && (ad.ctr != null || ad.spend != null) && (
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {ad.ctr != null && (
              <span className="text-[10px] font-semibold px-2 py-0.5"
                style={{ borderRadius: 2, background: ad.ctr < 1 ? '#FFF1EE' : ad.ctr >= 4 ? '#F0FFF4' : '#F3F4F6', color: ad.ctr < 1 ? '#F97B6B' : ad.ctr >= 4 ? '#6EBF8B' : '#6B7280' }}>
                CTR {ad.ctr.toFixed(2)}%
              </span>
            )}
            {ad.cpc != null && (
              <span className="text-[10px] font-semibold px-2 py-0.5"
                style={{ borderRadius: 2, background: '#F3F4F6', color: '#6B7280' }}>
                CPC ${ad.cpc.toFixed(2)}
              </span>
            )}
            {ad.spend != null && (
              <span className="text-[10px] font-semibold px-2 py-0.5"
                style={{ borderRadius: 2, background: '#F3F4F6', color: '#6B7280' }}>
                Spend ${ad.spend.toFixed(0)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <StatusBadge status={ad.status} />

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 relative">
        <button onClick={handleCopyName} title="Copy name"
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1"
          style={{ borderRadius: 2, background: '#D97706', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>
          <Copy size={10} /> Copy
        </button>
        <button onClick={() => setShowLinker(v => !v)} title="Link creative"
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md"
          style={{ background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
          <Link size={10} /> {linkedCreative ? 'Relink' : 'Link'}
        </button>
        <button onClick={() => onDelete(ad.id)} title="Delete ad"
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          <Trash2 size={12} />
        </button>

        {showLinker && (
          <LinkCreativePicker
            creatives={creatives}
            onLink={async (creativeId) => {
              await onPatch(ad.id, { creativeId })
              onToast('Creative linked')
            }}
            onClose={() => setShowLinker(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Generate Structure modal ─────────────────────────────────────────────────

interface LaunchOption { id: string; bookTitle: string; phase: string; label: string }

function GenerateModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void
  onGenerate: (template: string, launchLabel: string) => Promise<void>
}) {
  const [template,     setTemplate]     = useState<'blank' | 'standard' | 'minimal' | 'starter'>('standard')
  const [launches,     setLaunches]     = useState<LaunchOption[]>([])
  const [launchId,     setLaunchId]     = useState('')
  const [launchsLoad,  setLaunchsLoad]  = useState(true)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    fetch('/api/launches')
      .then(r => r.json())
      .then(data => {
        const opts: LaunchOption[] = (data.launches ?? []).map((l: { id: string; bookTitle: string; phase: string; customPhase?: string }) => ({
          id: l.id,
          bookTitle: l.bookTitle,
          phase: l.phase,
          label: `${l.bookTitle} — ${l.phase === 'Custom' && l.customPhase ? l.customPhase : l.phase}`,
        }))
        setLaunches(opts)
        if (opts.length > 0) setLaunchId(opts[0].id)
      })
      .catch(() => {})
      .finally(() => setLaunchsLoad(false))
  }, [])

  const selectedLabel = launches.find(l => l.id === launchId)?.label ?? ''

  async function handleGenerate() {
    if (!launchId) return
    setLoading(true)
    await onGenerate(template, selectedLabel)
    setLoading(false)
    onClose()
  }

  const optStyle = (active: boolean): React.CSSProperties => ({
    border: active ? '2px solid #D97706' : '1px solid #E8E1D3',
    background: active ? '#FFF4E0' : '#FFFFFF',
    borderRadius: 2, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
    width: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif",
  })

  const selStyle: React.CSSProperties = {
    border: '1px solid #E8E1D3', borderRadius: 2, padding: '8px 12px',
    fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none',
    background: '#FFFFFF', color: '#1E2D3D', cursor: 'pointer', width: '100%',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,45,61,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md overflow-hidden"
        style={{ borderRadius: 0, background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #EEEBE6' }}>
          <h2 className="font-bold text-[18px] m-0" style={{ color: '#1E2D3D' }}>
            Generate structure
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Launch picker */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#1E2D3D' }}>Launch</label>
            {launchsLoad ? (
              <div className="text-[12px] py-2" style={{ color: '#9CA3AF' }}>Loading…</div>
            ) : launches.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: '#9CA3AF' }}>
                No launches yet —{' '}
                <a href="/dashboard/launch" className="underline" style={{ color: '#D97706' }}>
                  create one in Launch Planner first
                </a>
              </div>
            ) : (
              <select value={launchId} onChange={e => setLaunchId(e.target.value)} style={selStyle}>
                {launches.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            )}
          </div>

          {/* Template choices */}
          <div className="flex flex-col gap-2">
            <button style={optStyle(template === 'standard')} onClick={() => setTemplate('standard')}>
              <div className="font-bold text-[13px]" style={{ color: template === 'standard' ? '#D97706' : '#1E2D3D' }}>
                Standard
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                Pre-order + Launch campaigns with recommended ad sets and ads
              </div>
            </button>
            <button style={optStyle(template === 'minimal')} onClick={() => setTemplate('minimal')}>
              <div className="font-bold text-[13px]" style={{ color: template === 'minimal' ? '#D97706' : '#1E2D3D' }}>
                Minimal
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>One campaign, one ad set — build from there</div>
            </button>
            <button style={optStyle(template === 'starter')} onClick={() => setTemplate('starter')}>
              <div className="font-bold text-[13px]" style={{ color: template === 'starter' ? '#D97706' : '#1E2D3D' }}>
                Just Starting Out
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>One simple campaign, one audience — no jargon, just a place to begin.</div>
            </button>
            <button style={optStyle(template === 'blank')} onClick={() => setTemplate('blank')}>
              <div className="font-bold text-[13px]" style={{ color: template === 'blank' ? '#D97706' : '#1E2D3D' }}>
                My structure
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>Blank canvas — add campaigns manually</div>
            </button>
          </div>
          <p className="text-[11px] text-center m-0" style={{ color: '#9CA3AF' }}>
            All names are suggestions — click any to rename.
          </p>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handleGenerate} disabled={loading || !launchId || launchsLoad}
            className="flex-1 py-2.5 font-bold text-[14px]"
            style={{ borderRadius: 2, background: '#1E2D3D', color: '#fff', border: 'none', cursor: loading || !launchId ? 'not-allowed' : 'pointer', opacity: loading || !launchId ? 0.6 : 1 }}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 font-semibold text-[14px]"
            style={{ borderRadius: 2, background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,45,61,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="w-full max-w-sm p-6 flex flex-col gap-4"
        style={{ borderRadius: 0, background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <p className="text-[14px] m-0 leading-relaxed" style={{ color: '#1E2D3D' }}>{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-[13px] font-semibold"
            style={{ borderRadius: 2, background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-bold"
            style={{ borderRadius: 2, background: '#F97B6B', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

function ThreeDotMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
        title="More options">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute z-30 right-0 top-7 w-36 overflow-hidden"
            style={{ borderRadius: 0, background: '#FFFFFF', border: '1px solid #E8E1D3', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onRename() }}
              className="w-full text-left px-3 py-2.5 text-[12px] font-semibold flex items-center gap-2 hover:bg-gray-50"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Pencil size={11} /> Rename
            </button>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete() }}
              className="w-full text-left px-3 py-2.5 text-[12px] font-semibold flex items-center gap-2"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#F97B6B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main CampaignClient ──────────────────────────────────────────────────────

export function CampaignClient({
  initialCampaigns,
  creatives,
}: {
  initialCampaigns: Campaign[]
  creatives: Creative[]
}) {
  const [campaigns,       setCampaigns]       = useState<Campaign[]>(initialCampaigns)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdSets,  setExpandedAdSets]  = useState<Set<string>>(new Set())
  const [addAdSetFor,     setAddAdSetFor]     = useState<string | null>(null)
  const [addAdFor,        setAddAdFor]        = useState<string | null>(null)
  const [showGenerate,    setShowGenerate]    = useState(false)
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmDelete,   setConfirmDelete]   = useState<{ type: 'campaign' | 'adset'; id: string; campaignId?: string } | null>(null)
  const [renameTriggers,  setRenameTriggers]  = useState<Record<string, number>>({})

  const showToast = useCallback((msg: string, ok = true) => setToast({ msg, ok }), [])

  function toggleCampaign(id: string) {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAdSet(id: string) {
    setExpandedAdSets(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── API helpers ──

  async function createCampaign(data: {
    name: string; phase: string; objective: string; bookId?: string | null
  }): Promise<Campaign | null> {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const { campaign } = await res.json()
      return campaign
    } catch { showToast('Failed to create campaign', false); return null }
  }

  async function deleteCampaign(id: string) {
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      setCampaigns(prev => prev.filter(c => c.id !== id))
      showToast('Campaign deleted')
    } catch { showToast('Delete failed', false) }
  }

  async function deleteAdSet(adSetId: string, campaignId: string) {
    try {
      await fetch(`/api/adsets/${adSetId}`, { method: 'DELETE' })
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, adSets: c.adSets.filter(s => s.id !== adSetId) } : c
      ))
      showToast('Ad set deleted')
    } catch { showToast('Delete failed', false) }
  }

  function triggerRename(id: string) {
    setRenameTriggers(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  async function addAdSet(campaignId: string, name: string, targeting: string, audience: string) {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/adsets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targeting, audience }),
      })
      if (!res.ok) throw new Error()
      const { adSet } = await res.json()
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, adSets: [...c.adSets, adSet] } : c
      ))
      setAddAdSetFor(null)
      setExpandedCampaigns(prev => new Set(Array.from(prev).concat(campaignId)))
      showToast('Ad set added')
    } catch { showToast('Failed to add ad set', false) }
  }

  async function addAd(adSetId: string, campaignId: string, generatedName: string) {
    try {
      const res = await fetch(`/api/adsets/${adSetId}/ads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedName }),
      })
      if (!res.ok) throw new Error()
      const { ad } = await res.json()
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId
          ? {
              ...c,
              adSets: c.adSets.map(s =>
                s.id === adSetId ? { ...s, ads: [...s.ads, ad] } : s
              ),
            }
          : c
      ))
      setAddAdFor(null)
      setExpandedAdSets(prev => new Set(Array.from(prev).concat(adSetId)))
      showToast('Ad added')
    } catch { showToast('Failed to add ad', false) }
  }

  async function patchCampaign(campaignId: string, name: string) {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, name } : c))
    } catch { showToast('Failed to rename campaign', false) }
  }

  async function patchAdSet(adSetId: string, campaignId: string, name: string) {
    try {
      const res = await fetch(`/api/adsets/${adSetId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId
          ? { ...c, adSets: c.adSets.map(s => s.id === adSetId ? { ...s, name } : s) }
          : c
      ))
    } catch { showToast('Failed to rename ad set', false) }
  }

  async function patchAd(adId: string, campaignId: string, patch: Partial<Ad>) {
    try {
      const res = await fetch(`/api/ads/${adId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const { ad: updated } = await res.json()
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId
          ? { ...c, adSets: c.adSets.map(s => ({ ...s, ads: s.ads.map(a => a.id === adId ? updated : a) })) }
          : c
      ))
    } catch { showToast('Update failed', false) }
  }

  async function deleteAd(adId: string, campaignId: string) {
    try {
      await fetch(`/api/ads/${adId}`, { method: 'DELETE' })
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId
          ? { ...c, adSets: c.adSets.map(s => ({ ...s, ads: s.ads.filter(a => a.id !== adId) })) }
          : c
      ))
      showToast('Ad deleted')
    } catch { showToast('Delete failed', false) }
  }

  // ── Generate structure ──

  async function handleGenerate(template: string, launchLabel: string) {
    if (template === 'blank') {
      const c = await createCampaign({ name: `${launchLabel} — New Campaign`, phase: 'launch', objective: 'traffic' })
      if (c) { setCampaigns(prev => [c, ...prev]); showToast('Blank campaign created') }
      return
    }

    if (template === 'minimal') {
      const c = await createCampaign({ name: `${launchLabel} — Traffic`, phase: 'launch', objective: 'traffic' })
      if (!c) return
      const res = await fetch(`/api/campaigns/${c.id}/adsets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cold — Lookalike — US/CA', targeting: 'cold' }),
      })
      if (res.ok) {
        const { adSet } = await res.json()
        setCampaigns(prev => [{ ...c, adSets: [adSet] }, ...prev])
      } else {
        setCampaigns(prev => [c, ...prev])
      }
      showToast('Minimal structure created')
      return
    }

    if (template === 'starter') {
      const c = await createCampaign({ name: `${launchLabel} — Awareness`, phase: 'launch', objective: 'traffic' })
      if (!c) return
      const asRes = await fetch(`/api/campaigns/${c.id}/adsets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Audience', targeting: '' }),
      })
      if (asRes.ok) {
        const { adSet } = await asRes.json()
        const adRes = await fetch(`/api/adsets/${adSet.id}/ads`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generatedName: `${launchLabel} — Ad 1` }),
        })
        const ads = adRes.ok ? [(await adRes.json()).ad] : []
        setCampaigns(prev => [{ ...c, adSets: [{ ...adSet, ads }] }, ...prev])
      } else {
        setCampaigns(prev => [c, ...prev])
      }
      setExpandedCampaigns(prev => new Set(Array.from(prev).concat(c.id)))
      showToast('Campaign created — click any name to rename')
      return
    }

    // Standard: pre-order + launch campaigns
    const newCampaigns: Campaign[] = []

    // Pre-order campaign
    const preorder = await createCampaign({
      name: `${launchLabel} — Pre-Order`,
      phase: 'pre-order', objective: 'list-building',
    })
    if (preorder) {
      const [res1, res2] = await Promise.all([
        fetch(`/api/campaigns/${preorder.id}/adsets`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Cold — Lookalike — US/CA/AU', targeting: 'cold', audience: 'Lookalike audiences' }),
        }),
        fetch(`/api/campaigns/${preorder.id}/adsets`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Cold — Interest — Romance/KU', targeting: 'cold', audience: 'Romance readers, KU subscribers' }),
        }),
      ])
      const adSets: AdSet[] = []
      if (res1.ok) { const { adSet } = await res1.json(); adSets.push(adSet) }
      if (res2.ok) { const { adSet } = await res2.json(); adSets.push(adSet) }

      for (const adSet of [...adSets]) {
        const angles = ['EMOTIONAL', 'TENSION']
        for (let i = 0; i < angles.length; i++) {
          const name = buildAdName('B1', 'pre-order', 'list-building', angles[i], 'IMAGE', i + 1)
          const r = await fetch(`/api/adsets/${adSet.id}/ads`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generatedName: name }),
          })
          if (r.ok) { const { ad } = await r.json(); adSet.ads.push(ad) }
        }
      }
      newCampaigns.push({ ...preorder, adSets })
    }

    // Launch campaign
    const launchCampaign = await createCampaign({
      name: `${launchLabel} — Launch`,
      phase: 'launch', objective: 'traffic',
    })
    if (launchCampaign) {
      const [res1, res2] = await Promise.all([
        fetch(`/api/campaigns/${launchCampaign.id}/adsets`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Warm — Website Retarget', targeting: 'warm', audience: 'Website visitors' }),
        }),
        fetch(`/api/campaigns/${launchCampaign.id}/adsets`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Cold — Lookalike — Scaled', targeting: 'cold', audience: 'Scaled lookalike' }),
        }),
      ])
      const adSets: AdSet[] = []
      if (res1.ok) { const { adSet } = await res1.json(); adSets.push(adSet) }
      if (res2.ok) { const { adSet } = await res2.json(); adSets.push(adSet) }

      const anglesPerSet: string[][] = [['TENSION', 'PROOF'], ['EMOTIONAL']]
      for (let si = 0; si < adSets.length; si++) {
        const angles = anglesPerSet[si] ?? ['EMOTIONAL']
        for (let i = 0; i < angles.length; i++) {
          const name = buildAdName('B1', 'launch', 'traffic', angles[i], 'IMAGE', i + 1)
          const r = await fetch(`/api/adsets/${adSets[si].id}/ads`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generatedName: name }),
          })
          if (r.ok) { const { ad } = await r.json(); adSets[si].ads.push(ad) }
        }
      }
      newCampaigns.push({ ...launchCampaign, adSets })
    }

    setCampaigns(prev => [...newCampaigns, ...prev])
    setExpandedCampaigns(new Set(newCampaigns.map(c => c.id)))
    showToast('Standard structure generated')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#F7F1E6', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #EEEBE6' }}>
        <h2 className="font-bold text-[18px] m-0" style={{ color: '#1E2D3D' }}>
          Campaign Organizer
        </h2>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 px-4 py-2 font-bold text-[13px]"
            style={{ borderRadius: 2, background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2.5} /> Generate structure
          </button>
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
            All names are suggestions — click any to rename
          </span>
        </div>
      </div>

      {/* Tree */}
      <div className="p-6 flex flex-col gap-3">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20"
            style={{ borderRadius: 0, border: '2px dashed #E8E1D3' }}>
            <span className="text-[15px] font-semibold mb-3" style={{ color: '#9CA3AF' }}>
              No campaigns yet
            </span>
            <button onClick={() => setShowGenerate(true)}
              className="flex items-center gap-1.5 px-4 py-2 font-bold text-[13px]"
              style={{ borderRadius: 2, background: '#1E2D3D', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Generate structure
            </button>
          </div>
        ) : (
          campaigns.map(campaign => {
            const expanded  = expandedCampaigns.has(campaign.id)
            const phaseCfg  = PHASE_COLORS[campaign.phase] ?? { color: '#6B7280', bg: '#F3F4F6' }
            const totalAds  = campaign.adSets.reduce((n, s) => n + s.ads.length, 0)

            return (
              <div key={campaign.id}
                className="overflow-hidden"
                style={{ borderRadius: 0, background: '#FFFFFF', border: '1px solid #E8E1D3' }}>
                {/* Campaign row */}
                <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none group"
                  onClick={() => toggleCampaign(campaign.id)}
                  style={{ borderBottom: expanded ? '1px solid #F3F4F6' : 'none' }}>
                  {/* Expand icon */}
                  <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  {/* Phase dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: phaseCfg.color }} />
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <InlineEditableName
                      value={campaign.name}
                      onSave={(name) => patchCampaign(campaign.id, name)}
                      style={{ fontWeight: 700, fontSize: 14, color: '#1E2D3D' }}
                      forceEditKey={renameTriggers[campaign.id]}
                    />
                  </div>
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5"
                      style={{ borderRadius: 2, background: phaseCfg.bg, color: phaseCfg.color }}>
                      {PHASE_LABELS[campaign.phase] ?? campaign.phase}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5"
                      style={{ borderRadius: 2, background: '#F3F4F6', color: '#6B7280' }}>
                      {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
                    </span>
                    <StatusBadge status={campaign.status} />
                    {campaign.dailyBudget != null && (
                      <span className="text-[11px]" style={{ color: '#6B7280' }}>
                        ${campaign.dailyBudget}/day
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      {campaign.adSets.length} sets · {totalAds} ads
                    </span>
                  </div>
                  {/* Three-dot menu */}
                  <ThreeDotMenu
                    onRename={() => triggerRename(campaign.id)}
                    onDelete={() => setConfirmDelete({ type: 'campaign', id: campaign.id })}
                  />
                </div>

                {/* Ad sets */}
                {expanded && (
                  <div className="px-4 py-3 flex flex-col gap-2">
                    {campaign.adSets.map(adSet => {
                      const adSetExpanded = expandedAdSets.has(adSet.id)
                      const tCfg = TARGETING_COLORS[adSet.targeting] ?? TARGETING_COLORS.cold

                      return (
                        <div key={adSet.id}>
                          {/* Ad set row */}
                          <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer group"
                            style={{ borderRadius: 0, marginLeft: 20, background: '#F9F7F4', border: '1px solid #E8E1D3' }}
                            onClick={() => toggleAdSet(adSet.id)}>
                            <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
                              {adSetExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <InlineEditableName
                                value={adSet.name}
                                onSave={(name) => patchAdSet(adSet.id, campaign.id, name)}
                                style={{ fontWeight: 600, fontSize: 13, color: '#1E2D3D' }}
                                forceEditKey={renameTriggers[adSet.id]}
                              />
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 capitalize"
                              style={{ borderRadius: 2, background: tCfg.bg, color: tCfg.color }}>
                              {adSet.targeting}
                            </span>
                            {adSet.audience && (
                              <span className="text-[11px] truncate max-w-[140px]" style={{ color: '#9CA3AF' }}>
                                {adSet.audience}
                              </span>
                            )}
                            <StatusBadge status={adSet.status} />
                            <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                              {adSet.ads.length} {adSet.ads.length === 1 ? 'ad' : 'ads'}
                            </span>
                            {/* Add ad button */}
                            <button
                              onClick={e => { e.stopPropagation(); setAddAdFor(adSet.id); setExpandedAdSets(prev => new Set(Array.from(prev).concat(adSet.id))) }}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1"
                              style={{ borderRadius: 2, background: '#D97706', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                              title="Add ad">
                              <Plus size={10} /> Add ad
                            </button>
                            {/* Three-dot menu */}
                            <ThreeDotMenu
                              onRename={() => triggerRename(adSet.id)}
                              onDelete={() => setConfirmDelete({ type: 'adset', id: adSet.id, campaignId: campaign.id })}
                            />
                          </div>

                          {/* Ads */}
                          {adSetExpanded && (
                            <div className="flex flex-col gap-1.5 mt-1.5">
                              {adSet.ads.map(ad => (
                                <AdRow
                                  key={ad.id}
                                  ad={ad}
                                  creatives={creatives}
                                  onPatch={(adId, patch) => patchAd(adId, campaign.id, patch)}
                                  onDelete={(adId) => deleteAd(adId, campaign.id)}
                                  onToast={showToast}
                                />
                              ))}
                              {addAdFor === adSet.id && (
                                <AddAdForm
                                  adSet={adSet}
                                  campaign={campaign}
                                  existingAdCount={adSet.ads.length}
                                  onAdd={(name) => addAd(adSet.id, campaign.id, name)}
                                  onCancel={() => setAddAdFor(null)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add ad set */}
                    {addAdSetFor === campaign.id ? (
                      <AddAdSetForm
                        onAdd={(name, targeting, audience) => addAdSet(campaign.id, name, targeting, audience)}
                        onCancel={() => setAddAdSetFor(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setAddAdSetFor(campaign.id)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 self-start"
                        style={{ borderRadius: 2, marginLeft: 20, background: '#F7F1E6', color: '#6B7280', border: '1px dashed #E8E1D3', cursor: 'pointer' }}>
                        <Plus size={12} /> Add ad set
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGenerate}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={
            confirmDelete.type === 'campaign'
              ? 'Delete this campaign and all its ad sets? This cannot be undone.'
              : 'Delete this ad set and all its ads? This cannot be undone.'
          }
          onConfirm={() => {
            if (confirmDelete.type === 'campaign') {
              void deleteCampaign(confirmDelete.id)
            } else {
              void deleteAdSet(confirmDelete.id, confirmDelete.campaignId!)
            }
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}
    </div>
  )
}
