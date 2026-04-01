'use client'
// app/dashboard/settings/page.tsx
import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TestState = 'idle' | 'testing' | 'ok' | 'error'

interface BookEntry {
  id: string
  title: string
  asin: string
  category: string
  series: string
  bookNumber: string
}

// ── Category list ─────────────────────────────────────────────────────────────
const CATEGORY_GROUPS: { group: string; categories: string[] }[] = [
  {
    group: 'Romance',
    categories: [
      'Contemporary Romance',
      'Romantic Suspense',
      'Historical Romance',
      'Western Romance',
      'Small Town Romance',
      'Second Chance Romance',
      'Enemies to Lovers Romance',
      'Fake Dating Romance',
      'Forced Proximity Romance',
      'Sports Romance',
      'Military Romance',
      'Medical Romance',
      'Office Romance',
      'Age Gap Romance',
      'Reverse Harem Romance',
      'Dark Romance',
      'Billionaire Romance',
      'Royalty Romance',
      'Holiday Romance',
      'Clean & Wholesome Romance',
      'Inspirational Romance',
      'LGBTQ+ Romance',
      'Interracial Romance',
      'Plus Size Romance',
      'New Adult & College Romance',
    ],
  },
  {
    group: 'Mafia & Dark Romance',
    categories: [
      'Mafia Romance',
      'Dark Mafia Romance',
      'Cartel Romance',
      'Organized Crime Romance',
      'Forbidden Dark Romance',
      'Captive Romance',
      'Bully Romance',
    ],
  },
  {
    group: 'Paranormal Romance',
    categories: [
      'Paranormal Romance',
      'Vampire Romance',
      'Werewolf Romance',
      'Shifter Romance',
      'Witch Romance',
      'Fae Romance',
      'Dragon Romance',
      'Demon Romance',
      'Angel Romance',
      'Ghost Romance',
      'Psychic Romance',
      'Fantasy Romance',
      'Dark Fantasy Romance',
    ],
  },
  {
    group: 'Cozy Mystery',
    categories: [
      'Cozy Mystery',
      'Culinary Cozy Mystery',
      'Pet Cozy Mystery',
      'Craft Cozy Mystery',
      'Bookshop Cozy Mystery',
      'Paranormal Cozy Mystery',
      'Small Town Cozy Mystery',
    ],
  },
]

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories)

// ── Category autocomplete ─────────────────────────────────────────────────────
function CategoryInput({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open,      setOpen]      = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const uid = useId()

  const filtered = value.trim()
    ? ALL_CATEGORIES.filter(c => c.toLowerCase().includes(value.toLowerCase()))
    : ALL_CATEGORIES

  // Group the filtered results
  const filteredGroups = CATEGORY_GROUPS
    .map(g => ({ ...g, categories: g.categories.filter(c => filtered.includes(c)) }))
    .filter(g => g.categories.length > 0)

  const flatFiltered = filteredGroups.flatMap(g => g.categories)

  function selectItem(cat: string) {
    onChange(cat)
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') { setOpen(false); setHighlighted(-1); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, flatFiltered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, -1))
    }
    if (e.key === 'Enter') {
      if (highlighted >= 0 && flatFiltered[highlighted]) {
        e.preventDefault()
        selectItem(flatFiltered[highlighted])
      } else {
        setOpen(false)
      }
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlighted}"]`) as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  // Build flat index for highlighting across groups
  let globalIdx = 0

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={uid}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Type or choose a category…"
        autoComplete="off"
        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px]
                   text-[#0d1f35] bg-white outline-none focus:border-amber-brand
                   transition-colors duration-150"
      />

      {open && flatFiltered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-y-auto"
          style={{
            maxHeight: 300,
            background: '#fff',
            border: '1px solid #e7e5e4',
            top: '100%',
          }}
        >
          {filteredGroups.map(group => (
            <div key={group.group}>
              <div className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-[1.2px]"
                style={{ color: '#a8a29e', background: '#fafaf9', borderBottom: '1px solid #f5f5f4' }}>
                {group.group}
              </div>
              {group.categories.map(cat => {
                const idx = globalIdx++
                const isHighlighted = idx === highlighted
                return (
                  <div
                    key={cat}
                    data-idx={idx}
                    onMouseDown={() => selectItem(cat)}
                    onMouseEnter={() => setHighlighted(idx)}
                    className="px-3 py-2 text-[13px] cursor-pointer transition-colors duration-75"
                    style={{
                      color: isHighlighted ? '#0d1f35' : '#44403c',
                      background: isHighlighted ? '#fef3c7' : 'transparent',
                      fontWeight: isHighlighted ? 600 : 400,
                    }}
                  >
                    {cat}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Always allow custom entry if typed value isn't in the list */}
          {value.trim() && !ALL_CATEGORIES.some(c => c.toLowerCase() === value.toLowerCase()) && (
            <div
              onMouseDown={() => selectItem(value.trim())}
              onMouseEnter={() => setHighlighted(flatFiltered.length)}
              className="px-3 py-2.5 text-[12.5px] cursor-pointer border-t"
              style={{
                color: '#e9a020',
                background: highlighted === flatFiltered.length ? '#fef3c7' : 'transparent',
                borderColor: '#f5f5f4',
              }}
            >
              Use &ldquo;<strong>{value.trim()}</strong>&rdquo; as a custom category
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  return { id: crypto.randomUUID(), title: '', asin: '', category: '', series: '', bookNumber: '' }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [mailerLiteKey,  setMailerLiteKey]  = useState('')
  const [claudeKey,      setClaudeKey]      = useState('')
  const [hasSavedML,     setHasSavedML]     = useState(false)
  const [hasSavedClaude, setHasSavedClaude] = useState(false)
  const [saveState,      setSaveState]      = useState<SaveState>('idle')
  const [testState,      setTestState]      = useState<TestState>('idle')
  const [testResult,     setTestResult]     = useState<string>('')

  const [books,          setBooks]          = useState<BookEntry[]>([])
  const [booksSaveState, setBooksSaveState] = useState<SaveState>('idle')
  const [editingId,      setEditingId]      = useState<string | null>(null)

  // Load keys + books on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setHasSavedML(!!d.mailerLiteKey)
        setHasSavedClaude(!!d.claudeKey)
        if (Array.isArray(d.books)) {
          setBooks(d.books.map((b: Omit<BookEntry, 'id'> & { id?: string }) => ({
            ...b,
            id: b.id ?? crypto.randomUUID(),
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

  function updateBook(id: string, field: keyof BookEntry, val: string) {
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
            <div className="text-[11.5px] text-stone-400">Used by your coach to personalise recommendations</div>
          </div>
        </div>

        {/* Book list */}
        <div className="space-y-3 mb-4">
          {books.length === 0 && (
            <p className="text-[12.5px] text-stone-400 py-2">No books added yet. Click below to add your first.</p>
          )}
          {books.map(book => (
            <div key={book.id} className="rounded-xl border border-stone-200 overflow-hidden">
              {/* Collapsed view */}
              {editingId !== book.id ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#0d1f35] truncate">
                      {book.title || <span className="text-stone-400 font-normal">Untitled book</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {book.category && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(233,160,32,0.12)', color: '#92400e' }}>
                          {book.category}
                        </span>
                      )}
                      {book.series && (
                        <span className="text-[11px] text-stone-400">
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
                    className="text-[12px] text-stone-400 hover:text-[#0d1f35] px-2 py-1 rounded transition-colors"
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
                        Category
                      </label>
                      <CategoryInput
                        value={book.category}
                        onChange={v => updateBook(book.id, 'category', v)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1">
                        Amazon ASIN <span className="normal-case font-normal text-stone-400">(optional)</span>
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
                        Book # in Series <span className="normal-case font-normal text-stone-400">(optional)</span>
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
                        Series Name <span className="normal-case font-normal text-stone-400">(optional)</span>
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

      {/* ─── MailerLite ──────────────────────────────────────────────────── */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(52,211,153,0.1)' }}>📧</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">MailerLite</div>
            <div className="text-[11.5px] text-stone-400">Pulls your email stats automatically</div>
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

      {/* ─── Claude ──────────────────────────────────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(233,160,32,0.1)' }}>🤖</div>
          <div>
            <div className="font-bold text-[#0d1f35] text-[14px]">Claude AI</div>
            <div className="text-[11.5px] text-stone-400">Powers your monthly coaching session</div>
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

        <p className="text-[11.5px] text-stone-400 mt-3 leading-relaxed">
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

      {/* Legal links */}
      <div className="flex items-center gap-5 mt-8 pt-6 border-t border-stone-100">
        <Link href="/privacy"
          className="text-[12px] text-stone-400 no-underline hover:underline hover:text-stone-600">
          Privacy Policy
        </Link>
        <span className="text-stone-200">·</span>
        <Link href="/terms"
          className="text-[12px] text-stone-400 no-underline hover:underline hover:text-stone-600">
          Terms of Service
        </Link>
      </div>
    </div>
  )
}
