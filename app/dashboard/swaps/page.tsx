'use client'

import { useState, useEffect, useMemo } from 'react'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import { ChevronDown, X, AlertTriangle, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwapEntry {
  id: string
  promoType: string
  role: string | null
  platform: string
  partnerName: string | null
  partnerListName: string | null
  partnerListSize: number | null
  partnerLink: string | null
  myBook: string | null
  myList: string
  theirBook: string | null
  swapType: string | null
  promoDate: string | null
  confirmation: string
  paymentType: string
  cost: number
  reportedOpenRate: number | null
  reportedClickRate: number | null
  clicks: number | null
  impressions: number | null
  subsGained: number | null
  firstSwap: boolean
  overSwapFlag: boolean
  qualityRating: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface SwapPolicy {
  id: string
  ruleName: string
  category: string
  appliesTo: string
  severity: string
  notes: string | null
  isActive: boolean
  createdAt: string
}

interface AuthorList {
  id: string
  name: string
  isDefault: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS_SWAP = [
  { value: 'bookclicker', label: 'BookClicker' },
  { value: 'bookfunnel',  label: 'BookFunnel'  },
  { value: 'fpa',         label: 'FPA'         },
  { value: 'direct',      label: 'Direct'      },
  { value: 'other',       label: 'Other'       },
]

const PLATFORMS_PAID = [
  { value: 'fussy_librarian',          label: 'Fussy Librarian'          },
  { value: 'booksweeps',               label: 'BookSweeps'               },
  { value: 'bookbub',                  label: 'BookBub'                  },
  { value: 'written_word_media',       label: 'Written Word Media'       },
  { value: 'freebooksy',               label: 'Freebooksy'               },
  { value: 'bargain_booksy',           label: 'Bargain Booksy'           },
  { value: 'book_throne',              label: 'Book Throne'              },
  { value: 'robin_reads',              label: 'Robin Reads'              },
  { value: 'spicy_romance_boyfriends', label: 'Spicy Romance Boyfriends' },
  { value: 'other',                    label: 'Other'                    },
]

const MY_BOOKS = ['MOLR', 'FDMBP', 'Book3', 'ListBuilding']

const CATEGORY_LABELS: Record<string, string> = {
  content_heat: 'Content Heat',
  format:       'Format',
  genre:        'Genre',
  audience:     'Audience',
}

const PLATFORM_LABELS: Record<string, string> = {
  ...Object.fromEntries(PLATFORMS_SWAP.map(p => [p.value, p.label])),
  ...Object.fromEntries(PLATFORMS_PAID.map(p => [p.value, p.label])),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysFromNow(iso: string | null) {
  if (!iso) return null
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
}

function promoLift(entry: SwapEntry) {
  if (!entry.subsGained || !entry.partnerListSize) return null
  return ((entry.subsGained / entry.partnerListSize) * 100).toFixed(1) + '%'
}

function costPerSub(entry: SwapEntry) {
  if (!entry.cost || entry.cost === 0 || !entry.subsGained || entry.subsGained === 0) return '—'
  return '$' + (entry.cost / entry.subsGained).toFixed(2)
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function RolePill({ entry }: { entry: SwapEntry }) {
  if (entry.promoType === 'paid_promo') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(233,160,32,0.15)', color: '#E9A020' }}>
        💰 Paid
      </span>
    )
  }
  if (entry.role === 'inbound') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: 'rgba(249,123,107,0.15)', color: '#F97B6B' }}>
        📣 They promote me
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(244,162,97,0.15)', color: '#F4A261' }}>
      ♥️ I promote them
    </span>
  )
}

function ConfirmationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    applied:   { label: 'Applied',    bg: 'rgba(233,160,32,0.15)',  color: '#E9A020' },
    approved:  { label: '✅ Approved', bg: 'rgba(110,191,139,0.15)', color: '#6EBF8B' },
    cancelled: { label: 'Cancelled',  bg: 'rgba(249,123,107,0.15)', color: '#F97B6B' },
    complete:  { label: 'Complete',   bg: 'rgba(110,191,139,0.15)', color: '#6EBF8B' },
  }
  const s = map[status] ?? map.applied
  return (
    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function QualityBadge({ rating }: { rating: string | null }) {
  if (!rating) return null
  const colors: Record<string, string> = { a: '#6EBF8B', b: '#E9A020', c: '#F4A261', d: '#F97B6B' }
  return (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ background: 'rgba(0,0,0,0.05)', color: colors[rating] ?? '#6B7280' }}>
      {rating.toUpperCase()}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ border: '2px dashed #D1D5DB' }}>
        <span style={{ color: '#D1D5DB', fontSize: 20 }}>○</span>
      </div>
      <p className="text-sm text-center max-w-xs" style={{ color: '#9CA3AF' }}>{text}</p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 py-3 animate-pulse">
      <div className="h-4 rounded w-24" style={{ background: '#F3F4F6' }} />
      <div className="h-4 rounded w-32" style={{ background: '#F3F4F6' }} />
      <div className="h-4 rounded w-20" style={{ background: '#F3F4F6' }} />
      <div className="h-4 rounded flex-1" style={{ background: '#F3F4F6' }} />
    </div>
  )
}

// ─── Inbound Email Setup ─────────────────────────────────────────────────────

const BANNER_DISMISSED_KEY = 'swaps-banner-dismissed'

function InboundEmailSetup() {
  const [address,   setAddress]   = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === 'true')
    }
    fetch('/api/email/inbound-address')
      .then(r => r.json())
      .then(d => { if (d.address) setAddress(d.address) })
      .catch(() => {})
  }, [])

  function handleCopy() {
    if (!address) return
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDismiss() {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="rounded-lg p-4 mb-6" style={{
      background: '#FFF8F0',
      borderLeft: '3px solid #E9A020',
      border: '1px solid #F3E8D0',
      borderLeftColor: '#E9A020',
      borderLeftWidth: '3px',
    }}>
      <div className="flex justify-between items-start mb-1">
        <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>
          Set up automatic swap tracking
        </p>
        <button
          onClick={handleDismiss}
          className="text-xs ml-4 flex-shrink-0"
          style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>

      <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
        Forward your BookClicker emails to this address and they'll appear here automatically.
        Works with Gmail, Yahoo, Outlook, AOL, or any email client.
      </p>

      <div className="flex items-center">
        <input
          readOnly
          value={address ?? 'Loading…'}
          className="flex-1 min-w-0 text-sm px-3 py-2 rounded outline-none"
          style={{
            fontFamily: 'monospace',
            background: '#FFF8F0',
            border: '1px solid #1E2D3D',
            color: '#1E2D3D',
          }}
          onFocus={e => e.target.select()}
        />
        <button
          onClick={handleCopy}
          disabled={!address}
          className="ml-2 text-xs font-semibold px-3 py-2 rounded flex-shrink-0 transition-all"
          style={{
            background: 'transparent',
            color: copied ? '#6EBF8B' : '#E9A020',
            border: `1px solid ${copied ? '#6EBF8B' : '#E9A020'}`,
            cursor: address ? 'pointer' : 'not-allowed',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
        In your email settings, create a forwarding rule for any email from bookclicker.com to this address.
        Or just forward them one at a time — open the email, tap Forward, and send it here.
      </p>
    </div>
  )
}

// ─── Section 1: Swap Policy Rules ────────────────────────────────────────────

function PolicySection({
  policies,
  loading,
  onPolicyAdded,
}: {
  policies: SwapPolicy[]
  loading: boolean
  onPolicyAdded: (p: SwapPolicy) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    ruleName: '', category: 'content_heat', appliesTo: 'both', severity: 'block', notes: '',
  })

  async function handleSave() {
    if (!form.ruleName.trim()) return
    setSaving(true)
    const res  = await fetch('/api/swap-policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      onPolicyAdded(data.policy)
      setShowForm(false)
      setForm({ ruleName: '', category: 'content_heat', appliesTo: 'both', severity: 'block', notes: '' })
    }
    setSaving(false)
  }

  const appliesToLabel = (v: string) =>
    v === 'inbound' ? '📣 They promote me' : v === 'outbound' ? '♥️ I promote them' : 'Both'

  return (
    <CollapsibleSection
      title="My Swap Policies"
      storageKey="swaps-policies"
      defaultOpen={false}
      headerRight={
        <button onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020', border: 'none', cursor: 'pointer' }}>
          + Add Policy
        </button>
      }
    >
      <div className="p-5">
        {loading ? (
          <><SkeletonRow /><SkeletonRow /></>
        ) : policies.length === 0 ? (
          <EmptyState text="No swap policies set. Add rules to flag incompatible bookings automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Rule', 'Category', 'Applies To', 'Severity', 'Notes'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td className="py-2.5 pr-4 font-medium" style={{ color: '#1E2D3D' }}>{p.ruleName}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-sm" style={{ color: '#6B7280' }}>
                      {appliesToLabel(p.appliesTo)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.severity === 'block' ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(249,123,107,0.15)', color: '#F97B6B' }}>🚨 Block</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(233,160,32,0.15)', color: '#E9A020' }}>⚠️ Warn</span>
                      )}
                    </td>
                    <td className="py-2.5 text-sm" style={{ color: '#6B7280' }}>{p.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="mt-5 p-4 rounded-lg" style={{ background: '#FFF8F0', border: '1px solid #E9A020' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1E2D3D' }}>New Policy</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Rule name</label>
                <input value={form.ruleName}
                  onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))}
                  placeholder="e.g. No erotica"
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Category</label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }}>
                  <option value="content_heat">Content Heat</option>
                  <option value="format">Format</option>
                  <option value="genre">Genre</option>
                  <option value="audience">Audience</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Applies To</label>
                <select value={form.appliesTo}
                  onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }}>
                  <option value="inbound">📣 They promote me</option>
                  <option value="outbound">♥️ I promote them</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Severity</label>
                <select value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }}>
                  <option value="block">🚨 Block</option>
                  <option value="warn">⚠️ Warn</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Notes (optional)</label>
                <input value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any context…"
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} disabled={saving}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save Policy'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

// ─── Section 2: Upcoming Swaps ────────────────────────────────────────────────

function UpcomingSwaps({
  swaps,
  loading,
  onStatusChange,
}: {
  swaps: SwapEntry[]
  loading: boolean
  onStatusChange: (id: string, confirmation: string) => void
}) {
  const upcoming = useMemo(() => {
    const now    = Date.now()
    const cutoff = now + 14 * 24 * 60 * 60 * 1000
    return swaps
      .filter(s => {
        if (!s.promoDate) return false
        const t = new Date(s.promoDate).getTime()
        return t >= now && t <= cutoff && s.confirmation !== 'cancelled'
      })
      .sort((a, b) => new Date(a.promoDate!).getTime() - new Date(b.promoDate!).getTime())
  }, [swaps])

  const flags = upcoming.filter(s =>
    s.overSwapFlag ||
    (!s.partnerLink && s.promoType === 'swap') ||
    s.confirmation === 'applied'
  )

  return (
    <CollapsibleSection
      title="Coming Up"
      storageKey="swaps-upcoming"
      defaultOpen={true}
      badge={
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2"
          style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>
          Next 14 days
        </span>
      }
    >
      <div className="p-5">
        {flags.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-lg flex items-start gap-2"
            style={{ background: 'rgba(249,123,107,0.1)', border: '1px solid #F97B6B' }}>
            <AlertTriangle size={16} style={{ color: '#F97B6B', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F97B6B' }}>
                {flags.length} item{flags.length !== 1 ? 's' : ''} need attention
              </p>
              <ul className="mt-1 space-y-0.5">
                {flags.map(s => {
                  const issues: string[] = []
                  if (s.overSwapFlag) issues.push('over-swap flagged')
                  if (!s.partnerLink && s.promoType === 'swap') issues.push('missing partner link')
                  if (s.confirmation === 'applied') issues.push('awaiting approval')
                  return (
                    <li key={s.id} className="text-xs" style={{ color: '#F97B6B' }}>
                      {s.partnerName ?? PLATFORM_LABELS[s.platform] ?? s.platform}: {issues.join(', ')}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : upcoming.length === 0 ? (
          <EmptyState text="No swaps in the next 14 days. Add one below." />
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => {
              const days         = daysFromNow(s.promoDate)
              const partnerLabel = s.partnerName ?? PLATFORM_LABELS[s.platform] ?? s.platform
              return (
                <div key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl"
                  style={{ background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <RolePill entry={s} />
                    <span className="font-semibold text-sm truncate" style={{ color: '#1E2D3D' }}>
                      {partnerLabel}
                    </span>
                    {s.firstSwap && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(110,191,139,0.15)', color: '#6EBF8B' }}>
                        🆕 First Swap
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: '#1E2D3D' }}>
                      {s.role === 'outbound' ? (s.theirBook ?? '—') : (s.myBook ?? '—')}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {s.myList}
                      {s.promoDate && (
                        <> · {formatDate(s.promoDate)}
                          {days !== null && (
                            <span style={{ color: days <= 3 ? '#F97B6B' : '#9CA3AF' }}>
                              {' '}({days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days} days away`})
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ConfirmationBadge status={s.confirmation} />
                    {s.promoType === 'swap' && (
                      s.partnerLink ? (
                        <span className="text-xs flex items-center gap-1" style={{ color: '#6EBF8B' }}>
                          <CheckCircle size={12} /> Link set
                        </span>
                      ) : (
                        <span className="text-xs flex items-center gap-1" style={{ color: '#F97B6B' }}>
                          <AlertTriangle size={12} /> Missing link
                        </span>
                      )
                    )}
                    {s.overSwapFlag && (
                      <span className="text-xs font-semibold" style={{ color: '#E9A020' }}>⚠️</span>
                    )}
                    <select value={s.confirmation}
                      onChange={e => onStatusChange(s.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-xs rounded-lg px-2 py-1 outline-none"
                      style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white', cursor: 'pointer' }}>
                      <option value="applied">Applied</option>
                      <option value="approved">Approved</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

// ─── Add Promo Modal ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  promoType:       'swap',
  role:            'inbound',
  platform:        'bookclicker',
  partnerName:     '',
  partnerListName: '',
  partnerListSize: '',
  partnerLink:     '',
  myBook:          '',
  myList:          '',
  theirBook:       '',
  swapType:        'solo',
  promoDate:       '',
  confirmation:    'applied',
  paymentType:     'swap',
  cost:            '',
  subsGained:      '',
  firstSwap:       false,
  qualityRating:   '',
  notes:           '',
  impressions:     '',
}

function PromoModal({
  lists,
  onClose,
  onCreated,
}: {
  lists: AuthorList[]
  onClose: () => void
  onCreated: (entry: SwapEntry) => void
}) {
  const [form,   setForm]   = useState({ ...EMPTY_FORM, myList: lists[0]?.name ?? '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const f = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/swaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        partnerListSize: form.partnerListSize ? Number(form.partnerListSize) : null,
        cost:            form.cost            ? Number(form.cost)            : 0,
        subsGained:      form.subsGained      ? Number(form.subsGained)      : null,
        impressions:     form.impressions     ? Number(form.impressions)     : null,
      }),
    })
    const data = await res.json()
    if (data.success) {
      onCreated(data.entry)
    } else {
      setError(data.error ?? 'Something went wrong')
      setSaving(false)
    }
  }

  const inputCls = 'w-full text-sm px-3 py-2 rounded-lg outline-none'
  const inputSty = { border: '1.5px solid #D1D5DB', color: '#1E2D3D', background: 'white' }
  const lblSty   = { color: '#6B7280' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: 'white', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <p className="font-semibold text-base" style={{ color: '#1E2D3D' }}>Log a Promo</p>
          <button onClick={onClose} className="p-1 rounded-lg"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['swap', 'paid_promo'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => f('promoType', mode)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
                style={{
                  background: form.promoType === mode ? '#E9A020' : '#F9FAFB',
                  color:      form.promoType === mode ? '#1E2D3D'  : '#6B7280',
                  border:     form.promoType === mode ? 'none'     : '1px solid #E5E7EB',
                  cursor: 'pointer',
                }}>
                {mode === 'swap' ? '🔄 Swap' : '💰 Paid Promo'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.promoType === 'swap' && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Role</label>
                  <select value={form.role} onChange={e => f('role', e.target.value)}
                    className={inputCls} style={inputSty}>
                    <option value="inbound">📣 They promote me</option>
                    <option value="outbound">♥️ I promote them</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Partner name</label>
                  <input value={form.partnerName} onChange={e => f('partnerName', e.target.value)}
                    placeholder="Author or publisher name"
                    className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Their list name</label>
                  <input value={form.partnerListName} onChange={e => f('partnerListName', e.target.value)}
                    placeholder="e.g. Steamy Romance Reads"
                    className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Their list size</label>
                  <input type="number" value={form.partnerListSize}
                    onChange={e => f('partnerListSize', e.target.value)}
                    placeholder="e.g. 8500" className={inputCls} style={inputSty} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Partner link (their book)</label>
                  <input value={form.partnerLink} onChange={e => f('partnerLink', e.target.value)}
                    placeholder="Amazon or BookFunnel URL"
                    className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>My book</label>
                  <select value={form.myBook} onChange={e => f('myBook', e.target.value)}
                    className={inputCls} style={inputSty}>
                    <option value="">— select —</option>
                    {MY_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Their book (title)</label>
                  <input value={form.theirBook} onChange={e => f('theirBook', e.target.value)}
                    placeholder="Book title being promoted"
                    className={inputCls} style={inputSty} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Swap type</label>
                  <select value={form.swapType} onChange={e => f('swapType', e.target.value)}
                    className={inputCls} style={inputSty}>
                    <option value="solo">Solo</option>
                    <option value="feature">Feature</option>
                    <option value="mention">Mention</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Platform</label>
                  <select value={form.platform} onChange={e => f('platform', e.target.value)}
                    className={inputCls} style={inputSty}>
                    {PLATFORMS_SWAP.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {form.promoType === 'paid_promo' && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Platform</label>
                  <select value={form.platform} onChange={e => f('platform', e.target.value)}
                    className={inputCls} style={inputSty}>
                    {PLATFORMS_PAID.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>My book</label>
                  <select value={form.myBook} onChange={e => f('myBook', e.target.value)}
                    className={inputCls} style={inputSty}>
                    <option value="">— select —</option>
                    {MY_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={lblSty}>Estimated reach</label>
                  <input type="number" value={form.impressions}
                    onChange={e => f('impressions', e.target.value)}
                    placeholder="e.g. 50000" className={inputCls} style={inputSty} />
                </div>
              </>
            )}

            {/* Shared fields */}
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>My list</label>
              <select value={form.myList} onChange={e => f('myList', e.target.value)}
                className={inputCls} style={inputSty}>
                {lists.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Promo date</label>
              <input type="date" value={form.promoDate} onChange={e => f('promoDate', e.target.value)}
                className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Confirmation</label>
              <select value={form.confirmation} onChange={e => f('confirmation', e.target.value)}
                className={inputCls} style={inputSty}>
                <option value="applied">Applied</option>
                <option value="approved">Approved</option>
                <option value="cancelled">Cancelled</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Cost ($)</label>
              <input type="number" step="0.01" value={form.cost}
                onChange={e => f('cost', e.target.value)}
                placeholder="0.00" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Subs gained</label>
              <input type="number" value={form.subsGained}
                onChange={e => f('subsGained', e.target.value)}
                placeholder="e.g. 47" className={inputCls} style={inputSty} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={lblSty}>Quality rating</label>
              <select value={form.qualityRating} onChange={e => f('qualityRating', e.target.value)}
                className={inputCls} style={inputSty}>
                <option value="">— none —</option>
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
            {form.promoType === 'swap' && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" id="modal-firstSwap"
                  checked={form.firstSwap as boolean}
                  onChange={e => f('firstSwap', e.target.checked)}
                  className="w-4 h-4 rounded" style={{ accentColor: '#6EBF8B' }} />
                <label htmlFor="modal-firstSwap" className="text-sm"
                  style={{ color: '#1E2D3D', cursor: 'pointer' }}>
                  🆕 First swap with this partner
                </label>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={lblSty}>Notes</label>
              <textarea value={form.notes as string} onChange={e => f('notes', e.target.value)}
                rows={2} placeholder="Anything worth remembering…"
                className={`${inputCls} resize-none`} style={inputSty} />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: '#F97B6B' }}>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Log Promo'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-lg"
              style={{ border: '1px solid #E5E7EB', color: '#6B7280', background: 'transparent', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Section 3: Promo Log ─────────────────────────────────────────────────────

function PromoLog({
  swaps,
  lists,
  loading,
  onSwapAdded,
  onSwapUpdated,
}: {
  swaps: SwapEntry[]
  lists: AuthorList[]
  loading: boolean
  onSwapAdded: (entry: SwapEntry) => void
  onSwapUpdated: (entry: SwapEntry) => void
}) {
  const [roleFilter, setRoleFilter] = useState<'all' | 'inbound' | 'outbound' | 'paid_promo'>('all')
  const [listFilter, setListFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('30')
  const [search,     setSearch]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal,  setShowModal]  = useState(false)
  const [savingId,   setSavingId]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const days = dateFilter !== '0' ? Number(dateFilter) : 0
    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0

    return swaps.filter(s => {
      if (roleFilter === 'paid_promo' && s.promoType !== 'paid_promo') return false
      if (roleFilter === 'inbound'  && (s.promoType !== 'swap' || s.role !== 'inbound'))  return false
      if (roleFilter === 'outbound' && (s.promoType !== 'swap' || s.role !== 'outbound')) return false
      if (listFilter !== 'all' && s.myList !== listFilter) return false
      if (since && s.promoDate && new Date(s.promoDate).getTime() < since) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(s.partnerName ?? s.platform ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [swaps, roleFilter, listFilter, dateFilter, search])

  async function handleStatusChange(id: string, confirmation: string) {
    setSavingId(id)
    const res  = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    })
    const data = await res.json()
    if (data.success) onSwapUpdated(data.entry)
    setSavingId(null)
  }

  const TABS = [
    { key: 'all',        label: 'All' },
    { key: 'inbound',    label: '📣 They promote me' },
    { key: 'outbound',   label: '♥️ I promote them' },
    { key: 'paid_promo', label: '💰 Paid Promos' },
  ] as const

  return (
    <CollapsibleSection
      title="All Promos"
      storageKey="swaps-log"
      defaultOpen={false}
      headerRight={
        <button onClick={() => setShowModal(true)}
          className="text-xs font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: '#E9A020', color: '#1E2D3D', border: 'none', cursor: 'pointer' }}>
          + Add Promo
        </button>
      }
    >
      <div className="p-5">
        {/* Role tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setRoleFilter(t.key as typeof roleFilter)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: roleFilter === t.key ? '#1E2D3D' : '#F9FAFB',
                color:      roleFilter === t.key ? '#ffffff'  : '#6B7280',
                border:     roleFilter === t.key ? 'none'     : '1px solid #E5E7EB',
                cursor: 'pointer',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select value={listFilter} onChange={e => setListFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white' }}>
            <option value="all">All lists</option>
            {lists.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white' }}>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="0">All time</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by partner…"
            className="text-sm px-3 py-1.5 rounded-lg outline-none"
            style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white', minWidth: 160 }} />
        </div>

        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : filtered.length === 0 ? (
          <EmptyState text="No promos match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                  {['Date','Role','Partner / Platform','Book','List','Type','List Size','Subs','Lift %','Cost','Cost/Sub','Status',''].map(h => (
                    <th key={h}
                      className="text-left pb-2 pr-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const isExpanded   = expandedId === s.id
                  const partnerLabel = s.partnerName ?? PLATFORM_LABELS[s.platform] ?? s.platform
                  const lift         = promoLift(s)
                  const cps          = costPerSub(s)
                  return (
                    <>
                      <tr key={s.id}
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="cursor-pointer"
                        style={{ borderBottom: '1px solid #F9FAFB' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}>
                        <td className="py-3 pr-3 whitespace-nowrap text-xs" style={{ color: '#6B7280' }}>
                          {formatDate(s.promoDate)}
                        </td>
                        <td className="py-3 pr-3"><RolePill entry={s} /></td>
                        <td className="py-3 pr-3 font-medium" style={{ color: '#1E2D3D' }}>
                          <span className="flex items-center gap-1.5">
                            {partnerLabel}
                            {s.firstSwap && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(110,191,139,0.15)', color: '#6EBF8B' }}>🆕</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-xs" style={{ color: '#6B7280' }}>
                          {s.role === 'outbound' ? (s.theirBook ?? '—') : (s.myBook ?? '—')}
                        </td>
                        <td className="py-3 pr-3 text-xs" style={{ color: '#9CA3AF' }}>{s.myList}</td>
                        <td className="py-3 pr-3 text-xs capitalize" style={{ color: '#6B7280' }}>
                          {s.swapType ?? '—'}
                        </td>
                        <td className="py-3 pr-3 text-xs" style={{ color: '#6B7280' }}>
                          {s.partnerListSize?.toLocaleString() ?? '—'}
                        </td>
                        <td className="py-3 pr-3 text-xs font-medium" style={{ color: '#1E2D3D' }}>
                          {s.subsGained ?? '—'}
                        </td>
                        <td className="py-3 pr-3 text-xs font-medium"
                          style={{ color: lift ? '#6EBF8B' : '#9CA3AF' }}>
                          {lift ?? '—'}
                        </td>
                        <td className="py-3 pr-3 text-xs" style={{ color: '#6B7280' }}>
                          {s.cost > 0 ? `$${s.cost.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 pr-3 text-xs font-medium"
                          style={{ color: cps !== '—' ? '#6EBF8B' : '#9CA3AF' }}>
                          {cps}
                        </td>
                        <td className="py-3 pr-3"><ConfirmationBadge status={s.confirmation} /></td>
                        <td className="py-3">
                          <ChevronDown size={14} style={{
                            color: '#9CA3AF',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.15s',
                          }} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${s.id}-exp`}>
                          <td colSpan={13} className="pb-3">
                            <div className="p-4 rounded-xl"
                              style={{ background: '#FFF8F0', border: '1px solid #E9A020' }}>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {([
                                  ['Platform',    PLATFORM_LABELS[s.platform] ?? s.platform],
                                  ['Partner list', s.partnerListName ?? '—'],
                                  ['Open rate',   s.reportedOpenRate  ? `${s.reportedOpenRate}%`  : '—'],
                                  ['Click rate',  s.reportedClickRate ? `${s.reportedClickRate}%` : '—'],
                                  ['Clicks',      String(s.clicks ?? '—')],
                                  ['Cost',        s.cost > 0 ? `$${s.cost}` : '—'],
                                  ['Payment',     s.paymentType],
                                  ['Quality',     s.qualityRating?.toUpperCase() ?? '—'],
                                ] as [string,string][]).map(([label, val]) => (
                                  <div key={label}>
                                    <p className="font-medium mb-0.5" style={{ color: '#6B7280' }}>{label}</p>
                                    <p style={{ color: '#1E2D3D' }}>{val}</p>
                                  </div>
                                ))}
                              </div>
                              {s.partnerLink && (
                                <a href={s.partnerLink} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs mt-3"
                                  style={{ color: '#E9A020', textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> Partner link
                                </a>
                              )}
                              {s.notes && (
                                <p className="text-xs mt-3 italic" style={{ color: '#6B7280' }}>
                                  Notes: {s.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                <select value={s.confirmation}
                                  onChange={e => handleStatusChange(s.id, e.target.value)}
                                  disabled={savingId === s.id}
                                  className="text-xs rounded-lg px-2 py-1 outline-none"
                                  style={{ border: '1px solid #E5E7EB', color: '#1E2D3D', background: 'white' }}>
                                  <option value="applied">Applied</option>
                                  <option value="approved">Approved</option>
                                  <option value="complete">Complete</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                {savingId === s.id && (
                                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Saving…</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PromoModal
          lists={lists}
          onClose={() => setShowModal(false)}
          onCreated={entry => { onSwapAdded(entry); setShowModal(false) }}
        />
      )}
    </CollapsibleSection>
  )
}

// ─── Section 4: Author Relationships (ARM) ────────────────────────────────────

function AuthorRelationships({ swaps, loading }: { swaps: SwapEntry[]; loading: boolean }) {
  const [tab, setTab] = useState<'partners' | 'platforms'>('partners')

  const { partners, platforms } = useMemo(() => {
    const partnerMap  = new Map<string, SwapEntry[]>()
    const platformMap = new Map<string, SwapEntry[]>()

    swaps.forEach(s => {
      if (s.promoType === 'swap' && s.partnerName) {
        partnerMap.set(s.partnerName, [...(partnerMap.get(s.partnerName) ?? []), s])
      } else if (s.promoType === 'paid_promo') {
        platformMap.set(s.platform, [...(platformMap.get(s.platform) ?? []), s])
      }
    })

    function computeCard(name: string, entries: SwapEntry[]) {
      const sorted = [...entries].sort((a, b) =>
        (b.promoDate ? new Date(b.promoDate).getTime() : 0) -
        (a.promoDate ? new Date(a.promoDate).getTime() : 0)
      )
      const last    = sorted[0]
      const lifts   = entries
        .filter(e => e.subsGained && e.partnerListSize)
        .map(e => (e.subsGained! / e.partnerListSize!) * 100)
      const avgLift = lifts.length
        ? (lifts.reduce((a, b) => a + b, 0) / lifts.length).toFixed(1) + '%'
        : null
      return {
        name,
        count:     entries.length,
        lastDate:  last?.promoDate ?? null,
        lastBook:  last?.role === 'outbound' ? last?.theirBook : last?.myBook,
        lastList:  last?.myList ?? null,
        avgLift,
        totalSubs: entries.reduce((a, e) => a + (e.subsGained ?? 0), 0),
        quality:   last?.qualityRating ?? null,
        notes:     last?.notes ?? null,
      }
    }

    return {
      partners:  Array.from(partnerMap.entries()).map(([n, e]) => computeCard(n, e)).sort((a, b) => b.count - a.count),
      platforms: Array.from(platformMap.entries()).map(([n, e]) => computeCard(n, e)).sort((a, b) => b.totalSubs - a.totalSubs),
    }
  }, [swaps])

  const cards = tab === 'partners' ? partners : platforms

  return (
    <CollapsibleSection
      title="Author Relationships"
      subtitle="One record per partner or platform. Updates automatically as you log promos."
      storageKey="swaps-arm"
      defaultOpen={false}
    >
      <div className="p-5">
        <div className="flex gap-2 mb-5">
          {([['partners', '✍️ Swap Partners'], ['platforms', '💰 Paid Platforms']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              style={{
                background: tab === k ? '#1E2D3D' : '#F9FAFB',
                color:      tab === k ? 'white'    : '#6B7280',
                border:     tab === k ? 'none'     : '1px solid #E5E7EB',
                cursor: 'pointer',
              }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: '#F3F4F6' }} />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <EmptyState text="Your partner records will appear here as you log promos." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(c => (
              <div key={c.name} className="p-4 rounded-xl"
                style={{ background: 'white', border: '1px solid #E5E7EB' }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="font-semibold text-sm leading-tight" style={{ color: '#1E2D3D' }}>
                    {tab === 'platforms' ? (PLATFORM_LABELS[c.name] ?? c.name) : c.name}
                  </p>
                  <QualityBadge rating={c.quality} />
                </div>
                <div className="space-y-1.5">
                  {([
                    ['Total promos', String(c.count)],
                    ['Last promo',   formatDate(c.lastDate)],
                    ...(c.lastBook ? [['Last book', c.lastBook] as [string,string]] : []),
                    ...(c.lastList ? [['Last list', c.lastList] as [string,string]] : []),
                  ] as [string,string][]).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: '#6B7280' }}>{label}</span>
                      <span className="font-medium" style={{ color: '#1E2D3D' }}>{val}</span>
                    </div>
                  ))}
                  {c.avgLift && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6B7280' }}>Avg promo lift</span>
                      <span className="font-semibold" style={{ color: '#6EBF8B' }}>{c.avgLift}</span>
                    </div>
                  )}
                </div>
                {c.notes && (
                  <p className="text-xs mt-3 italic line-clamp-2" style={{ color: '#9CA3AF' }}>{c.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

// ─── Section 5: Performance Summary ──────────────────────────────────────────

function PerformanceSummary({ swaps, loading }: { swaps: SwapEntry[]; loading: boolean }) {
  const [range, setRange] = useState<'30' | '90' | 'all'>('30')

  const filtered = useMemo(() => {
    if (range === 'all') return swaps
    const since = Date.now() - Number(range) * 24 * 60 * 60 * 1000
    return swaps.filter(s => s.promoDate && new Date(s.promoDate).getTime() >= since)
  }, [swaps, range])

  const swapStats = useMemo(() => {
    const inbound  = filtered.filter(s => s.promoType === 'swap' && s.role === 'inbound')
    const outbound = filtered.filter(s => s.promoType === 'swap' && s.role === 'outbound')

    const avgSubsInbound = inbound.length
      ? (inbound.reduce((a, s) => a + (s.subsGained ?? 0), 0) / inbound.length).toFixed(1)
      : null

    const partnerSubs  = new Map<string, number>()
    const partnerLifts = new Map<string, number[]>()
    inbound.forEach(s => {
      if (!s.partnerName) return
      partnerSubs.set(s.partnerName, (partnerSubs.get(s.partnerName) ?? 0) + (s.subsGained ?? 0))
      if (s.subsGained && s.partnerListSize) {
        const arr = partnerLifts.get(s.partnerName) ?? []
        arr.push((s.subsGained / s.partnerListSize) * 100)
        partnerLifts.set(s.partnerName, arr)
      }
    })
    const bestPartnerEntry = Array.from(partnerSubs.entries()).reduce<[string,number]|null>(
      (best, [name, subs]) => (!best || subs > best[1]) ? [name, subs] : best,
      null
    )
    const bestPartner: { name: string; lift: string } | null = bestPartnerEntry
      ? (() => {
          const lifts = partnerLifts.get(bestPartnerEntry[0]) ?? []
          return {
            name: bestPartnerEntry[0],
            lift: lifts.length
              ? (lifts.reduce((a, b) => a + b, 0) / lifts.length).toFixed(1) + '%'
              : '—',
          }
        })()
      : null

    const allSwaps   = filtered.filter(s => s.promoType === 'swap')
    const applied    = allSwaps.filter(s => ['applied','approved','complete'].includes(s.confirmation)).length
    const approved   = allSwaps.filter(s => ['approved','complete'].includes(s.confirmation)).length
    const confirmRate = applied > 0 ? ((approved / applied) * 100).toFixed(0) + '%' : '—'

    const partnerCounts = new Map<string, number>()
    allSwaps.forEach(s => {
      if (s.partnerName) partnerCounts.set(s.partnerName, (partnerCounts.get(s.partnerName) ?? 0) + 1)
    })
    const totalUnique    = partnerCounts.size
    const repeatCount    = Array.from(partnerCounts.values()).filter(v => v >= 2).length
    const conversionRate = totalUnique > 0
      ? ((repeatCount / totalUnique) * 100).toFixed(0) + '%' : '—'

    return { inbound: inbound.length, outbound: outbound.length, avgSubsInbound, bestPartner, confirmRate, conversionRate }
  }, [filtered])

  const paidStats = useMemo(() => {
    const paid       = filtered.filter(s => s.promoType === 'paid_promo')
    const totalSpend = paid.reduce((a, s) => a + (s.cost ?? 0), 0)
    const totalSubs  = paid.reduce((a, s) => a + (s.subsGained ?? 0), 0)
    const avgCPS     = totalSpend > 0 && totalSubs > 0
      ? '$' + (totalSpend / totalSubs).toFixed(2) : '—'

    const platformLifts = new Map<string, number[]>()
    paid.forEach(s => {
      if (s.subsGained && s.partnerListSize) {
        const arr = platformLifts.get(s.platform) ?? []
        arr.push((s.subsGained / s.partnerListSize) * 100)
        platformLifts.set(s.platform, arr)
      }
    })
    const bestPlatformEntry = Array.from(platformLifts.entries()).reduce<[string,number]|null>(
      (best, [platform, lifts]) => {
        const avg = lifts.reduce((a, b) => a + b, 0) / lifts.length
        return (!best || avg > best[1]) ? [platform, avg] : best
      },
      null
    )
    const bestPlatform: { name: string; lift: string } | null = bestPlatformEntry
      ? { name: PLATFORM_LABELS[bestPlatformEntry[0]] ?? bestPlatformEntry[0], lift: bestPlatformEntry[1].toFixed(1) + '%' }
      : null

    return { count: paid.length, totalSpend, avgCPS, bestPlatform }
  }, [filtered])

  function Stat({ label, value, sub }: { label: string; value: string | number | null; sub?: string }) {
    return (
      <div className="py-3" style={{ borderBottom: '1px solid #F9FAFB' }}>
        <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-2xl font-semibold" style={{ color: '#1E2D3D', lineHeight: 1.2 }}>
          {value ?? '—'}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
      </div>
    )
  }

  return (
    <CollapsibleSection
      title="How Swaps Are Working"
      storageKey="swaps-performance"
      defaultOpen={false}
    >
      <div className="p-5">
        <div className="flex gap-2 mb-6">
          {([['30','Last 30 days'],['90','Last 90 days'],['all','All time']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: range === k ? '#1E2D3D' : '#F9FAFB',
                color:      range === k ? 'white'    : '#6B7280',
                border:     range === k ? 'none'     : '1px solid #E5E7EB',
                cursor: 'pointer',
              }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
            <div className="space-y-3">{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {swapStats.inbound === 0 && swapStats.outbound === 0 ? (
              <div className="rounded-xl p-6 flex items-center justify-center min-h-[160px]"
                style={{ border: '2px dashed #E5E7EB' }}>
                <p className="text-sm text-center" style={{ color: '#9CA3AF' }}>
                  No swap data yet. Log your first promo to unlock this.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>
                  Swap Stats
                </p>
                <Stat label="📣 Inbound promos received"   value={swapStats.inbound} />
                <Stat label="♥️ Outbound promos sent"       value={swapStats.outbound} />
                <Stat label="Avg subs gained per 📣 promo"
                  value={swapStats.avgSubsInbound ? Number(swapStats.avgSubsInbound) : '—'} />
                {swapStats.bestPartner && (
                  <Stat label="Best performing partner"
                    value={swapStats.bestPartner.name}
                    sub={`Avg promo lift: ${swapStats.bestPartner.lift}`} />
                )}
                <Stat label="Confirmation rate"            value={swapStats.confirmRate} />
                <Stat label="First swap conversion rate"   value={swapStats.conversionRate}
                  sub="Partners with 2+ promos ÷ total partners" />
              </div>
            )}

            {paidStats.count === 0 ? (
              <div className="rounded-xl p-6 flex items-center justify-center min-h-[160px]"
                style={{ border: '2px dashed #E5E7EB' }}>
                <p className="text-sm text-center" style={{ color: '#9CA3AF' }}>
                  No paid promo data yet. Log your first promo to unlock this.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#6B7280' }}>
                  Paid Promo Stats
                </p>
                <Stat label="Total paid promos"            value={paidStats.count} />
                <Stat label="Total spent"                  value={`$${paidStats.totalSpend.toFixed(2)}`} />
                <Stat label="Avg cost per subscriber"      value={paidStats.avgCPS} />
                {paidStats.bestPlatform && (
                  <Stat label="Best performing platform"
                    value={paidStats.bestPlatform.name}
                    sub={`Avg promo lift: ${paidStats.bestPlatform.lift}`} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SwapsPage() {
  const [swaps,      setSwaps]      = useState<SwapEntry[]>([])
  const [policies,   setPolicies]   = useState<SwapPolicy[]>([])
  const [lists,      setLists]      = useState<AuthorList[]>([])
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [syncMsg,    setSyncMsg]    = useState<{ text: string; color: string } | null>(null)

  async function loadAll() {
    const [sr, pr, lr] = await Promise.all([
      fetch('/api/swaps'),
      fetch('/api/swap-policies'),
      fetch('/api/author-lists'),
    ])
    const [sd, pd, ld] = await Promise.all([sr.json(), pr.json(), lr.json()])
    if (sd?.success) setSwaps(sd.swaps)
    if (pd?.success) setPolicies(pd.policies)
    if (ld?.success) setLists(ld.lists)
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id: string, confirmation: string) {
    const res  = await fetch(`/api/swaps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    })
    const data = await res.json()
    if (data?.success) setSwaps(prev => prev.map(s => s.id === id ? data.entry : s))
  }

  async function handleNotionSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/sync/notion-swaps', { method: 'POST' })
      const data = await res.json()
      if (data?.success) {
        setSyncMsg({ text: `Synced ${data.synced} swaps`, color: '#6EBF8B' })
        await loadAll()
      } else {
        setSyncMsg({ text: 'Sync failed', color: '#F97B6B' })
      }
    } catch {
      setSyncMsg({ text: 'Sync failed', color: '#F97B6B' })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Swaps & Promos</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Track newsletter swaps, paid promos, and partner relationships in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 pt-1">
          {syncMsg && (
            <span className="text-xs font-semibold" style={{ color: syncMsg.color }}>
              {syncMsg.text}
            </span>
          )}
          <button
            onClick={handleNotionSync}
            disabled={syncing}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020', border: '1px solid rgba(233,160,32,0.3)', cursor: 'pointer' }}>
            {syncing ? 'Syncing…' : '↻ Sync from Notion'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <InboundEmailSetup />
        <PolicySection
          policies={policies}
          loading={loading}
          onPolicyAdded={p => setPolicies(prev => [...prev, p])}
        />
        <UpcomingSwaps
          swaps={swaps}
          loading={loading}
          onStatusChange={handleStatusChange}
        />
        <PromoLog
          swaps={swaps}
          lists={lists}
          loading={loading}
          onSwapAdded={entry   => setSwaps(prev => [entry, ...prev])}
          onSwapUpdated={entry => setSwaps(prev => prev.map(s => s.id === entry.id ? entry : s))}
        />
        <AuthorRelationships swaps={swaps} loading={loading} />
        <PerformanceSummary  swaps={swaps} loading={loading} />
      </div>
    </div>
  )
}
