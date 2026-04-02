'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { IconStar } from '@/components/icons'
import { BookCatalog } from '@/components/BookCatalog'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

// ── API key field ─────────────────────────────────────────────────────────────
function KeyField({
  label, hint, placeholder, value, onChange, saved,
}: {
  label: string; hint: string; placeholder: string
  value: string; onChange: (v: string) => void; saved: boolean
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#0d1f35] mb-1">{label}</label>
      <p className="text-[12px] text-stone-500 mb-2 leading-relaxed">{hint}</p>
      <div className="relative">
        <input
          type="password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={saved ? '••••••••••••••••••••' : placeholder}
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm font-mono
                     text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                     transition-colors duration-150 pr-24"
        />
        {saved && !value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold
                           px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#16a34a' }}>
            Saved ✓
          </span>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
// ── Notifications section ────────────────────────────────────────────────────
function NotificationsSection() {
  const [digestEnabled, setDigestEnabled] = useState(true)
  const [digestDay, setDigestDay] = useState<'monday' | 'friday'>('monday')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/prefs').then(r => r.json()).then(d => {
      if (d.weeklyDigest === false) setDigestEnabled(false)
      if (d.digestDay) setDigestDay(d.digestDay)
    }).catch(() => {})
  }, [])

  async function save() {
    await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-notifications', weeklyDigest: digestEnabled, digestDay }),
    }).catch(() => {})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card p-6 mb-6">
      <h3 className="font-serif text-[16px] text-[#0d1f35] mb-1">Notifications</h3>
      <p className="text-[12px] text-stone-500 mb-4">Control your weekly digest email</p>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-[#0d1f35]">Weekly digest email</div>
          <div className="text-[11px] text-stone-500">A summary of what changed + what needs action</div>
        </div>
        <button
          onClick={() => { setDigestEnabled(p => !p); setSaved(false) }}
          className="w-10 h-6 rounded-full relative transition-colors border-none cursor-pointer"
          style={{ background: digestEnabled ? '#34d399' : '#D6D3D1' }}
        >
          <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: digestEnabled ? 22 : 2 }} />
        </button>
      </div>

      {digestEnabled && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12px] text-stone-500">Send on:</span>
          {(['monday', 'friday'] as const).map(day => (
            <button key={day} onClick={() => { setDigestDay(day); setSaved(false) }}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border-none cursor-pointer"
              style={{
                background: digestDay === day ? 'rgba(233,160,32,0.12)' : '#F5F5F4',
                color: digestDay === day ? '#e9a020' : '#6B7280',
              }}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </button>
          ))}
        </div>
      )}

      <button onClick={save}
        className="px-4 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer"
        style={{ background: '#e9a020', color: '#0d1f35' }}>
        Save
      </button>
      {saved && <span className="ml-2 text-[11px] font-semibold" style={{ color: '#34d399' }}>✓ Saved</span>}
    </div>
  )
}

export default function SettingsPage() {
  const [mailerLiteKey,  setMailerLiteKey]  = useState('')
  const [claudeKey,      setClaudeKey]      = useState('')
  const [hasSavedML,     setHasSavedML]     = useState(false)
  const [hasSavedClaude, setHasSavedClaude] = useState(false)
  const [saveState,      setSaveState]      = useState<SaveState>('idle')
  const [testState,      setTestState]      = useState<TestState>('idle')
  const [testResult,     setTestResult]     = useState<string>('')

  const [metaConnected,  setMetaConnected]  = useState(false)
  const [metaLastSync,   setMetaLastSync]   = useState<string | null>(null)
  const [metaSyncing,    setMetaSyncing]    = useState(false)
  const [metaSuccess,    setMetaSuccess]    = useState(false)
  const [metaError,      setMetaError]      = useState(false)

  // Expand key input on connected cards
  const [showMLKey,     setShowMLKey]     = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [mlSaveState,     setMLSaveState]     = useState<SaveState>('idle')
  const [claudeSaveState, setClaudeSaveState] = useState<SaveState>('idle')

  // Benchmarks
  const [benchmarks,      setBenchmarks]      = useState({ email_open_rate: '25', email_click_rate: '2', meta_cpc: '0.15', meta_ctr: '15' })
  const [benchmarksSave,  setBenchmarksSave]  = useState<SaveState>('idle')

  // Load keys + meta status + books (called on mount and after OAuth)
  async function loadSettings() {
    try {
      const d = await fetch('/api/settings').then(r => r.json())
      setHasSavedML(!!d.mailerLiteKey)
      setHasSavedClaude(!!d.claudeKey)
      setMetaConnected(!!d.metaConnected)
      setMetaLastSync(d.metaLastSync ?? null)
      fetch('/api/prefs').then(r => r.json()).then(p => {
        const g = p.goals ?? {}
        setBenchmarks({
          email_open_rate: g.email_open_rate != null ? String(g.email_open_rate) : '25',
          email_click_rate: g.email_click_rate != null ? String(g.email_click_rate) : '2',
          meta_cpc: g.meta_cpc != null ? String(g.meta_cpc) : '0.15',
          meta_ctr: g.meta_ctr != null ? String(g.meta_ctr) : '15',
        })
      }).catch(() => {})
    } catch {}
  }

  useEffect(() => { loadSettings() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Strip Facebook's #_=_ fragment and handle ?meta=error in URL
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#_=_') {
      window.history.replaceState
        ? window.history.replaceState(null, '', window.location.href.split('#')[0])
        : (window.location.hash = '')
    }
    if (window.location.search.includes('meta=error')) {
      setMetaError(true)
      // Clean up URL without triggering a navigation
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]meta=error/, '')
      window.history.replaceState(null, '', cleanUrl || window.location.pathname)
    }
  }, [])

  // ── Meta Ads handlers ─────────────────────────────────────────────────────
  async function onMetaPopupClosed() {
    // Re-fetch settings from DB to see if token was saved
    setMetaSyncing(true)
    try {
      const d = await fetch('/api/settings').then(r => r.json())
      if (d.metaConnected) {
        setMetaConnected(true)
        setMetaLastSync(d.metaLastSync ?? null)
        // Kick off an immediate sync so ad data starts populating
        try { await fetch('/api/meta/sync', { method: 'POST' }) } catch {}
        // Refresh once more to pick up the new metaLastSync timestamp
        const d2 = await fetch('/api/settings').then(r => r.json()).catch(() => d)
        setMetaLastSync(d2.metaLastSync ?? null)
        setMetaSuccess(true)
        setTimeout(() => setMetaSuccess(false), 4000)
      }
    } catch {}
    setMetaSyncing(false)
  }

  function connectMeta() {
    const popup = window.open('/api/meta/connect', 'meta_oauth', 'width=600,height=700,left=200,top=100')
    if (!popup) return
    // Poll every 500ms — when popup closes, check DB for new token
    const check = setInterval(() => {
      if (popup.closed) {
        clearInterval(check)
        onMetaPopupClosed()
      }
    }, 500)
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

  // ── API key handlers ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!mailerLiteKey && !claudeKey) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailerLiteKey: mailerLiteKey || undefined, claudeKey: claudeKey || undefined }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      if (mailerLiteKey) { setHasSavedML(true); setMailerLiteKey('') }
      if (claudeKey)     { setHasSavedClaude(true); setClaudeKey('') }
      setTimeout(() => setSaveState('idle'), 3000)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  async function handleTest() {
    const keyToTest = mailerLiteKey.trim()
    if (!keyToTest) {
      setTestState('error')
      setTestResult('Paste your MailerLite key above first.')
      return
    }
    setTestState('testing')
    setTestResult('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-mailerlite', key: keyToTest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connection failed')
      setTestState('ok')
      setTestResult(`Connected! Your list has ${data.listSize?.toLocaleString()} subscribers.`)
    } catch (err: unknown) {
      setTestState('error')
      setTestResult(err instanceof Error ? err.message : 'Could not connect — double-check your API key.')
    }
  }

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
      setTimeout(() => setMLSaveState('idle'), 3000)
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
      setTimeout(() => setClaudeSaveState('idle'), 3000)
    } catch {
      setClaudeSaveState('error')
      setTimeout(() => setClaudeSaveState('idle'), 3000)
    }
  }

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
      setTimeout(() => setBenchmarksSave('idle'), 3000)
    } catch {
      setBenchmarksSave('error')
      setTimeout(() => setBenchmarksSave('idle'), 3000)
    }
  }

  const canSave = !!(mailerLiteKey || claudeKey) && saveState !== 'saving'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-7">
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-1.5" style={{ color: '#e9a020' }}>
          Settings
        </div>
        <h1 className="font-serif text-[28px] text-[#0d1f35] leading-snug mb-1">
          Connect your accounts
        </h1>
        <p className="text-[13px] text-stone-500 leading-relaxed">
          Your API keys are stored privately and never shared. You only need to set these once.
        </p>
      </div>

      {/* ─── My Books ────────────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(233,160,32,0.1)' }}>📚</div>
          <div className="flex-1">
            <div className="font-bold text-[#0d1f35] text-[14px]">My Books</div>
            <div className="text-[11.5px] text-stone-500">
              Drag to reorder — position sets B1/B2/B3 colour assignment.
            </div>
          </div>
        </div>
        <BookCatalog />
      </div>

      {/* ─── My Benchmarks ───────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(233,160,32,0.1)' }}><IconStar size={22} /></div>
          <div className="flex-1">
            <div className="font-bold text-[#0d1f35] text-[14px]">My Benchmarks</div>
            <div className="text-[11.5px] text-stone-500">Set your personal targets — shown on your Email and Meta pages</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: 'Email Open Rate Target', key: 'email_open_rate', unit: '%', hint: 'Author avg: 20–25%' },
            { label: 'Email Click Rate Target', key: 'email_click_rate', unit: '%', hint: 'Author avg: 1.5–2.5%' },
            { label: 'Meta CPC Target', key: 'meta_cpc', unit: '$', hint: 'Under $0.15 is great for book ads' },
            { label: 'Meta CTR Target', key: 'meta_ctr', unit: '%', hint: '15%+ is strong for book ads' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[12px] font-bold text-[#0d1f35] mb-1">{f.label}</label>
              <p className="text-[11px] text-stone-500 mb-1.5">{f.hint}</p>
              <div className="flex items-center gap-1.5">
                {f.unit === '$' && <span className="text-stone-500 text-[13px]">$</span>}
                <input
                  type="number"
                  min="0"
                  step={f.unit === '$' ? '0.01' : '0.1'}
                  value={benchmarks[f.key as keyof typeof benchmarks]}
                  onChange={e => setBenchmarks(b => ({ ...b, [f.key]: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] font-mono
                             text-[#0d1f35] bg-white outline-none focus:border-amber-brand transition-colors"
                />
                {f.unit === '%' && <span className="text-stone-500 text-[13px]">%</span>}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={saveBenchmarks}
          disabled={benchmarksSave === 'saving'}
          className="text-[12.5px] font-semibold px-4 py-2 rounded-lg transition-all duration-150 disabled:opacity-50"
          style={{ background: '#e9a020', color: '#0d1f35' }}
        >
          {benchmarksSave === 'saving' ? 'Saving…'
            : benchmarksSave === 'saved' ? '✓ Saved!'
            : benchmarksSave === 'error' ? 'Save failed'
            : 'Save benchmarks'}
        </button>
      </div>

      {/* ─── Integrations — sorted: unconnected first, connected last ──── */}
      {(() => {
        // ── Connected header row (shared by compact cards) ────────────────
        function ConnectedBadge() {
          return (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(110,191,139,0.15)', color: '#16a34a' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#16a34a' }} />
              Connected
            </span>
          )
        }

        // ── MailerLite card ───────────────────────────────────────────────
        const mlConnected = hasSavedML && !showMLKey
        const mailerLiteCard = (
          <div key="mailerlite" className="card mb-4 transition-all"
            style={{ background: mlConnected ? '#F0FBF5' : 'white', padding: mlConnected ? '14px 20px' : '24px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: mlConnected ? 0 : 20 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: mlConnected ? 'rgba(22,163,74,0.08)' : 'rgba(52,211,153,0.1)' }}>📧</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]" style={{ color: mlConnected ? '#374151' : '#0d1f35' }}>
                  MailerLite
                </div>
                {!mlConnected && (
                  <div className="text-[11.5px] text-stone-500">Pulls your email stats automatically</div>
                )}
              </div>
              {mlConnected && (
                <div className="flex items-center gap-3 shrink-0">
                  <ConnectedBadge />
                  <button
                    onClick={() => setShowMLKey(true)}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline p-0"
                    style={{ color: '#9CA3AF' }}>
                    Update key
                  </button>
                </div>
              )}
            </div>

            {!mlConnected && (
              <>
                <KeyField
                  label="MailerLite API Key"
                  hint="Go to MailerLite → Integrations → API → Create a new token. Paste it here."
                  placeholder="ml_••••••••••••••••••••••••••"
                  value={mailerLiteKey}
                  onChange={setMailerLiteKey}
                  saved={hasSavedML}
                />
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <button
                    onClick={saveMLKey}
                    disabled={!mailerLiteKey.trim() || mlSaveState === 'saving'}
                    className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer transition-all disabled:opacity-40"
                    style={{ background: '#E9A020', color: '#1E2D3D' }}>
                    {mlSaveState === 'saving' ? 'Connecting…' : mlSaveState === 'saved' ? '✓ Connected!' : 'Connect →'}
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testState === 'testing' || !mailerLiteKey.trim()}
                    className="text-[12.5px] font-semibold px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testState === 'testing' ? 'Checking…' : 'Test first'}
                  </button>
                  {testResult && (
                    <span className={`text-[12px] font-semibold ${testState === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {testState === 'ok' ? '✓ ' : '✕ '}{testResult}
                    </span>
                  )}
                  {showMLKey && (
                    <button onClick={() => { setShowMLKey(false); setMailerLiteKey('') }}
                      className="text-[11px] text-stone-400 hover:text-stone-600 border-none bg-transparent cursor-pointer ml-auto">
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )

        // ── Meta Ads card ─────────────────────────────────────────────────
        const metaCard = (
          <div key="meta" className="card mb-4 transition-all"
            style={{ background: metaConnected ? '#F0FBF5' : 'white', padding: metaConnected ? '14px 20px' : '24px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: metaConnected ? 0 : 0 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: metaConnected ? 'rgba(22,163,74,0.08)' : 'rgba(96,165,250,0.1)' }}>📣</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]" style={{ color: metaConnected ? '#374151' : '#0d1f35' }}>
                  Meta Ads
                </div>
                {!metaConnected && (
                  <div className="text-[11.5px] text-stone-500">Connect to auto-sync your ad performance daily</div>
                )}
              </div>
              {metaConnected ? (
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  <ConnectedBadge />
                  {metaLastSync && (
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      Synced {new Date(metaLastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <button onClick={handleMetaSync} disabled={metaSyncing}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer disabled:opacity-50 hover:underline p-0"
                    style={{ color: '#E9A020' }}>
                    {metaSyncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button onClick={handleMetaDisconnect}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline p-0"
                    style={{ color: '#9CA3AF' }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={connectMeta}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90 border-none cursor-pointer shrink-0"
                  style={{ background: '#E9A020', color: '#1E2D3D' }}>
                  Connect →
                </button>
              )}
            </div>
            <div className="mt-3 px-3 py-2.5 rounded-lg text-[11.5px] leading-relaxed"
              style={{ background: 'rgba(233,160,32,0.08)', border: '1px solid rgba(233,160,32,0.25)', color: '#92610a' }}>
              <span className="font-bold">Meta Ads is in development mode</span> — only your Facebook account can connect right now.{' '}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                className="font-semibold hover:underline" style={{ color: '#e9a020' }}>
                Submit for app review →
              </a>{' '}to enable it for other users.
            </div>
            {metaError && !metaConnected && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-[12px] font-semibold"
                style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B' }}>
                <span>✕</span> Couldn't connect — check permissions and try again.
              </div>
            )}
            {metaSuccess && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-[12px] font-semibold"
                style={{ background: 'rgba(110,191,139,0.1)', color: '#16a34a' }}>
                <span>✓</span> Connected! Syncing your ad data now…
              </div>
            )}
          </div>
        )

        // ── Claude card ───────────────────────────────────────────────────
        const claudeConnected = hasSavedClaude && !showClaudeKey
        const claudeCard = (
          <div key="claude" className="card mb-4 transition-all"
            style={{ background: claudeConnected ? '#F0FBF5' : 'white', padding: claudeConnected ? '14px 20px' : '24px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: claudeConnected ? 0 : 20 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: claudeConnected ? 'rgba(22,163,74,0.08)' : 'rgba(233,160,32,0.1)' }}>🤖</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14px]" style={{ color: claudeConnected ? '#374151' : '#0d1f35' }}>
                  Claude AI
                </div>
                {!claudeConnected && (
                  <div className="text-[11.5px] text-stone-500">Powers your monthly coaching session</div>
                )}
              </div>
              {claudeConnected && (
                <div className="flex items-center gap-3 shrink-0">
                  <ConnectedBadge />
                  <button onClick={() => setShowClaudeKey(true)}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer hover:underline p-0"
                    style={{ color: '#9CA3AF' }}>
                    Update key
                  </button>
                </div>
              )}
            </div>

            {!claudeConnected && (
              <>
                <KeyField
                  label="Claude API Key"
                  hint="Go to console.anthropic.com → API Keys → Create Key. It starts with sk-ant-."
                  placeholder="sk-ant-••••••••••••••••••••"
                  value={claudeKey}
                  onChange={setClaudeKey}
                  saved={hasSavedClaude}
                />
                <p className="text-[11.5px] text-stone-500 mt-2 leading-relaxed">
                  Each analysis costs ~$0.05–$0.15 from your Anthropic account.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={saveClaudeKey}
                    disabled={!claudeKey.trim() || claudeSaveState === 'saving'}
                    className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer transition-all disabled:opacity-40"
                    style={{ background: '#E9A020', color: '#1E2D3D' }}>
                    {claudeSaveState === 'saving' ? 'Connecting…' : claudeSaveState === 'saved' ? '✓ Connected!' : 'Connect →'}
                  </button>
                  {showClaudeKey && (
                    <button onClick={() => { setShowClaudeKey(false); setClaudeKey('') }}
                      className="text-[11px] text-stone-400 hover:text-stone-600 border-none bg-transparent cursor-pointer">
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )

        // Sort: unconnected first, stable
        const cards = [
          { connected: hasSavedML,     el: mailerLiteCard },
          { connected: metaConnected,  el: metaCard },
          { connected: hasSavedClaude, el: claudeCard },
        ].sort((a, b) => Number(a.connected) - Number(b.connected))

        const firstConnected = cards.findIndex(c => c.connected)

        return (
          <>
            {cards.map((c, i) => (
              <div key={i}>
                {firstConnected > 0 && i === firstConnected && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ background: '#EEEBE6' }} />
                    <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: '#C4BDB5' }}>
                      Connected
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#EEEBE6' }} />
                  </div>
                )}
                {c.el}
              </div>
            ))}
          </>
        )
      })()}

      {/* Help */}
      <div className="mt-2 mb-6 card p-5">
        <div className="text-[12.5px] font-bold text-[#0d1f35] mb-3">Need help finding your API keys?</div>
        <div className="space-y-2 text-[12px] text-stone-500 leading-relaxed">
          <div>
            <strong className="text-stone-700">MailerLite:</strong>{' '}
            Log in → click your name → Integrations → API → Developer API → Create new token
          </div>
          <div>
            <strong className="text-stone-700">Claude:</strong>{' '}
            Go to console.anthropic.com → API Keys → Create Key
          </div>
        </div>
      </div>

      {/* Notifications */}
      <NotificationsSection />

      {/* Privacy & Data */}
      <div className="card p-6 mb-4 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(30,45,61,0.06)' }}>🔒</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">Privacy & Data</div>
            <div className="text-[11.5px] text-stone-500">Your data, your control</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>Privacy Policy</Link>
          <Link href="/terms" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>Terms of Service</Link>
          <Link href="/data" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>Your Data</Link>
          <Link href="/dashboard/delete-account" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: '#F97B6B' }}>Delete Account</Link>
          <Link href="/dashboard/settings/billing" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>Billing</Link>
        </div>
      </div>
    </div>
  )
}
