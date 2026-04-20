'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { BookCatalog } from '@/components/BookCatalog'
import { Bot, Mail, Megaphone, BookOpen, PenLine, Lock } from '@/components/icons'
import {
  BookOpen as TabBookOpen,
  Plug,
  User,
  SlidersHorizontal,
  Shield,
  Trash2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

// ── MailerLite list types ─────────────────────────────────────────────────────
interface MLGroup { id: string; name: string; activeCount: number }
interface MLList { id: string; mailerliteId: string; name: string; activeCount: number; unsubCount: number; lastSyncedAt: string | null }

// ── Types ────────────────────────────────────────────────────────────────────
type TabId = 'my-books' | 'connections' | 'profile' | 'preferences' | 'privacy' | 'admin'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

// ── Tab definitions ──────────────────────────────────────────────────────────
const ALL_TABS: {
  id: TabId
  label: string
  description: string
  icon: React.ElementType
  adminOnly?: boolean
}[] = [
  { id: 'my-books',     label: 'My Books',     description: 'Your titles and ASINs',          icon: TabBookOpen },
  { id: 'connections',  label: 'Connections',  description: 'MailerLite, Meta, KDP',           icon: Plug },
  { id: 'profile',      label: 'Profile',      description: 'Your name and display settings',  icon: User },
  { id: 'preferences',  label: 'Preferences',  description: 'Benchmarks and digest email',     icon: SlidersHorizontal },
  { id: 'privacy',      label: 'Privacy',      description: 'Data and account',                icon: Shield },
  { id: 'admin',        label: 'Admin',        description: 'Impersonate users',               icon: ShieldAlert, adminOnly: true },
]

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[13px] font-semibold shadow-lg"
      style={{ background: '#1E2D3D', color: 'white' }}
    >
      {message}
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: active ? 'rgba(110,191,139,0.12)' : 'rgba(30,45,61,0.06)',
        color: active ? '#16a34a' : '#9CA3AF',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ background: active ? '#6EBF8B' : '#D1D5DB' }}
      />
      {label}
    </span>
  )
}

// ── Integration card wrapper ──────────────────────────────────────────────────
function IntegCard({
  children,
  iconBg,
  icon,
  name,
  subtitle,
  statusPill,
}: {
  children?: React.ReactNode
  iconBg: string
  icon: React.ReactNode
  name: string
  subtitle: string
  statusPill: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col rounded-[10px] overflow-hidden"
      style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}
    >
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: '0.5px solid rgba(30,45,61,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>{name}</div>
          <div className="text-[10px] break-words" style={{ color: '#9CA3AF' }}>{subtitle}</div>
        </div>
        <div className="shrink-0">{statusPill}</div>
      </div>
      {children && <div className="px-4 py-3 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

// ── Inline spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="#E0D9D0" strokeWidth="1.5" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="#E9A020" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Amber button ──────────────────────────────────────────────────────────────
function AmberBtn({
  onClick,
  disabled,
  children,
  fullWidth,
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] font-semibold px-3 py-1.5 rounded-[6px] border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed${fullWidth ? ' w-full' : ''}`}
      style={{ background: '#E9A020', color: '#1E2D3D' }}
    >
      {children}
    </button>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="rounded-full relative transition-colors border-none cursor-pointer shrink-0"
      style={{ width: 32, height: 18, background: checked ? '#6EBF8B' : '#D6D3D1' }}
    >
      <div
        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 16 : 2 }}
      />
    </button>
  )
}

// ── Masked API key input ──────────────────────────────────────────────────────
function KeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="password"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[11px] font-mono px-2.5 py-2 rounded-md outline-none"
      style={{
        border: '0.5px solid rgba(30,45,61,0.15)',
        background: '#FFF8F0',
        color: '#1E2D3D',
      }}
    />
  )
}

// ── Panel header ─────────────────────────────────────────────────────────────
function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-8 pt-7 pb-5"
      style={{ borderBottom: '0.5px solid rgba(30,45,61,0.08)' }}
    >
      <div>
        <h2 className="text-[16px] font-medium" style={{ color: '#1E2D3D' }}>{title}</h2>
        {subtitle && (
          <p className="text-[12px] mt-0.5" style={{ color: '#888' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}


// ── Writing Assistant Key Section ─────────────────────────────────────────────
function WritingAssistantKeySection() {
  const [hasKey, setHasKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [showUpdate, setShowUpdate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.anthropicApiKey) {
          setHasKey(true)
          setMaskedKey(d.anthropicApiKey)
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!newKey.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/writing-notebook/setup-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setHasKey(true)
        setMaskedKey(newKey.slice(0, 4) + '...' + newKey.slice(-4))
        setShowUpdate(false)
        setNewKey('')
      } else {
        setError('Invalid key — make sure it starts with sk-ant-')
      }
    } catch {
      setError('Could not verify key')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    await fetch('/api/writing-notebook/setup-key', { method: 'DELETE' })
    setHasKey(false)
    setMaskedKey(null)
  }

  return (
    <div className="rounded-[10px] p-4 mb-6" style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} style={{ color: '#E9A020' }} />
        <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Writing Notebook API Key</span>
      </div>

      {hasKey && !showUpdate ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(110,191,139,0.12)', color: '#6EBF8B' }}>
              Connected
            </span>
            <span className="text-[11px] font-mono" style={{ color: '#9CA3AF' }}>{maskedKey}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpdate(true)}
              className="text-[11px] font-semibold bg-transparent border-none cursor-pointer"
              style={{ color: '#E9A020' }}
            >
              Update key
            </button>
            <button
              onClick={handleRemove}
              className="text-[11px] bg-transparent border-none cursor-pointer"
              style={{ color: '#F97B6B' }}
            >
              Remove key
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[12px] mb-3" style={{ color: '#6B7280' }}>
            Your own Anthropic API key powers the Writing Notebook AI assistant. About $0.01–0.02 per chapter.
          </p>
          <input
            type="password"
            value={newKey}
            onChange={e => { setNewKey(e.target.value); setError(null) }}
            placeholder="sk-ant-..."
            className="w-full text-[11px] font-mono px-2.5 py-2 rounded-md outline-none mb-2"
            style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#FFF8F0', color: '#1E2D3D' }}
          />
          {error && <p className="text-[11px] mb-2" style={{ color: '#F97B6B' }}>{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!newKey.trim() || saving}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-[5px] border-none cursor-pointer disabled:opacity-40"
              style={{ background: '#E9A020', color: '#1E2D3D' }}
            >
              {saving ? 'Verifying...' : 'Save key'}
            </button>
            {showUpdate && (
              <button
                onClick={() => { setShowUpdate(false); setNewKey(''); setError(null) }}
                className="text-[10px] bg-transparent border-none cursor-pointer"
                style={{ color: '#9CA3AF' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MailerLite multi-list manager ────────────────────────────────────────────
function MailerLiteListManager() {
  const [lists,       setLists]       = useState<MLList[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [groups,      setGroups]      = useState<MLGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError,   setGroupsError]   = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [labelInput,    setLabelInput]    = useState('')
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState('')
  const [syncingId,     setSyncingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Load saved lists from DB
  useEffect(() => {
    fetch('/api/mailerlite/lists/saved')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setLists(d.lists ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function openAdd() {
    setShowAdd(true)
    setGroupsLoading(true)
    setGroupsError('')
    setSelectedGroup('')
    setLabelInput('')
    setSaveError('')
    try {
      const res = await fetch('/api/mailerlite/lists')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      // Filter out already-connected groups
      const connectedIds = new Set(lists.map(l => l.mailerliteId))
      setGroups((data.groups ?? []).filter((g: MLGroup) => !connectedIds.has(g.id)))
    } catch (e: unknown) {
      setGroupsError((e as Error).message ?? 'Could not load your MailerLite lists. Check your API key.')
    } finally {
      setGroupsLoading(false)
    }
  }

  async function handleSave() {
    if (!selectedGroup || !labelInput.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/mailerlite/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerliteId: selectedGroup, name: labelInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setLists(prev => [...prev, data.list])
      setShowAdd(false)
    } catch (e: unknown) {
      setSaveError((e as Error).message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id)
    try {
      const res = await fetch('/api/mailerlite/sync', { method: 'POST' })
      const data = await res.json()
      if (data.lists) {
        setLists(prev => prev.map(l => {
          const updated = data.lists.find((u: { id: string; activeCount: number; unsubCount: number }) => u.id === l.id)
          return updated ? { ...l, activeCount: updated.activeCount, unsubCount: updated.unsubCount, lastSyncedAt: new Date().toISOString() } : l
        }))
      }
    } catch {}
    finally { setSyncingId(null) }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/mailerlite/lists/${id}`, { method: 'DELETE' })
      setLists(prev => prev.filter(l => l.id !== id))
    } catch {}
    finally { setConfirmDelete(null) }
  }

  function fmtSync(iso: string | null) {
    if (!iso) return 'Never synced'
    const d = new Date(iso)
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
    if (diffMin < 2) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return <div className="h-6 w-32 rounded animate-pulse" style={{ background: '#E5E7EB' }} />
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
          Your MailerLite Lists
        </span>
        <button
          onClick={openAdd}
          className="text-[11px] font-semibold border-none bg-transparent cursor-pointer"
          style={{ color: '#E9A020' }}
        >
          + Add list
        </button>
      </div>

      {/* Add list panel */}
      {showAdd && (
        <div className="rounded-[8px] p-3 mb-3" style={{ background: '#FFF8F0', border: '0.5px solid rgba(233,160,32,0.35)' }}>
          <div className="text-[11px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>Connect a list</div>
          {groupsLoading ? (
            <div className="text-[11px]" style={{ color: '#9CA3AF' }}>Loading your lists…</div>
          ) : groupsError ? (
            <div className="text-[11px]" style={{ color: '#F97B6B' }}>{groupsError}</div>
          ) : groups.length === 0 ? (
            <div className="text-[11px]" style={{ color: '#9CA3AF' }}>No unconnected lists found in your MailerLite account.</div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[10px] font-medium mb-1" style={{ color: '#6B7280' }}>Select list</div>
                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full text-[11px] px-2.5 py-2 rounded-md outline-none"
                  style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: 'white', color: '#1E2D3D' }}
                >
                  <option value="">— choose —</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.activeCount.toLocaleString()} active)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[10px] font-medium mb-1" style={{ color: '#6B7280' }}>Label</div>
                <input
                  type="text"
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  placeholder="e.g. Romance, Cozy Mystery"
                  className="w-full text-[11px] px-2.5 py-2 rounded-md outline-none"
                  style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: 'white', color: '#1E2D3D' }}
                />
              </div>
              {saveError && <div className="text-[11px]" style={{ color: '#F97B6B' }}>{saveError}</div>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!selectedGroup || !labelInput.trim() || saving}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-[5px] border-none cursor-pointer disabled:opacity-40"
                  style={{ background: '#E9A020', color: '#1E2D3D' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-[10px] border-none bg-transparent cursor-pointer"
                  style={{ color: '#9CA3AF' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List cards */}
      {lists.length === 0 ? (
        <div className="text-center py-6" style={{ color: '#9CA3AF' }}>
          <div className="text-[11px] mb-1">No lists connected yet</div>
          <button onClick={openAdd} className="text-[11px] font-semibold border-none bg-transparent cursor-pointer" style={{ color: '#E9A020' }}>
            + Add your first list
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lists.map(list => (
            <div key={list.id} className="rounded-[8px] px-3 py-2.5 flex items-center gap-3"
              style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)', borderRadius: 8 }}>
              {/* Genre pill */}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: '#1E2D3D', color: 'white' }}>
                {list.name}
              </span>
              {/* Stats */}
              <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                <span className="text-[11px]" style={{ color: '#1E2D3D' }}>
                  <span className="font-semibold">{list.activeCount.toLocaleString()}</span>
                  <span style={{ color: '#9CA3AF' }}> active</span>
                </span>
                <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                  {list.unsubCount.toLocaleString()} unsub
                </span>
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {fmtSync(list.lastSyncedAt)}
                </span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleSync(list.id)}
                  disabled={syncingId === list.id}
                  title="Sync now"
                  className="text-[10px] font-semibold px-2 py-1 rounded-[4px] flex items-center gap-1 disabled:opacity-50"
                  style={{ border: '0.5px solid rgba(30,45,61,0.2)', background: 'transparent', color: '#6B7280', cursor: 'pointer' }}
                >
                  <RefreshCw size={10} className={syncingId === list.id ? 'animate-spin' : ''} />
                  {syncingId === list.id ? 'Syncing' : 'Sync'}
                </button>
                {confirmDelete === list.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: '#F97B6B' }}>Remove?</span>
                    <button onClick={() => handleDelete(list.id)}
                      className="text-[10px] font-semibold border-none bg-transparent cursor-pointer"
                      style={{ color: '#F97B6B' }}>Yes</button>
                    <button onClick={() => setConfirmDelete(null)}
                      className="text-[10px] border-none bg-transparent cursor-pointer"
                      style={{ color: '#9CA3AF' }}>No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(list.id)}
                    title="Remove list"
                    className="flex items-center justify-center border-none bg-transparent cursor-pointer p-1 rounded"
                    style={{ color: '#F97B6B' }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')

  // Active tab
  const [activeTab, setActiveTab] = useState<TabId>('my-books')

  // Hash-based deep linking
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '') as TabId
    const validHashes: TabId[] = ['my-books', 'connections', 'profile', 'preferences', 'privacy', 'admin']
    if (validHashes.includes(hash)) setActiveTab(hash)
  }, [])

  function navigateTab(id: TabId) {
    setActiveTab(id)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`)
    }
  }

  // ── Connection state ──────────────────────────────────────────────────────
  const [hasSavedML,     setHasSavedML]     = useState(false)
  const [hasSavedClaude, setHasSavedClaude] = useState(false)
  const [stripeActive,   setStripeActive]   = useState(false)
  const [metaConnected,  setMetaConnected]  = useState(false)
  const [metaLastSync,   setMetaLastSync]   = useState<string | null>(null)
  const [kdpLastUpload,  setKdpLastUpload]  = useState<string | null>(null)
  const [mlSubscribers,  setMlSubscribers]  = useState<number | null>(null)

  // ── Profile ───────────────────────────────────────────────────────────────
  const [penName,               setPenName]               = useState('')
  const [preferredGreetingName, setPreferredGreetingName] = useState('')
  const [profileSaveState,      setProfileSaveState]      = useState<SaveState>('idle')

  // ── API key inputs ────────────────────────────────────────────────────────
  const [mailerLiteKey,  setMailerLiteKey]  = useState('')
  const [claudeKey,      setClaudeKey]      = useState('')
  const [showMLKey,      setShowMLKey]      = useState(false)
  const [showClaudeKey,  setShowClaudeKey]  = useState(false)
  const [mlSaveState,    setMLSaveState]    = useState<SaveState>('idle')
  const [claudeSaveState,setClaudeSaveState]= useState<SaveState>('idle')

  // ── Meta Ads ──────────────────────────────────────────────────────────────
  const [metaSyncing, setMetaSyncing] = useState(false)
  const [metaSuccess, setMetaSuccess] = useState(false)
  const [metaError,   setMetaError]   = useState(false)

  // ── Benchmarks ────────────────────────────────────────────────────────────
  const [benchmarks, setBenchmarks] = useState({
    email_open_rate:  '25',
    email_click_rate: '2',
    meta_cpc:         '0.15',
    meta_ctr:         '15',
  })
  const [benchmarksSave, setBenchmarksSave] = useState<SaveState>('idle')

  // ── Notifications ─────────────────────────────────────────────────────────
  const [digestEnabled, setDigestEnabled] = useState(true)
  const [digestDays,    setDigestDays]    = useState<string[]>(['monday'])
  const [notifSave,     setNotifSave]     = useState<SaveState>('idle')

  // ── BookFunnel ────────────────────────────────────────────────────────────
  const [bfSecret,        setBfSecret]        = useState<string | null>(null)
  const [bfWebhookUrl,    setBfWebhookUrl]    = useState<string>('')
  const [bfDownloadCount, setBfDownloadCount] = useState<number>(0)
  const [bfConfirmRate,   setBfConfirmRate]   = useState<number>(0)
  const [bfRegenerating,  setBfRegenerating]  = useState(false)
  const [bfCopied,        setBfCopied]        = useState<'url' | 'secret' | null>(null)

  // ── Writing Assistant (BYOK) ──────────────────────────────────────────────
  const [hasWritingKey,      setHasWritingKey]      = useState(false)
  const [writingKeyMasked,   setWritingKeyMasked]   = useState<string | null>(null)
  const [showWritingKeyForm, setShowWritingKeyForm] = useState(false)
  const [writingKeyInput,    setWritingKeyInput]    = useState('')
  const [writingKeySave,     setWritingKeySave]     = useState<SaveState>('idle')

  // ── Help accordion ────────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false)

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) { setToast(msg) }

  // ── KDP file upload ───────────────────────────────────────────────────────
  function openUploadModal() {
    window.dispatchEvent(new CustomEvent('open-upload-modal'))
  }

  // ── Load settings ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const d = await fetch('/api/settings').then(r => r.json())
      setHasSavedML(!!d.mailerLiteKey)
      setHasSavedClaude(!!d.claudeKey)
      setStripeActive(!!d.stripeActive)
      setMetaConnected(!!d.metaConnected)
      setMetaLastSync(d.metaLastSync ?? null)
      setKdpLastUpload(d.kdpLastUpload ?? null)
      setMlSubscribers(d.mlSubscribers ?? null)
      setPenName(d.penName ?? '')
      setPreferredGreetingName(d.preferredGreetingName ?? '')
      setHasWritingKey(!!d.anthropicApiKey)
      setWritingKeyMasked(d.anthropicApiKey ?? null)
    } catch {}
    try {
      const bf = await fetch('/api/bookfunnel').then(r => r.json())
      setBfSecret(bf.secret ?? null)
      setBfWebhookUrl(bf.webhookUrl ?? '')
      setBfDownloadCount(bf.totalCount ?? 0)
      setBfConfirmRate(bf.confirmRate ?? 0)
    } catch {}
    try {
      const p = await fetch('/api/prefs').then(r => r.json())
      const g = p.goals ?? {}
      setBenchmarks({
        email_open_rate:  g.email_open_rate  != null ? String(g.email_open_rate)  : '25',
        email_click_rate: g.email_click_rate != null ? String(g.email_click_rate) : '2',
        meta_cpc:         g.meta_cpc         != null ? String(g.meta_cpc)         : '0.15',
        meta_ctr:         g.meta_ctr         != null ? String(g.meta_ctr)         : '15',
      })
      if (g.weeklyDigest === false) setDigestEnabled(false)
      if (Array.isArray(g.digestDays)) setDigestDays(g.digestDays)
    } catch {}
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // Strip Facebook fragment + handle meta=connected / meta=error
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#_=_') {
      window.history.replaceState
        ? window.history.replaceState(null, '', window.location.href.split('#')[0])
        : (window.location.hash = '')
    }
    if (window.location.search.includes('meta=connected')) {
      setMetaConnected(true)
      setMetaSuccess(true)
      setTimeout(() => setMetaSuccess(false), 4000)
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]?meta=connected/, '')
      window.history.replaceState(null, '', cleanUrl || window.location.pathname)
      window.dispatchEvent(new CustomEvent('meta:connected'))
    }
    if (window.location.search.includes('meta=error')) {
      setMetaError(true)
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]?meta=error/, '')
      window.history.replaceState(null, '', cleanUrl || window.location.pathname)
    }
  }, [])

  // ── Meta handlers ────────────────────────────────────────────────────────
  function connectMeta() {
    try {
      window.location.replace('/api/meta/connect')
    } catch {
      showToast('Could not connect to Meta. Please try again.')
    }
  }

  async function handleMetaSync() {
    setMetaSyncing(true)
    try {
      await fetch('/api/meta/sync', { method: 'POST' })
      await loadSettings()
    } finally {
      setMetaSyncing(false)
    }
  }

  async function handleMetaDisconnect() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect-meta' }),
    })
    setMetaConnected(false)
    setMetaLastSync(null)
    setMetaSuccess(false)
    setMetaError(false)
    window.dispatchEvent(new CustomEvent('meta:disconnected'))
  }

  // ── BookFunnel handlers ──────────────────────────────────────────────────
  async function regenerateBfSecret() {
    setBfRegenerating(true)
    try {
      const res = await fetch('/api/bookfunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-secret' }),
      })
      const json = await res.json()
      if (json.secret) setBfSecret(json.secret)
    } finally {
      setBfRegenerating(false)
    }
  }

  function copyToClipboard(text: string, which: 'url' | 'secret') {
    navigator.clipboard.writeText(text).then(() => {
      setBfCopied(which)
      setTimeout(() => setBfCopied(null), 2000)
    })
  }

  // ── Profile save ─────────────────────────────────────────────────────────
  async function saveProfile() {
    setProfileSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-profile',
          penName: penName.trim(),
          preferredGreetingName: preferredGreetingName.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      setProfileSaveState('saved')
      showToast('Profile saved ✓')
      setTimeout(() => setProfileSaveState('idle'), 3000)
    } catch {
      setProfileSaveState('error')
      setTimeout(() => setProfileSaveState('idle'), 3000)
    }
  }

  // ── API key save handlers ─────────────────────────────────────────────────
  async function saveMLKey() {
    const key = mailerLiteKey.trim()
    if (!key) return
    setMLSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerLiteKey: key }),
      })
      if (!res.ok) throw new Error()
      setHasSavedML(true)
      setMailerLiteKey('')
      setShowMLKey(false)
      setMLSaveState('saved')
      showToast('Saved ✓')
      setTimeout(() => setMLSaveState('idle'), 3000)
      loadSettings()
    } catch {
      setMLSaveState('error')
      setTimeout(() => setMLSaveState('idle'), 3000)
    }
  }

  async function saveClaudeKey() {
    const key = claudeKey.trim()
    if (!key) return
    setClaudeSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeKey: key }),
      })
      if (!res.ok) throw new Error()
      setHasSavedClaude(true)
      setClaudeKey('')
      setShowClaudeKey(false)
      setClaudeSaveState('saved')
      showToast('Saved ✓')
      setTimeout(() => setClaudeSaveState('idle'), 3000)
    } catch {
      setClaudeSaveState('error')
      setTimeout(() => setClaudeSaveState('idle'), 3000)
    }
  }

  // ── Benchmarks save ───────────────────────────────────────────────────────
  async function saveBenchmarks() {
    setBenchmarksSave('saving')
    try {
      const goals = {
        email_open_rate:  parseFloat(benchmarks.email_open_rate)  || 25,
        email_click_rate: parseFloat(benchmarks.email_click_rate) || 2,
        meta_cpc:         parseFloat(benchmarks.meta_cpc)         || 0.15,
        meta_ctr:         parseFloat(benchmarks.meta_ctr)         || 15,
      }
      const res = await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-goals', goals }),
      })
      if (!res.ok) throw new Error()
      setBenchmarksSave('saved')
      showToast('Benchmarks saved ✓')
      setTimeout(() => setBenchmarksSave('idle'), 3000)
    } catch {
      setBenchmarksSave('error')
      setTimeout(() => setBenchmarksSave('idle'), 3000)
    }
  }

  // ── Notifications save ────────────────────────────────────────────────────
  async function saveNotifications() {
    setNotifSave('saving')
    try {
      const res = await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-notifications', weeklyDigest: digestEnabled, digestDays }),
      })
      if (!res.ok) throw new Error()
      setNotifSave('saved')
      showToast('Saved ✓')
      setTimeout(() => setNotifSave('idle'), 3000)
    } catch {
      setNotifSave('error')
      setTimeout(() => setNotifSave('idle'), 3000)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
  const DAY_VALUES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  function fmtDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const diffDays = Math.floor((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000)
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ── Tab content ───────────────────────────────────────────────────────────

  function TabMyBooks() {
    return (
      <div>
        <BookCatalog />
      </div>
    )
  }

  function TabConnections() {
    return (
      <div>
        <PanelHeader title="Connections" subtitle="Manage your integrations and data sources" />
        <div className="px-8 py-6">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>

            {/* MailerLite */}
            <IntegCard
              iconBg="#E8F5E9"
              icon={<Mail size={16} strokeWidth={1.75} color="#34d399" />}
              name="MailerLite"
              subtitle={
                hasSavedML && mlSubscribers != null
                  ? `${Number(mlSubscribers).toLocaleString('en-US')} active subscribers`
                  : hasSavedML
                  ? 'Connected'
                  : 'Connect to sync email stats'
              }
              statusPill={
                <StatusPill active={hasSavedML} label={hasSavedML ? '● Active' : 'Not connected'} />
              }
            >
              {/* API key row */}
              {hasSavedML && !showMLKey ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: '#9CA3AF' }}>Key saved</span>
                  <button
                    onClick={() => setShowMLKey(true)}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline"
                    style={{ color: '#9CA3AF' }}
                  >
                    Update
                  </button>
                </div>
              ) : (
                <>
                  <KeyInput value={mailerLiteKey} onChange={setMailerLiteKey} placeholder="ml_••••••••••••••••••" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <AmberBtn onClick={saveMLKey} disabled={!mailerLiteKey.trim() || mlSaveState === 'saving'}>
                      {mlSaveState === 'saving' ? <Spinner /> : 'Save key'}
                    </AmberBtn>
                    {showMLKey && (
                      <button onClick={() => { setShowMLKey(false); setMailerLiteKey('') }}
                        className="text-[10px] border-none bg-transparent cursor-pointer ml-auto"
                        style={{ color: '#9CA3AF' }}>Cancel</button>
                    )}
                  </div>
                  {mlSaveState === 'saved' && (
                    <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(110,191,139,0.1)', color: '#16a34a' }}>
                      MailerLite connected ✓
                    </div>
                  )}
                  {mlSaveState === 'error' && (
                    <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                      API key not saved — please check your key and try again.
                    </div>
                  )}
                </>
              )}
              {/* Multi-list manager — only shown when key is connected */}
              {hasSavedML && (
                <div style={{ borderTop: '0.5px solid rgba(30,45,61,0.06)', paddingTop: 10, marginTop: 4 }}>
                  <MailerLiteListManager />
                </div>
              )}
            </IntegCard>

            {/* Meta Ads */}
            <IntegCard
              iconBg="#E8F0FE"
              icon={<Megaphone size={16} strokeWidth={1.75} color="#60A5FA" />}
              name="Meta Ads"
              subtitle={
                metaConnected && metaLastSync
                  ? `Synced ${fmtDate(metaLastSync)} · OAuth`
                  : metaConnected
                  ? 'Connected via OAuth'
                  : 'Connect via OAuth'
              }
              statusPill={
                metaConnected ? (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>
                    Dev mode
                  </span>
                ) : (
                  <StatusPill active={false} label="Not connected" />
                )
              }
            >
              {metaConnected ? (
                <>
                  <div className="flex items-center gap-2">
                    <AmberBtn onClick={handleMetaSync} disabled={metaSyncing}>
                      {metaSyncing ? <Spinner /> : 'Sync now'}
                    </AmberBtn>
                    <button onClick={handleMetaDisconnect}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-[5px] border-none cursor-pointer"
                      style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                      Disconnect
                    </button>
                  </div>
                  {isAdmin ? (
                    <div className="text-[10px] leading-relaxed px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(233,160,32,0.06)', border: '0.5px solid rgba(233,160,32,0.25)', color: '#92610a' }}>
                      Only your account can connect in development mode.{' '}
                      <a href="https://developers.facebook.com/docs/app-review" target="_blank" rel="noopener noreferrer"
                        className="font-semibold hover:underline" style={{ color: '#E9A020' }}>
                        Submit for app review →
                      </a>
                    </div>
                  ) : (
                    <div className="text-[10px] leading-relaxed px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(30,45,61,0.04)', border: '0.5px solid rgba(30,45,61,0.1)', color: '#6B7280' }}>
                      Meta Ads connection coming soon — check back shortly.
                    </div>
                  )}
                  {metaSuccess && (
                    <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(110,191,139,0.1)', color: '#16a34a' }}>
                      ✓ Connected! Syncing your ad data now…
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AmberBtn onClick={connectMeta}>Connect Meta Ads →</AmberBtn>
                  {metaError && (
                    <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                      style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                      ✕ Couldn&apos;t connect — check permissions and try again.
                    </div>
                  )}
                </>
              )}
            </IntegCard>

            {/* KDP Report */}
            <IntegCard
              iconBg="#FFF3E0"
              icon={<BookOpen size={16} strokeWidth={1.75} color="#E9A020" />}
              name="KDP Report"
              subtitle={kdpLastUpload ? `Last upload: ${fmtDate(kdpLastUpload)}` : 'File upload — not an API connection'}
              statusPill={
                kdpLastUpload
                  ? <StatusPill active={true} label={`● Uploaded ${fmtDate(kdpLastUpload)}`} />
                  : <StatusPill active={false} label="No uploads yet" />
              }
            >
              {!kdpLastUpload && (
                <p className="text-[11px] leading-relaxed" style={{ color: '#6B7280' }}>
                  Download from <strong style={{ color: '#1E2D3D' }}>KDP → Reports → Royalty Estimator</strong>, then upload here.
                </p>
              )}
              <AmberBtn onClick={openUploadModal}>{kdpLastUpload ? 'Upload new file' : 'Upload KDP report'}</AmberBtn>
              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                KDP doesn&apos;t offer a direct API — upload monthly.
              </p>
            </IntegCard>

            {/* Claude AI (admin only) */}
            {isAdmin && (
              <IntegCard
                iconBg="#EDE7F6"
                icon={<Bot size={16} strokeWidth={1.75} color="#8B5CF6" />}
                name="Claude AI"
                subtitle="Powers your coaching session"
                statusPill={
                  <StatusPill active={hasSavedClaude} label={hasSavedClaude ? '● Active' : 'Not connected'} />
                }
              >
                {hasSavedClaude && !showClaudeKey ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>Key saved</span>
                    <button onClick={() => setShowClaudeKey(true)}
                      className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline"
                      style={{ color: '#9CA3AF' }}>Update</button>
                  </div>
                ) : (
                  <>
                    <KeyInput value={claudeKey} onChange={setClaudeKey} placeholder="sk-ant-••••••••••••••" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <AmberBtn onClick={saveClaudeKey} disabled={!claudeKey.trim() || claudeSaveState === 'saving'}>
                        {claudeSaveState === 'saving' ? <Spinner /> : 'Save key'}
                      </AmberBtn>
                      <span className="text-[10px]" style={{ color: '#9CA3AF' }}>~$0.05–0.15 per analysis</span>
                      {showClaudeKey && (
                        <button onClick={() => { setShowClaudeKey(false); setClaudeKey('') }}
                          className="text-[10px] border-none bg-transparent cursor-pointer ml-auto"
                          style={{ color: '#9CA3AF' }}>Cancel</button>
                      )}
                    </div>
                  </>
                )}
              </IntegCard>
            )}

            {/* BookFunnel */}
            <IntegCard
              iconBg="#E8F5E9"
              icon={<BookOpen size={16} strokeWidth={1.75} color="#4CAF50" />}
              name="BookFunnel"
              subtitle="Tracks book downloads automatically"
              statusPill={
                bfDownloadCount > 0
                  ? <StatusPill active={true} label={`● Active · ${bfDownloadCount} downloads`} />
                  : <StatusPill active={false} label="Not connected" />
              }
            >
              <div className="w-full">
                <div className="text-[9px] font-bold uppercase tracking-[1px] mb-1" style={{ color: '#6B7280' }}>Webhook URL</div>
                <div className="flex items-center gap-1.5">
                  <input readOnly value={bfWebhookUrl}
                    className="flex-1 text-[9px] font-mono px-2 py-1.5 rounded-md outline-none truncate"
                    style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#F9FAFB', color: '#374151' }} />
                  <button onClick={() => copyToClipboard(bfWebhookUrl, 'url')}
                    className="text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap"
                    style={{
                      background: bfCopied === 'url' ? 'rgba(110,191,139,0.15)' : 'rgba(30,45,61,0.06)',
                      color: bfCopied === 'url' ? '#16a34a' : '#6B7280',
                      border: 'none', cursor: 'pointer',
                    }}>
                    {bfCopied === 'url' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="w-full">
                <div className="text-[9px] font-bold uppercase tracking-[1px] mb-1" style={{ color: '#6B7280' }}>
                  Secret Token <span className="normal-case font-normal">(paste into BookFunnel)</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <input readOnly value={bfSecret ? '•'.repeat(32) : '—'}
                    className="w-full text-[9px] font-mono px-2 py-1.5 rounded-md outline-none"
                    style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#F9FAFB', color: '#374151' }} />
                  <div className="flex gap-1.5">
                    <button onClick={() => bfSecret && copyToClipboard(bfSecret, 'secret')}
                      className="flex-1 text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap"
                      style={{
                        background: bfCopied === 'secret' ? 'rgba(110,191,139,0.15)' : 'rgba(30,45,61,0.06)',
                        color: bfCopied === 'secret' ? '#16a34a' : '#6B7280',
                        border: 'none', cursor: 'pointer',
                      }}>
                      {bfCopied === 'secret' ? '✓ Copied' : 'Copy'}
                    </button>
                    <button onClick={regenerateBfSecret} disabled={bfRegenerating}
                      className="flex-1 text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap disabled:opacity-40"
                      style={{ background: 'rgba(30,45,61,0.06)', color: '#6B7280', border: 'none', cursor: 'pointer' }}>
                      {bfRegenerating ? '…' : 'Rotate'}
                    </button>
                  </div>
                </div>
              </div>
              {bfDownloadCount > 0 && (
                <div className="text-[10px]" style={{ color: '#6B7280' }}>
                  {bfDownloadCount} downloads tracked · {bfConfirmRate}% confirmed
                </div>
              )}
            </IntegCard>

            {/* AI Writing Assistant */}
            <IntegCard
              iconBg="#FFF4E0"
              icon={<PenLine size={16} strokeWidth={1.75} color="#E9A020" />}
              name="AI Writing Assistant"
              subtitle="Powers your Writing Notebook"
              statusPill={
                <StatusPill active={hasWritingKey} label={hasWritingKey ? 'Connected' : 'Not connected'} />
              }
            >
              {hasWritingKey && !showWritingKeyForm ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={12} color="#6EBF8B" />
                    <span className="text-[11px] font-medium" style={{ color: '#6EBF8B' }}>Connected</span>
                    <span className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>{writingKeyMasked}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowWritingKeyForm(true)}
                      className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline"
                      style={{ color: '#9CA3AF' }}>Update key</button>
                    <button
                      onClick={async () => {
                        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove-anthropic-key' }) })
                        setHasWritingKey(false)
                        setWritingKeyMasked(null)
                        showToast('Writing assistant key removed')
                      }}
                      className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline"
                      style={{ color: '#F97B6B' }}>Remove key</button>
                  </div>
                </div>
              ) : (
                <>
                  <KeyInput value={writingKeyInput} onChange={setWritingKeyInput} placeholder="sk-ant-••••••••••••••" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <AmberBtn
                      onClick={async () => {
                        setWritingKeySave('saving')
                        try {
                          const res = await fetch('/api/writing-notebook/setup-key', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: writingKeyInput }),
                          })
                          if (res.ok) {
                            setWritingKeySave('saved')
                            setHasWritingKey(true)
                            setShowWritingKeyForm(false)
                            setWritingKeyInput('')
                            showToast('Writing assistant key saved')
                            loadSettings()
                          } else {
                            setWritingKeySave('error')
                            showToast('Invalid key — make sure it starts with sk-ant-')
                          }
                        } catch {
                          setWritingKeySave('error')
                        }
                        setTimeout(() => setWritingKeySave('idle'), 2000)
                      }}
                      disabled={!writingKeyInput.trim() || writingKeySave === 'saving'}
                    >
                      {writingKeySave === 'saving' ? <Spinner /> : 'Save key'}
                    </AmberBtn>
                    <span className="text-[10px]" style={{ color: '#9CA3AF' }}>~$0.01–0.02 per chapter</span>
                    {showWritingKeyForm && (
                      <button onClick={() => { setShowWritingKeyForm(false); setWritingKeyInput('') }}
                        className="text-[10px] border-none bg-transparent cursor-pointer ml-auto"
                        style={{ color: '#9CA3AF' }}>Cancel</button>
                    )}
                  </div>
                </>
              )}
            </IntegCard>
          </div>

          {/* API keys help accordion */}
          <div className="rounded-[10px] mt-4 overflow-hidden"
            style={{ border: '0.5px solid rgba(30,45,61,0.1)', background: 'white' }}>
            <button onClick={() => setHelpOpen(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 border-none cursor-pointer text-left"
              style={{ background: 'transparent' }}>
              <span className="text-[12px] font-semibold" style={{ color: '#1E2D3D' }}>
                🔑 Need help finding your API keys?
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: helpOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <path d="M5 3L9 7L5 11" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {helpOpen && (
              <div className="px-4 pb-4 space-y-2 text-[11px] leading-relaxed"
                style={{ background: '#FFF8F0', color: '#6B7280', borderTop: '0.5px solid rgba(30,45,61,0.06)' }}>
                <div className="pt-3">
                  <strong style={{ color: '#1E2D3D' }}>MailerLite:</strong>{' '}
                  Log in → click your name → Integrations → API → Developer API → Create new token
                </div>
                <div>
                  <strong style={{ color: '#1E2D3D' }}>Claude:</strong>{' '}
                  Go to console.anthropic.com → API Keys → Create Key
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function TabProfile() {
    return (
      <div>
        <PanelHeader title="Profile" subtitle="Your name and how we address you in the dashboard" />
        <div className="px-8 py-6 max-w-md">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                Your author name
              </label>
              <input
                type="text"
                value={penName}
                onChange={e => setPenName(e.target.value)}
                placeholder="e.g. Elle Wilder"
                className="w-full text-[12px] px-3 py-2 rounded-md outline-none"
                style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#FFF8F0', color: '#1E2D3D' }}
              />
              <div className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>Used on your books and public profile</div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                What should we call you?
              </label>
              <input
                type="text"
                value={preferredGreetingName}
                onChange={e => setPreferredGreetingName(e.target.value)}
                placeholder="e.g. Elle, Elle Wilder, Andrea"
                className="w-full text-[12px] px-3 py-2 rounded-md outline-none"
                style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#FFF8F0', color: '#1E2D3D' }}
              />
              <div className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>This is how we greet you in the dashboard</div>
            </div>
            <div>
              <AmberBtn onClick={saveProfile} disabled={profileSaveState === 'saving'}>
                {profileSaveState === 'saving' ? <Spinner /> : profileSaveState === 'saved' ? 'Saved ✓' : 'Save profile'}
              </AmberBtn>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function TabPreferences() {
    return (
      <div>
        <PanelHeader title="Preferences" subtitle="Benchmarks, digests, and AI settings" />
        <div className="px-8 py-6 max-w-lg">

          {/* SECTION: AI WRITING ASSISTANT */}
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#9CA3AF' }}>AI WRITING ASSISTANT</div>
          <WritingAssistantKeySection />

          {/* SECTION: PREFERENCES */}
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 mt-6" style={{ color: '#9CA3AF' }}>PREFERENCES</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">

            {/* Benchmarks */}
            <div className="rounded-[10px] p-4 flex flex-col gap-3"
              style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
              <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>My benchmarks</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Email open rate', key: 'email_open_rate', unit: '%', hint: 'Author avg: 20–25%' },
                  { label: 'Email click rate', key: 'email_click_rate', unit: '%', hint: 'Author avg: 1.5–2.5%' },
                  { label: 'Meta CPC', key: 'meta_cpc', unit: '$', hint: 'Under $0.15 is great' },
                  { label: 'Meta CTR', key: 'meta_ctr', unit: '%', hint: '15%+ is strong' },
                ].map(f => (
                  <div key={f.key}>
                    <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#1E2D3D' }}>{f.label}</div>
                    <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>{f.hint}</div>
                    <div className="flex items-center gap-1">
                      {f.unit === '$' && <span className="text-[11px]" style={{ color: '#9CA3AF' }}>$</span>}
                      <input
                        type="number"
                        min="0"
                        step={f.unit === '$' ? '0.01' : '0.1'}
                        value={benchmarks[f.key as keyof typeof benchmarks]}
                        onChange={e => setBenchmarks(b => ({ ...b, [f.key]: e.target.value }))}
                        className="flex-1 text-[12px] font-medium px-2 py-1.5 rounded-md outline-none"
                        style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#FFF8F0', color: '#1E2D3D' }}
                      />
                      {f.unit === '%' && <span className="text-[11px]" style={{ color: '#9CA3AF' }}>%</span>}
                    </div>
                  </div>
                ))}
              </div>
              <AmberBtn onClick={saveBenchmarks} disabled={benchmarksSave === 'saving'} fullWidth>
                {benchmarksSave === 'saving' ? 'Saving…' : benchmarksSave === 'saved' ? '✓ Saved!' : 'Save benchmarks'}
              </AmberBtn>
            </div>

            {/* Weekly digest */}
            <div className="rounded-[10px] p-4 flex flex-col gap-3"
              style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Weekly digest email</div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>What changed + what needs action</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium" style={{ color: '#1E2D3D' }}>
                  {digestEnabled ? 'On' : 'Off'}
                </span>
                <Toggle checked={digestEnabled} onChange={v => setDigestEnabled(v)} />
              </div>
              <div style={{ borderTop: '0.5px solid rgba(30,45,61,0.06)', paddingTop: 12 }}>
                <div className="text-[10px] mb-2" style={{ color: '#9CA3AF' }}>Send on</div>
                <div className="flex flex-wrap gap-1">
                  {ALL_DAYS.map((label, idx) => {
                    const val = DAY_VALUES[idx]
                    const selected = digestDays.includes(val)
                    return (
                      <button key={val}
                        onClick={() => setDigestDays(prev =>
                          prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
                        )}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md border-none cursor-pointer transition-all"
                        style={{
                          background: selected ? '#E9A020' : 'rgba(30,45,61,0.06)',
                          color: selected ? '#1E2D3D' : '#9CA3AF',
                        }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <AmberBtn onClick={saveNotifications} disabled={notifSave === 'saving'} fullWidth>
                {notifSave === 'saving' ? 'Saving…' : notifSave === 'saved' ? '✓ Saved!' : 'Save'}
              </AmberBtn>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function TabPrivacy() {
    return (
      <div>
        <PanelHeader title="Privacy & Data" subtitle="Your data, your control" />
        <div className="px-8 py-6 max-w-md flex flex-col gap-4">

          {/* Links */}
          <div className="rounded-[10px] p-4 flex flex-col gap-3"
            style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}>
            <div className="flex items-center gap-2 text-[11px] mb-1" style={{ color: '#9CA3AF' }}>
              <span>🔒</span>
              <span>API keys encrypted at rest, never shared</span>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-[12px] font-semibold no-underline hover:underline"
                style={{ color: '#E9A020' }}>Privacy Policy →</Link>
              <Link href="/terms" className="text-[12px] font-semibold no-underline hover:underline"
                style={{ color: '#E9A020' }}>Terms of Service →</Link>
              <Link href="/data" className="text-[12px] font-semibold no-underline hover:underline"
                style={{ color: '#E9A020' }}>Export Data →</Link>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-[10px] p-4 flex flex-col gap-3"
            style={{ background: 'white', border: '1px solid rgba(249,123,107,0.4)' }}>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Danger Zone</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                Permanently delete your account and all associated data.
              </div>
            </div>
            <Link
              href="/dashboard/delete-account"
              className="inline-flex items-center text-[12px] font-semibold px-3 py-2 rounded-[6px] no-underline w-fit"
              style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}
            >
              Delete Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Admin Tab ─────────────────────────────────────────────────────────────
  function TabAdmin() {
    const [impersonateEmail, setImpersonateEmail] = useState('')
    const [impersonating, setImpersonating] = useState(false)
    const [impersonateError, setImpersonateError] = useState<string | null>(null)
    const [impersonateSuccess, setImpersonateSuccess] = useState<string | null>(null)

    interface AuditEntry {
      id: string
      adminEmail: string
      impersonatedEmail: string
      action: string
      metadata: Record<string, unknown> | null
      timestamp: string
    }
    const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
    const [auditLoading, setAuditLoading] = useState(true)

    useEffect(() => {
      fetch('/api/admin/audit')
        .then(r => r.json())
        .then(d => setAuditLogs(d.logs ?? []))
        .catch(() => {})
        .finally(() => setAuditLoading(false))
    }, [])

    async function startImpersonation() {
      if (!impersonateEmail.trim()) return
      setImpersonating(true)
      setImpersonateError(null)
      setImpersonateSuccess(null)
      try {
        const res = await fetch('/api/admin/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: impersonateEmail.trim() }),
        })
        const data = await res.json()
        if (!res.ok) {
          setImpersonateError(data.error ?? 'Failed to impersonate')
        } else {
          setImpersonateSuccess(data.email)
          window.location.reload()
        }
      } catch {
        setImpersonateError('Network error')
      } finally {
        setImpersonating(false)
      }
    }

    function fmtTs(iso: string) {
      const d = new Date(iso)
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    function actionLabel(action: string) {
      switch (action) {
        case 'started':    return { label: 'Started',    color: '#E9A020' }
        case 'ended':      return { label: 'Ended',      color: '#6EBF8B' }
        case 'upload':     return { label: 'Upload',     color: '#60A5FA' }
        case 'book_added': return { label: 'Book added', color: '#8B5CF6' }
        default:           return { label: action,       color: '#9CA3AF' }
      }
    }

    function metaSummary(metadata: Record<string, unknown> | null) {
      if (!metadata) return null
      const parts: string[] = []
      if (metadata.filename) parts.push(String(metadata.filename))
      if (metadata.rowCount != null) parts.push(`${metadata.rowCount} rows`)
      if (metadata.fileType) parts.push(String(metadata.fileType).toUpperCase())
      if (metadata.asin) parts.push(String(metadata.asin))
      if (metadata.title) parts.push(String(metadata.title))
      return parts.length ? parts.join(' · ') : null
    }

    return (
      <div>
        <PanelHeader title="Admin" subtitle="Impersonate any user to configure their dashboard" />
        <div className="px-8 py-6">
          {/* ── Impersonate form ─── */}
          <div
            className="rounded-[10px] p-5 flex flex-col gap-4 max-w-md mb-8"
            style={{ background: 'white', border: '0.5px solid rgba(233,160,32,0.4)' }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} style={{ color: '#E9A020' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Impersonate User</span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: '#6B7280' }}>
              Enter a user email to view and manage their dashboard. An amber banner will appear at the top of every page while in admin view. Session auto-expires after 30 minutes of inactivity.
            </p>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                User email
              </label>
              <input
                type="email"
                value={impersonateEmail}
                onChange={e => { setImpersonateEmail(e.target.value); setImpersonateError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') startImpersonation() }}
                placeholder="user@example.com"
                className="w-full text-[12px] px-3 py-2 rounded-md outline-none"
                style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#FFF8F0', color: '#1E2D3D' }}
              />
            </div>
            {impersonateError && (
              <div className="text-[11px] px-3 py-2 rounded-md" style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                {impersonateError}
              </div>
            )}
            {impersonateSuccess && (
              <div className="text-[11px] px-3 py-2 rounded-md" style={{ background: 'rgba(110,191,139,0.1)', color: '#16a34a' }}>
                Switching to {impersonateSuccess}…
              </div>
            )}
            <AmberBtn
              onClick={startImpersonation}
              disabled={!impersonateEmail.trim() || impersonating}
            >
              {impersonating ? 'Switching…' : 'Impersonate User →'}
            </AmberBtn>
          </div>

          {/* ── Audit log ─── */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#9CA3AF' }}>
              Audit Log
            </div>
            <div
              className="rounded-[10px] overflow-hidden"
              style={{ background: '#FFF8F0', border: '0.5px solid rgba(30,45,61,0.1)' }}
            >
              {auditLoading ? (
                <div className="px-4 py-6 text-[12px]" style={{ color: '#9CA3AF' }}>Loading…</div>
              ) : auditLogs.length === 0 ? (
                <div className="px-4 py-6 text-[12px]" style={{ color: '#9CA3AF' }}>No audit entries yet.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid rgba(30,45,61,0.1)' }}>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Time</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Viewed as</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Action</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((entry, i) => {
                      const { label, color } = actionLabel(entry.action)
                      const detail = metaSummary(entry.metadata)
                      return (
                        <tr
                          key={entry.id}
                          style={{ borderBottom: i < auditLogs.length - 1 ? '0.5px solid rgba(30,45,61,0.06)' : undefined }}
                        >
                          <td className="px-4 py-2.5 text-[11px] font-mono whitespace-nowrap" style={{ color: '#6B7280' }}>
                            {fmtTs(entry.timestamp)}
                          </td>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: '#1E2D3D' }}>
                            {entry.impersonatedEmail}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: `${color}18`, color }}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[11px]" style={{ color: '#9CA3AF' }}>
                            {detail ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const TABS = ALL_TABS.filter(t => !t.adminOnly || isAdmin)

  const tabContent: Record<TabId, React.ReactNode> = {
    'my-books':    <TabMyBooks />,
    'connections': <TabConnections />,
    'profile':     <TabProfile />,
    'preferences': <TabPreferences />,
    'privacy':     <TabPrivacy />,
    'admin':       <TabAdmin />,
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: 200,
          flexShrink: 0,
          background: '#FAFAF8',
          borderRight: '0.5px solid rgba(30,45,61,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        {/* Sidebar label */}
        <div
          className="px-4 mb-3 text-[9px] font-bold uppercase tracking-[2px]"
          style={{ color: '#E9A020' }}
        >
          Settings
        </div>

        {/* Tab items */}
        <nav className="flex flex-col gap-0.5 px-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => navigateTab(tab.id)}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-[6px] border-none cursor-pointer transition-all"
                style={{
                  background: isActive ? '#FFF3E0' : 'transparent',
                  borderLeft: isActive ? '2px solid #E9A020' : '2px solid transparent',
                  color: isActive ? '#1E2D3D' : '#888',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#f5efe8'
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  style={{ color: isActive ? '#E9A020' : '#888', marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <div
                    className="text-[13px] leading-tight"
                    style={{ fontWeight: isActive ? 500 : 400, color: isActive ? '#1E2D3D' : '#888' }}
                  >
                    {tab.label}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-tight" style={{ color: '#bbb' }}>
                    {tab.description}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: 'white',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        {tabContent[activeTab]}
      </div>
    </div>
  )
}
