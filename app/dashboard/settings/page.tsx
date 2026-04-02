'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CategoryTagInput } from '@/components/CategoryTagInput'
import { IconStar } from '@/components/icons'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

interface BookEntry {
  id: string
  title: string
  asin: string
  categories: string[]
  series: string
  bookNumber: string
}

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

// ── Blank book entry ──────────────────────────────────────────────────────────
function blankBook(): BookEntry {
  return { id: crypto.randomUUID(), title: '', asin: '', categories: [], series: '', bookNumber: '' }
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
  const [books,          setBooks]          = useState<BookEntry[]>([])
  const [booksSaveState, setBooksSaveState] = useState<SaveState>('idle')
  const [editingId,      setEditingId]      = useState<string | null>(null)

  // Benchmarks
  const [benchmarks,      setBenchmarks]      = useState({ email_open_rate: '25', email_click_rate: '2', meta_cpc: '0.15', meta_ctr: '15' })
  const [benchmarksSave,  setBenchmarksSave]  = useState<SaveState>('idle')

  // Load keys + books on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setHasSavedML(!!d.mailerLiteKey)
        setHasSavedClaude(!!d.claudeKey)
        setMetaConnected(!!d.metaConnected)
        setMetaLastSync(d.metaLastSync ?? null)
        // load benchmarks/goals
        fetch('/api/prefs').then(r => r.json()).then(p => {
          const g = p.goals ?? {}
          setBenchmarks({
            email_open_rate: g.email_open_rate != null ? String(g.email_open_rate) : '25',
            email_click_rate: g.email_click_rate != null ? String(g.email_click_rate) : '2',
            meta_cpc: g.meta_cpc != null ? String(g.meta_cpc) : '0.15',
            meta_ctr: g.meta_ctr != null ? String(g.meta_ctr) : '15',
          })
        }).catch(() => {})

        if (Array.isArray(d.books)) {
          setBooks(d.books.map((b: Omit<BookEntry, 'id'> & { id?: string; category?: string }) => ({
            ...b,
            id: b.id ?? crypto.randomUUID(),
            // Normalize: old data may have single string `category`
            categories: Array.isArray(b.categories)
              ? b.categories
              : b.category
              ? [b.category]
              : [],
          })))
        }
      })
      .catch(() => {})
  }, [])

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

  // ── Books handlers ────────────────────────────────────────────────────────
  function addBook() {
    const b = blankBook()
    setBooks(prev => [...prev, b])
    setEditingId(b.id)
  }

  function updateBook(id: string, field: keyof BookEntry, val: string | string[]) {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b))
  }

  function removeBook(id: string) {
    setBooks(prev => prev.filter(b => b.id !== id))
    if (editingId === id) setEditingId(null)
  }

  async function saveBooks() {
    setBooksSaveState('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-books', books }),
      })
      if (!res.ok) throw new Error()
      setBooksSaveState('saved')
      setEditingId(null)
      setTimeout(() => setBooksSaveState('idle'), 3000)
    } catch {
      setBooksSaveState('error')
      setTimeout(() => setBooksSaveState('idle'), 3000)
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
            <div className="text-[11.5px] text-stone-500">Used by your coach to personalise recommendations</div>
          </div>
        </div>

        {/* Book list */}
        <div className="space-y-3 mb-4">
          {books.length === 0 && (
            <p className="text-[12.5px] text-stone-500 py-2">No books added yet. Click below to add your first.</p>
          )}
          {books.map(book => (
            <div key={book.id} className="rounded-xl border border-stone-200 overflow-hidden">
              {/* Collapsed view */}
              {editingId !== book.id ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#0d1f35] truncate">
                      {book.title || <span className="text-stone-500 font-normal">Untitled book</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {book.categories?.map(cat => (
                        <span key={cat} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(233,160,32,0.12)', color: '#92400e' }}>
                          {cat}
                        </span>
                      ))}
                      {book.series && (
                        <span className="text-[11px] text-stone-500">
                          {book.series}{book.bookNumber ? ` #${book.bookNumber}` : ''}
                        </span>
                      )}
                      {book.asin && (
                        <span className="text-[10.5px] font-mono text-stone-300">{book.asin}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingId(book.id)}
                    className="text-[12px] text-stone-500 hover:text-[#0d1f35] px-2 py-1 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeBook(book.id)}
                    className="text-[12px] text-stone-300 hover:text-red-500 px-2 py-1 rounded transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                /* Expanded edit form */
                <div className="p-4 space-y-3" style={{ background: '#fafaf9' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Book Title
                      </label>
                      <input
                        type="text"
                        value={book.title}
                        onChange={e => updateBook(book.id, 'title', e.target.value)}
                        placeholder="e.g. My Off-Limits Roommate"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px]
                                   text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                                   transition-colors duration-150"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Categories <span className="normal-case font-normal text-stone-500">(up to 8)</span>
                      </label>
                      <CategoryTagInput
                        value={book.categories ?? []}
                        onChange={v => updateBook(book.id, 'categories', v)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Amazon ASIN <span className="normal-case font-normal text-stone-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={book.asin}
                        onChange={e => updateBook(book.id, 'asin', e.target.value)}
                        placeholder="B0ABC123DE"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px]
                                   font-mono text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                                   transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Book # in Series <span className="normal-case font-normal text-stone-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={book.bookNumber}
                        onChange={e => updateBook(book.id, 'bookNumber', e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px]
                                   text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                                   transition-colors duration-150"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Series Name <span className="normal-case font-normal text-stone-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={book.series}
                        onChange={e => updateBook(book.id, 'series', e.target.value)}
                        placeholder="e.g. The Roommate Series"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px]
                                   text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                                   transition-colors duration-150"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[12.5px] font-semibold px-4 py-1.5 rounded-lg border border-stone-200
                                 text-stone-500 hover:bg-stone-50 transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add book + save */}
        <div className="flex items-center gap-3">
          <button
            onClick={addBook}
            className="text-[12.5px] font-semibold px-4 py-2 rounded-lg border border-dashed border-stone-300
                       text-stone-500 hover:border-amber-brand hover:text-amber-brand transition-all duration-150"
          >
            + Add a book
          </button>
          {books.length > 0 && (
            <button
              onClick={saveBooks}
              disabled={booksSaveState === 'saving'}
              className="text-[12.5px] font-semibold px-4 py-2 rounded-lg transition-all duration-150
                         disabled:opacity-50"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {booksSaveState === 'saving' ? 'Saving…'
                : booksSaveState === 'saved' ? '✓ Saved!'
                : booksSaveState === 'error' ? 'Save failed'
                : 'Save my books'}
            </button>
          )}
        </div>
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

      {/* ─── MailerLite ──────────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(52,211,153,0.1)' }}>📧</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">MailerLite</div>
            <div className="text-[11.5px] text-stone-500">Pulls your email stats automatically</div>
          </div>
        </div>

        <KeyField
          label="MailerLite API Key"
          hint="Go to MailerLite → Integrations → API → Create a new token. Paste it here."
          placeholder="ml_••••••••••••••••••••••••••"
          value={mailerLiteKey}
          onChange={setMailerLiteKey}
          saved={hasSavedML}
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="text-[12.5px] font-semibold px-4 py-2 rounded-lg border border-stone-200
                       text-stone-600 hover:bg-stone-50 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testState === 'testing' ? 'Checking...' : 'Test Connection'}
          </button>
          {testResult && (
            <span className={`text-[12px] font-semibold ${testState === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
              {testState === 'ok' ? '✓ ' : '✕ '}{testResult}
            </span>
          )}
        </div>
      </div>

      {/* ─── Meta Ads ─────────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(96,165,250,0.1)' }}>📣</div>
          <div className="flex-1">
            <div className="font-bold text-[#0d1f35] text-[14px]">Meta Ads</div>
            <div className="text-[11.5px] text-stone-500">Connect to auto-sync your ad performance daily</div>
          </div>
          {metaConnected ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(110,191,139,0.1)', color: '#6EBF8B' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#6EBF8B' }} />
              Connected
            </span>
          ) : (
            <a href="/api/meta/connect"
              className="px-4 py-2 rounded-lg text-[12px] font-semibold no-underline transition-all hover:opacity-90"
              style={{ background: '#60A5FA', color: 'white' }}>
              Connect Meta Ads →
            </a>
          )}
        </div>
        {metaConnected && metaLastSync && (
          <div className="text-[11px] px-3 py-2 rounded-lg" style={{ background: '#F5F5F4', color: '#6B7280' }}>
            Last synced: {new Date(metaLastSync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ─── Claude ──────────────────────────────────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(233,160,32,0.1)' }}>🤖</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">Claude AI</div>
            <div className="text-[11.5px] text-stone-500">Powers your monthly coaching session</div>
          </div>
        </div>

        <KeyField
          label="Claude API Key"
          hint="Go to console.anthropic.com → API Keys → Create Key. Paste it here. It starts with sk-ant-."
          placeholder="sk-ant-••••••••••••••••••••"
          value={claudeKey}
          onChange={setClaudeKey}
          saved={hasSavedClaude}
        />

        <p className="text-[11.5px] text-stone-500 mt-3 leading-relaxed">
          Each analysis costs roughly $0.05–$0.15 from your Anthropic account.
          You control your own usage — we never charge you directly.
        </p>
      </div>

      {/* Save keys button */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="flex items-center gap-2 px-7 py-3 rounded-lg text-[14px] font-bold
                   transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#e9a020', color: '#0d1f35' }}
      >
        {saveState === 'saving' ? 'Saving...'
          : saveState === 'saved' ? '✓ Saved!'
          : saveState === 'error' ? 'Save failed — try again'
          : 'Save settings'}
      </button>

      {/* Help */}
      <div className="mt-8 card p-5">
        <div className="text-[12.5px] font-bold text-[#0d1f35] mb-3">Need help finding your API keys?</div>
        <div className="space-y-2 text-[12px] text-stone-500 leading-relaxed">
          <div>
            <strong className="text-stone-700">MailerLite:</strong>{' '}
            Log in → click your name in the top right → Integrations → API → Developer API → Create new token
          </div>
          <div>
            <strong className="text-stone-700">Claude:</strong>{' '}
            Go to console.anthropic.com → sign up or log in → click API Keys in the left menu → Create Key
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
