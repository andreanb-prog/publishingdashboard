'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { BookCatalog } from '@/components/BookCatalog'
import { Bot, Mail, Megaphone, BookOpen } from '@/components/icons'

const ADMIN_EMAILS = ['andreanbonilla@gmail.com', 'info@ellewilderbooks.com']

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

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

// ── Eyebrow section label ─────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] font-bold uppercase tracking-[2px] mb-2"
      style={{ color: '#E9A020' }}
    >
      {children}
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
      style={{
        background: 'white',
        border: '0.5px solid rgba(30,45,61,0.1)',
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: '0.5px solid rgba(30,45,61,0.06)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>{name}</div>
          <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{subtitle}</div>
        </div>
        <div className="shrink-0">{statusPill}</div>
      </div>
      {/* Card body */}
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
      className={`text-[10px] font-semibold px-3 py-1.5 rounded-[5px] border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed${fullWidth ? ' w-full' : ''}`}
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')

  // ── Connection state ────────────────────────────────────────────────────────
  const [hasSavedML,     setHasSavedML]     = useState(false)
  const [hasSavedClaude, setHasSavedClaude] = useState(false)
  const [metaConnected,  setMetaConnected]  = useState(false)
  const [metaLastSync,   setMetaLastSync]   = useState<string | null>(null)
  const [kdpLastUpload,  setKdpLastUpload]  = useState<string | null>(null)
  const [mlSubscribers,  setMlSubscribers]  = useState<number | null>(null)

  // ── API key inputs ──────────────────────────────────────────────────────────
  const [mailerLiteKey,  setMailerLiteKey]  = useState('')
  const [claudeKey,      setClaudeKey]      = useState('')

  // ── Show key update forms ───────────────────────────────────────────────────
  const [showMLKey,     setShowMLKey]     = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)

  // ── Save states ─────────────────────────────────────────────────────────────
  const [mlSaveState,     setMLSaveState]     = useState<SaveState>('idle')
  const [claudeSaveState, setClaudeSaveState] = useState<SaveState>('idle')

  // ── Meta Ads ────────────────────────────────────────────────────────────────
  const [metaSyncing, setMetaSyncing] = useState(false)
  const [metaSuccess, setMetaSuccess] = useState(false)
  const [metaError,   setMetaError]   = useState(false)

  // ── Benchmarks ──────────────────────────────────────────────────────────────
  const [benchmarks, setBenchmarks] = useState({
    email_open_rate: '25',
    email_click_rate: '2',
    meta_cpc: '0.15',
    meta_ctr: '15',
  })
  const [benchmarksSave, setBenchmarksSave] = useState<SaveState>('idle')

  // ── Notifications ───────────────────────────────────────────────────────────
  const [digestEnabled, setDigestEnabled] = useState(true)
  const [digestDays,    setDigestDays]    = useState<string[]>(['monday'])
  const [notifSave,     setNotifSave]     = useState<SaveState>('idle')

  // ── BookFunnel ──────────────────────────────────────────────────────────────
  const [bfSecret,        setBfSecret]        = useState<string | null>(null)
  const [bfWebhookUrl,    setBfWebhookUrl]    = useState<string>('')
  const [bfDownloadCount, setBfDownloadCount] = useState<number>(0)
  const [bfConfirmRate,   setBfConfirmRate]   = useState<number>(0)
  const [bfRegenerating,  setBfRegenerating]  = useState(false)
  const [bfCopied,        setBfCopied]        = useState<'url' | 'secret' | null>(null)

  // ── Help accordion ──────────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false)

  // ── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) { setToast(msg) }

  // ── KDP file upload ─────────────────────────────────────────────────────────
  function openUploadModal() {
    window.dispatchEvent(new CustomEvent('open-upload-modal'))
  }

  // ── Load settings ────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const d = await fetch('/api/settings').then(r => r.json())
      setHasSavedML(!!d.mailerLiteKey)
      setHasSavedClaude(!!d.claudeKey)
      setMetaConnected(!!d.metaConnected)
      setMetaLastSync(d.metaLastSync ?? null)
      setKdpLastUpload(d.kdpLastUpload ?? null)
      setMlSubscribers(d.mlSubscribers ?? null)
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

  useEffect(() => { loadSettings() }, [loadSettings]) // eslint-disable-line react-hooks/exhaustive-deps

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
      // Notify ConnectionStatus to refresh health and auto-sync
      window.dispatchEvent(new CustomEvent('meta:connected'))
    }
    if (window.location.search.includes('meta=error')) {
      setMetaError(true)
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]?meta=error/, '')
      window.history.replaceState(null, '', cleanUrl || window.location.pathname)
    }
  }, [])

  // ── Meta handlers ─────────────────────────────────────────────────────────
  function connectMeta() {
    console.log('[Meta] Connect button clicked — redirecting to OAuth')
    try {
      window.location.href = '/api/meta/connect'
    } catch (err) {
      console.error('[Meta] Failed to initiate OAuth redirect:', err)
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

  // ── API key save handlers ────────────────────────────────────────────────
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
      // Refresh subscriber count
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

  // ── Benchmarks save ──────────────────────────────────────────────────────
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

  // ── Notifications save ───────────────────────────────────────────────────
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
  const connectedCount = [hasSavedML, hasSavedClaude, metaConnected, !!kdpLastUpload].filter(Boolean).length
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

  return (
    <div className="w-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '28px 32px' }}>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-bold" style={{ color: '#1E2D3D' }}>Settings</h1>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.12)' }}
        >
          <div className="flex items-center gap-1">
            {[hasSavedML, hasSavedClaude, metaConnected, !!kdpLastUpload].map((c, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: c ? '#6EBF8B' : '#D1D5DB' }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold" style={{ color: '#1E2D3D' }}>
            {connectedCount} of 4 connected
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: MY BOOKS                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>MY BOOKS</SectionLabel>
      <div
        className="rounded-[10px] overflow-hidden mb-8"
        style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}
      >
        <BookCatalog />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: INTEGRATIONS                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>INTEGRATIONS</SectionLabel>
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>

        {/* ── Claude AI card (admin only) ───────────────────────────────── */}
        {isAdmin && (
          <IntegCard
            iconBg="#EDE7F6"
            icon={<Bot size={16} strokeWidth={1.75} color="#8B5CF6" />}
            name="Claude AI"
            subtitle={hasSavedClaude ? 'Powers your coaching session' : 'Powers your coaching session'}
            statusPill={
              <StatusPill active={hasSavedClaude} label={hasSavedClaude ? '● Active' : 'Not connected'} />
            }
          >
            {hasSavedClaude && !showClaudeKey ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: '#9CA3AF' }}>Key saved</span>
                <button
                  onClick={() => setShowClaudeKey(true)}
                  className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline"
                  style={{ color: '#9CA3AF' }}
                >
                  Update
                </button>
              </div>
            ) : (
              <>
                <KeyInput
                  value={claudeKey}
                  onChange={setClaudeKey}
                  placeholder="sk-ant-••••••••••••••"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <AmberBtn
                    onClick={saveClaudeKey}
                    disabled={!claudeKey.trim() || claudeSaveState === 'saving'}
                  >
                    {claudeSaveState === 'saving' ? <Spinner /> : 'Save key'}
                  </AmberBtn>
                  <span className="text-[10px]" style={{ color: '#9CA3AF' }}>~$0.05–0.15 per analysis</span>
                  {showClaudeKey && (
                    <button
                      onClick={() => { setShowClaudeKey(false); setClaudeKey('') }}
                      className="text-[10px] border-none bg-transparent cursor-pointer ml-auto"
                      style={{ color: '#9CA3AF' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </IntegCard>
        )}

        {/* ── MailerLite card ───────────────────────────────────────────── */}
        <IntegCard
          iconBg="#E8F5E9"
          icon={<Mail size={16} strokeWidth={1.75} color="#34d399" />}
          name="MailerLite"
          subtitle={
            hasSavedML && mlSubscribers != null
              ? `${mlSubscribers.toLocaleString()} active subscribers`
              : hasSavedML
              ? 'Connected'
              : 'Connect to sync email stats'
          }
          statusPill={
            <StatusPill active={hasSavedML} label={hasSavedML ? '● Active' : 'Not connected'} />
          }
        >
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
              <KeyInput
                value={mailerLiteKey}
                onChange={setMailerLiteKey}
                placeholder="ml_••••••••••••••••••"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <AmberBtn
                  onClick={saveMLKey}
                  disabled={!mailerLiteKey.trim() || mlSaveState === 'saving'}
                >
                  {mlSaveState === 'saving' ? <Spinner /> : 'Save key'}
                </AmberBtn>
                {showMLKey && (
                  <button
                    onClick={() => { setShowMLKey(false); setMailerLiteKey('') }}
                    className="text-[10px] border-none bg-transparent cursor-pointer ml-auto"
                    style={{ color: '#9CA3AF' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </IntegCard>

        {/* ── Meta Ads card ─────────────────────────────────────────────── */}
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
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}
              >
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
                <button
                  onClick={handleMetaDisconnect}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-[5px] border-none cursor-pointer transition-all"
                  style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}
                >
                  Disconnect
                </button>
              </div>
              {isAdmin && (
                <div
                  className="text-[10px] leading-relaxed px-2.5 py-2 rounded-md"
                  style={{ background: 'rgba(233,160,32,0.06)', border: '0.5px solid rgba(233,160,32,0.25)', color: '#92610a' }}
                >
                  Only your account can connect in development mode.{' '}
                  <a
                    href="https://developers.facebook.com/docs/app-review"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:underline"
                    style={{ color: '#E9A020' }}
                  >
                    Submit for app review →
                  </a>
                </div>
              )}
              {metaSuccess && (
                <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                  style={{ background: 'rgba(110,191,139,0.1)', color: '#16a34a' }}>
                  ✓ Connected! Syncing your ad data now…
                </div>
              )}
            </>
          ) : isAdmin ? (
            <>
              <AmberBtn onClick={connectMeta}>Connect Meta Ads →</AmberBtn>
              <div
                className="text-[10px] leading-relaxed px-2.5 py-2 rounded-md"
                style={{ background: 'rgba(233,160,32,0.06)', border: '0.5px solid rgba(233,160,32,0.25)', color: '#92610a' }}
              >
                Only your account can connect in development mode.{' '}
                <a
                  href="https://developers.facebook.com/docs/app-review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                  style={{ color: '#E9A020' }}
                >
                  Submit for app review →
                </a>
              </div>
              {metaError && (
                <div className="text-[11px] font-semibold px-2.5 py-2 rounded-md"
                  style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                  ✕ Couldn't connect — check permissions and try again.
                </div>
              )}
            </>
          ) : (
            <div
              className="text-[10px] leading-relaxed px-2.5 py-2 rounded-md"
              style={{ background: 'rgba(30,45,61,0.04)', border: '0.5px solid rgba(30,45,61,0.1)', color: '#6B7280' }}
            >
              Meta Ads coming soon — we&apos;re finishing the connection. Check back shortly.
            </div>
          )}
        </IntegCard>

        {/* ── KDP Sales card ────────────────────────────────────────────── */}
        <IntegCard
          iconBg="#FFF3E0"
          icon={<BookOpen size={16} strokeWidth={1.75} color="#E9A020" />}
          name="KDP Sales"
          subtitle={kdpLastUpload ? `Last upload: ${fmtDate(kdpLastUpload)}` : 'No data yet'}
          statusPill={
            kdpLastUpload ? (
              <StatusPill active={true} label={`● Uploaded ${fmtDate(kdpLastUpload)}`} />
            ) : (
              <StatusPill active={false} label="No uploads yet" />
            )
          }
        >
          <AmberBtn onClick={openUploadModal}>Upload new file</AmberBtn>
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>CSV or XLSX</span>
        </IntegCard>

        {/* ── BookFunnel card ───────────────────────────────────────────── */}
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
          {/* Webhook URL */}
          <div className="w-full">
            <div className="text-[9px] font-bold uppercase tracking-[1px] mb-1" style={{ color: '#6B7280' }}>
              Webhook URL
            </div>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={bfWebhookUrl}
                className="flex-1 text-[9px] font-mono px-2 py-1.5 rounded-md outline-none truncate"
                style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#F9FAFB', color: '#374151' }}
              />
              <button
                onClick={() => copyToClipboard(bfWebhookUrl, 'url')}
                className="text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap transition-all"
                style={{
                  background: bfCopied === 'url' ? 'rgba(110,191,139,0.15)' : 'rgba(30,45,61,0.06)',
                  color: bfCopied === 'url' ? '#16a34a' : '#6B7280',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {bfCopied === 'url' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Secret token */}
          <div className="w-full">
            <div className="text-[9px] font-bold uppercase tracking-[1px] mb-1" style={{ color: '#6B7280' }}>
              Secret Token <span className="normal-case font-normal">(paste into BookFunnel)</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <input
                readOnly
                value={bfSecret ? '•'.repeat(32) : '—'}
                className="w-full text-[9px] font-mono px-2 py-1.5 rounded-md outline-none"
                style={{ border: '0.5px solid rgba(30,45,61,0.15)', background: '#F9FAFB', color: '#374151' }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => bfSecret && copyToClipboard(bfSecret, 'secret')}
                  className="flex-1 text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap transition-all"
                  style={{
                    background: bfCopied === 'secret' ? 'rgba(110,191,139,0.15)' : 'rgba(30,45,61,0.06)',
                    color: bfCopied === 'secret' ? '#16a34a' : '#6B7280',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {bfCopied === 'secret' ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={regenerateBfSecret}
                  disabled={bfRegenerating}
                  className="text-[9px] font-semibold px-2 py-1.5 rounded-md whitespace-nowrap transition-all disabled:opacity-40"
                  style={{ background: 'rgba(30,45,61,0.06)', color: '#6B7280', border: 'none', cursor: 'pointer' }}
                >
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
      </div>

      {/* ── API keys help accordion ────────────────────────────────────────── */}
      <div
        className="rounded-[10px] mb-8 overflow-hidden"
        style={{ border: '0.5px solid rgba(30,45,61,0.1)', background: 'white' }}
      >
        <button
          onClick={() => setHelpOpen(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 border-none cursor-pointer text-left"
          style={{ background: 'transparent' }}
        >
          <span className="text-[12px] font-semibold" style={{ color: '#1E2D3D' }}>
            🔑 Need help finding your API keys?
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transform: helpOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          >
            <path d="M5 3L9 7L5 11" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {helpOpen && (
          <div
            className="px-4 pb-4 space-y-2 text-[11px] leading-relaxed"
            style={{ background: '#FFF8F0', color: '#6B7280', borderTop: '0.5px solid rgba(30,45,61,0.06)' }}
          >
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: PREFERENCES                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>PREFERENCES</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">

        {/* ── Benchmarks card ───────────────────────────────────────────── */}
        <div
          className="rounded-[10px] p-4 flex flex-col gap-3"
          style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}
        >
          <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>My benchmarks</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Email open rate', key: 'email_open_rate', unit: '%', hint: 'Author avg: 20–25%' },
              { label: 'Email click rate', key: 'email_click_rate', unit: '%', hint: 'Author avg: 1.5–2.5%' },
              { label: 'Meta CPC', key: 'meta_cpc', unit: '$', hint: 'Under $0.15 is great' },
              { label: 'Meta CTR', key: 'meta_ctr', unit: '%', hint: '15%+ is strong' },
            ].map(f => (
              <div key={f.key}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{f.label}</div>
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
                    style={{
                      border: '0.5px solid rgba(30,45,61,0.15)',
                      background: '#FFF8F0',
                      color: '#1E2D3D',
                    }}
                  />
                  {f.unit === '%' && <span className="text-[11px]" style={{ color: '#9CA3AF' }}>%</span>}
                </div>
              </div>
            ))}
          </div>
          <AmberBtn
            onClick={saveBenchmarks}
            disabled={benchmarksSave === 'saving'}
            fullWidth
          >
            {benchmarksSave === 'saving' ? 'Saving…' : benchmarksSave === 'saved' ? '✓ Saved!' : 'Save benchmarks'}
          </AmberBtn>
        </div>

        {/* ── Notifications card ────────────────────────────────────────── */}
        <div
          className="rounded-[10px] p-4 flex flex-col gap-3"
          style={{ background: 'white', border: '0.5px solid rgba(30,45,61,0.1)' }}
        >
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
                  <button
                    key={val}
                    onClick={() => {
                      setDigestDays(prev =>
                        prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
                      )
                    }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md border-none cursor-pointer transition-all"
                    style={{
                      background: selected ? '#E9A020' : 'rgba(30,45,61,0.06)',
                      color: selected ? '#1E2D3D' : '#9CA3AF',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <AmberBtn
            onClick={saveNotifications}
            disabled={notifSave === 'saving'}
            fullWidth
          >
            {notifSave === 'saving' ? 'Saving…' : notifSave === 'saved' ? '✓ Saved!' : 'Save'}
          </AmberBtn>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: PRIVACY & DATA                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>PRIVACY &amp; DATA</SectionLabel>
      <div
        className="rounded-[10px] flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'white',
          border: '0.5px solid rgba(30,45,61,0.1)',
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#9CA3AF' }}>
          <span>🔒</span>
          <span>Your data, your control — API keys encrypted at rest, never shared</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/privacy" className="text-[11px] font-semibold no-underline hover:underline"
            style={{ color: '#E9A020' }}>Privacy Policy</Link>
          <Link href="/terms" className="text-[11px] font-semibold no-underline hover:underline"
            style={{ color: '#E9A020' }}>Terms</Link>
          <Link href="/data" className="text-[11px] font-semibold no-underline hover:underline"
            style={{ color: '#E9A020' }}>Export Data</Link>
          <Link href="/dashboard/delete-account"
            className="text-[11px] font-semibold no-underline hover:underline"
            style={{ color: '#F97B6B' }}>Delete Account</Link>
        </div>
      </div>
    </div>
  )
}
