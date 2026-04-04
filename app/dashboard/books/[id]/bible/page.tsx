'use client'
// app/dashboard/books/[id]/bible/page.tsx
// Book Bible — living context page per book. All fields auto-save on blur.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GENRES, getSubgenres, getTropes } from '@/lib/tropes'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BibleData {
  id: string
  title: string
  genre: string | null
  subgenre: string | null
  tropes: string[]
  customTropes: string[]
  blurb: string | null
  hookLines: string[]
  characterNotes: string | null
  moodNotes: string | null
  compTitles: string[]
  targetReader: string | null
  manuscriptUploadedAt: string | null
  bibleUpdatedAt: string | null
}

// ── Progress nudge ─────────────────────────────────────────────────────────────

function getProgressNudge(data: BibleData, wordCount: number | null): string {
  const allTropes = [...data.tropes, ...data.customTropes]
  const hasGenre = !!(data.genre && data.genre !== 'Write your own')
  const hasTropes = allTropes.length > 0
  const hasManuscript = !!(data.manuscriptUploadedAt || wordCount)
  const hasBlurb = !!(data.blurb?.trim())
  const hasDetails = !!(data.targetReader?.trim() || (data.compTitles?.length ?? 0) > 0)
  const hasCharacters = !!(data.characterNotes?.trim() || data.moodNotes?.trim())

  if (!hasGenre && !hasTropes && !hasBlurb && !hasManuscript) {
    return "Your AI has no context for this book yet. Start by picking a genre below."
  }
  if (hasGenre && !hasTropes) {
    return "Genre set — now pick your tropes so your AI knows what emotional buttons to push."
  }
  if (hasTropes && !hasManuscript && !hasBlurb) {
    return "Tropes locked in. Add your blurb or manuscript to unlock richer briefs."
  }
  if (hasTropes && hasBlurb && !hasManuscript) {
    return "Your AI knows the basics. Add your manuscript to unlock richer, more specific briefs."
  }
  if (hasTropes && hasManuscript && !hasDetails) {
    return "Nice work — your AI has solid context. Add comp titles and target reader to sharpen your ad copy."
  }
  if (hasTropes && hasManuscript && hasDetails && !hasCharacters) {
    return "Almost complete. Add character notes to help your AI write with the right voice and tension."
  }
  return "Your AI is well-briefed. Every field you fill in improves every brief and ad you generate."
}

// ── Collapsible section ────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-stone-50 transition-colors border-none bg-transparent cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-semibold text-[#1E2D3D]">{title}</span>
          <span className="text-[10.5px] font-medium text-stone-400 uppercase tracking-wide">optional</span>
        </div>
        <svg
          className="w-4 h-4 text-stone-400 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  )
}

// ── Saved toast ────────────────────────────────────────────────────────────────

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <span
      className="text-[11px] font-medium transition-opacity duration-300"
      style={{ color: '#6EBF8B', opacity: visible ? 1 : 0 }}
    >
      Saved
    </span>
  )
}

// ── Trope pill ────────────────────────────────────────────────────────────────

function TropePill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-all cursor-pointer"
      style={
        selected
          ? { background: 'rgba(233,160,32,0.15)', borderColor: '#E9A020', color: '#92400e' }
          : { background: 'white', borderColor: '#e5e7eb', color: '#6b7280' }
      }
    >
      {label}
    </button>
  )
}

// ── Selected trope tag ─────────────────────────────────────────────────────────

function SelectedTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
      style={{ background: 'rgba(233,160,32,0.12)', color: '#92400e' }}
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity border-none bg-transparent cursor-pointer p-0 leading-none text-[#92400e]"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookBiblePage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.id as string

  const [data, setData] = useState<BibleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({})
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [customTropeInput, setCustomTropeInput] = useState('')
  const [compTitleInput, setCompTitleInput] = useState('')
  const [hookLinesText, setHookLinesText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(`/api/books/${bookId}/bible`)
      .then(r => r.json())
      .then(({ book }) => {
        setData(book)
        setHookLinesText((book.hookLines ?? []).join('\n'))
        if (book.manuscriptUploadedAt) setUploadState('done')
      })
      .catch(() => router.push('/dashboard/settings'))
      .finally(() => setLoading(false))
  }, [bookId, router])

  // ── Save helper ────────────────────────────────────────────────────────────

  const save = useCallback(
    async (patch: Partial<BibleData>, fieldKey?: string) => {
      await fetch(`/api/books/${bookId}/bible`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (fieldKey) {
        setSavedFields(s => ({ ...s, [fieldKey]: true }))
        setTimeout(() => setSavedFields(s => ({ ...s, [fieldKey]: false })), 2000)
      }
    },
    [bookId],
  )

  // ── Trope helpers ──────────────────────────────────────────────────────────

  const toggleTrope = useCallback(
    (trope: string) => {
      if (!data) return
      const current = data.tropes ?? []
      const next = current.includes(trope) ? current.filter(t => t !== trope) : [...current, trope]
      const updated = { ...data, tropes: next }
      setData(updated)
      save({ tropes: next }, 'tropes')
    },
    [data, save],
  )

  const removeCustomTrope = useCallback(
    (trope: string) => {
      if (!data) return
      const next = (data.customTropes ?? []).filter(t => t !== trope)
      setData(d => d ? { ...d, customTropes: next } : d)
      save({ customTropes: next }, 'tropes')
    },
    [data, save],
  )

  const addCustomTrope = useCallback(() => {
    if (!data || !customTropeInput.trim()) return
    const next = [...(data.customTropes ?? []), customTropeInput.trim()]
    setData(d => d ? { ...d, customTropes: next } : d)
    setCustomTropeInput('')
    save({ customTropes: next }, 'tropes')
  }, [data, customTropeInput, save])

  const selectGenre = useCallback(
    (genre: string) => {
      if (!data) return
      const updated = { ...data, genre, subgenre: null, tropes: [], customTropes: [] }
      setData(updated)
      save({ genre, subgenre: null, tropes: [], customTropes: [] }, 'genre')
    },
    [data, save],
  )

  const selectSubgenre = useCallback(
    (subgenre: string) => {
      if (!data) return
      const updated = { ...data, subgenre, tropes: [], customTropes: [] }
      setData(updated)
      save({ subgenre, tropes: [], customTropes: [] }, 'subgenre')
    },
    [data, save],
  )

  // ── Comp titles helpers ────────────────────────────────────────────────────

  const addCompTitle = useCallback(() => {
    if (!data || !compTitleInput.trim()) return
    const next = [...(data.compTitles ?? []), compTitleInput.trim()]
    setData(d => d ? { ...d, compTitles: next } : d)
    setCompTitleInput('')
    save({ compTitles: next }, 'compTitles')
  }, [data, compTitleInput, save])

  const removeCompTitle = useCallback(
    (title: string) => {
      if (!data) return
      const next = (data.compTitles ?? []).filter(t => t !== title)
      setData(d => d ? { ...d, compTitles: next } : d)
      save({ compTitles: next }, 'compTitles')
    },
    [data, save],
  )

  // ── Manuscript upload ──────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadState('uploading')
      setUploadError('')
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch(`/api/books/${bookId}/manuscript`, { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Upload failed')
        setUploadState('done')
        setWordCount(json.wordCount)
        setData(d => d ? { ...d, manuscriptUploadedAt: new Date().toISOString() } : d)
      } catch (e) {
        setUploadState('error')
        setUploadError(e instanceof Error ? e.message : 'Upload failed')
      }
    },
    [bookId],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF8F0' }}>
        <div className="text-stone-400 text-sm">Loading Book Bible…</div>
      </div>
    )
  }

  if (!data) return null

  const allTropes = [...(data.tropes ?? []), ...(data.customTropes ?? [])]
  const availableSubgenres = data.genre && data.genre !== 'Write your own' ? getSubgenres(data.genre) : []
  const availableTropes = data.genre && data.subgenre && data.subgenre !== 'Write your own'
    ? getTropes(data.genre, data.subgenre)
    : null
  const isCustomGenre = data.genre === 'Write your own'
  const isCustomSubgenre = data.subgenre === 'Write your own'
  const showFreeTropeInput = isCustomGenre || isCustomSubgenre || (data.genre && data.subgenre && availableTropes === null)

  return (
    <div className="min-h-screen pb-20" style={{ background: '#FFF8F0' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8 sm:pt-12">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="text-[12px] text-stone-400 hover:text-[#1E2D3D] mb-4 inline-flex items-center gap-1 border-none bg-transparent cursor-pointer p-0 transition-colors"
          >
            ← Back to My Books
          </button>
          <h1 className="text-2xl font-bold text-[#1E2D3D] leading-tight">{data.title}</h1>
          <p className="text-sm text-stone-500 mt-1">Book Bible</p>
        </div>

        {/* Progress nudge */}
        <div
          className="mb-6 rounded-xl px-5 py-4 text-[13px] leading-relaxed"
          style={{ background: 'rgba(233,160,32,0.08)', color: '#92400e', borderLeft: '3px solid #E9A020' }}
        >
          {getProgressNudge(data, wordCount)}
        </div>

        <div className="flex flex-col gap-4">

          {/* ── Section 1: Genre & Tropes ──────────────────────────────────── */}
          <Section title="Genre & Tropes">
            {/* Step 1 — Genre */}
            <div className="mb-5">
              <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-wide mb-2.5">Step 1 — Genre</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <TropePill
                    key={genre}
                    label={genre}
                    selected={data.genre === genre}
                    onClick={() => selectGenre(genre)}
                  />
                ))}
              </div>
            </div>

            {/* Step 2 — Subgenre */}
            {data.genre && !isCustomGenre && availableSubgenres.length > 0 && (
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-wide mb-2.5">Step 2 — Subgenre</p>
                <div className="flex flex-wrap gap-2">
                  {availableSubgenres.map(sub => (
                    <TropePill
                      key={sub}
                      label={sub}
                      selected={data.subgenre === sub}
                      onClick={() => selectSubgenre(sub)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Tropes (pre-loaded) */}
            {!showFreeTropeInput && availableTropes && (
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-stone-400 uppercase tracking-wide mb-2.5">Step 3 — Tropes <span className="font-normal normal-case tracking-normal">(pick as many as you like)</span></p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableTropes.map(trope => (
                    <TropePill
                      key={trope}
                      label={trope}
                      selected={(data.tropes ?? []).includes(trope)}
                      onClick={() => toggleTrope(trope)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Free-text trope input (always shown, or shown exclusively for custom genre/subgenre) */}
            {(showFreeTropeInput || (availableTropes && data.subgenre)) && (
              <div className="mb-5">
                {showFreeTropeInput && (
                  <p className="text-[12px] text-stone-500 mb-2 italic">
                    We don&apos;t have pre-loaded tropes for this genre yet — type yours below.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTropeInput}
                    onChange={e => setCustomTropeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTrope() } }}
                    placeholder="+ Add your own trope"
                    className="flex-1 text-[13px] border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 bg-white"
                    style={{ color: '#1E2D3D' }}
                  />
                  <button
                    onClick={addCustomTrope}
                    disabled={!customTropeInput.trim()}
                    className="px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors border-none cursor-pointer"
                    style={{ background: customTropeInput.trim() ? '#E9A020' : '#e5e7eb', color: customTropeInput.trim() ? 'white' : '#9ca3af' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Selected tropes */}
            {allTropes.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Selected tropes</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(data.tropes ?? []).map(t => (
                    <SelectedTag key={t} label={t} onRemove={() => toggleTrope(t)} />
                  ))}
                  {(data.customTropes ?? []).map(t => (
                    <SelectedTag key={t} label={t} onRemove={() => removeCustomTrope(t)} />
                  ))}
                  <SavedToast visible={!!savedFields.tropes} />
                </div>
              </div>
            )}
          </Section>

          {/* ── Section 2: Manuscript Upload ───────────────────────────────── */}
          <Section title="Manuscript" defaultOpen={false}>
            <div
              onDragEnter={e => { e.preventDefault(); setDragging(true) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-10 px-6 text-center"
              style={{
                borderColor: dragging ? '#E9A020' : uploadState === 'done' ? '#6EBF8B' : '#d1d5db',
                background: dragging ? 'rgba(233,160,32,0.04)' : uploadState === 'done' ? 'rgba(110,191,139,0.05)' : 'white',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.epub,application/epub+zip"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
              />
              {uploadState === 'uploading' && (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
                  <p className="text-[13px] text-stone-500">Extracting text…</p>
                </>
              )}
              {uploadState === 'done' && (
                <>
                  <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="rgba(110,191,139,0.15)" />
                    <path d="M7.5 12.5l3 3 6-6" stroke="#6EBF8B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[13.5px] font-semibold" style={{ color: '#1E2D3D' }}>
                    Manuscript uploaded — your AI now has context for this book.
                  </p>
                  {wordCount && (
                    <p className="text-[12px] text-stone-500 mt-1">{wordCount.toLocaleString()} words</p>
                  )}
                  <p className="text-[11px] text-stone-400 mt-2">Click or drop to replace</p>
                </>
              )}
              {uploadState === 'idle' && (
                <>
                  <svg className="w-8 h-8 mb-3 text-stone-300" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-[13.5px] font-semibold text-[#1E2D3D]">Drop your manuscript here</p>
                  <p className="text-[12px] text-stone-400 mt-1">PDF, TXT, or EPUB · Click to browse</p>
                </>
              )}
              {uploadState === 'error' && (
                <>
                  <p className="text-[13px] font-semibold" style={{ color: '#F97B6B' }}>Upload failed</p>
                  <p className="text-[12px] text-stone-500 mt-1">{uploadError}</p>
                  <p className="text-[11px] text-stone-400 mt-2">Click to try again</p>
                </>
              )}
            </div>
          </Section>

          {/* ── Section 3: Book Details ────────────────────────────────────── */}
          <Section title="Book Details" defaultOpen={false}>
            {/* Blurb */}
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Back cover blurb</label>
              <textarea
                defaultValue={data.blurb ?? ''}
                onBlur={e => {
                  const val = e.target.value
                  setData(d => d ? { ...d, blurb: val } : d)
                  save({ blurb: val }, 'blurb')
                }}
                rows={5}
                placeholder="Your back cover copy goes here — even a rough draft works"
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none bg-white"
                style={{ color: '#1E2D3D' }}
              />
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.blurb} /></div>
            </div>

            {/* Hook lines */}
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Hook lines <span className="font-normal">(one per line)</span></label>
              <textarea
                value={hookLinesText}
                onChange={e => setHookLinesText(e.target.value)}
                onBlur={e => {
                  const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean)
                  setData(d => d ? { ...d, hookLines: lines } : d)
                  save({ hookLines: lines }, 'hookLines')
                }}
                rows={3}
                placeholder={"e.g. She said yes. He had three hours to disappear."}
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none bg-white"
                style={{ color: '#1E2D3D' }}
              />
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.hookLines} /></div>
            </div>

            {/* Comp titles */}
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Comp titles</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(data.compTitles ?? []).map(t => (
                  <SelectedTag key={t} label={t} onRemove={() => removeCompTitle(t)} />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={compTitleInput}
                  onChange={e => setCompTitleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompTitle() } }}
                  placeholder="e.g. It Ends with Us, The Kiss Quotient"
                  className="flex-1 text-[13px] border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 bg-white"
                  style={{ color: '#1E2D3D' }}
                />
                <button
                  onClick={addCompTitle}
                  disabled={!compTitleInput.trim()}
                  className="px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-colors border-none cursor-pointer"
                  style={{ background: compTitleInput.trim() ? '#E9A020' : '#e5e7eb', color: compTitleInput.trim() ? 'white' : '#9ca3af' }}
                >
                  Add
                </button>
              </div>
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.compTitles} /></div>
            </div>

            {/* Target reader */}
            <div>
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Target reader</label>
              <input
                type="text"
                defaultValue={data.targetReader ?? ''}
                onBlur={e => {
                  const val = e.target.value
                  setData(d => d ? { ...d, targetReader: val } : d)
                  save({ targetReader: val }, 'targetReader')
                }}
                placeholder="e.g. Readers who love emotional, steamy second-chance romance with found family themes"
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-400 bg-white"
                style={{ color: '#1E2D3D' }}
              />
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.targetReader} /></div>
            </div>
          </Section>

          {/* ── Section 4: Characters & Mood ───────────────────────────────── */}
          <Section title="Characters & Mood" defaultOpen={false}>
            {/* Character notes */}
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Character notes</label>
              <textarea
                defaultValue={data.characterNotes ?? ''}
                onBlur={e => {
                  const val = e.target.value
                  setData(d => d ? { ...d, characterNotes: val } : d)
                  save({ characterNotes: val }, 'characterNotes')
                }}
                rows={4}
                placeholder="Hero name, heroine name, key traits, the tension between them"
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none bg-white"
                style={{ color: '#1E2D3D' }}
              />
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.characterNotes} /></div>
            </div>

            {/* Mood notes */}
            <div>
              <label className="block text-[12px] font-semibold text-stone-500 mb-1.5">Mood & aesthetic notes</label>
              <textarea
                defaultValue={data.moodNotes ?? ''}
                onBlur={e => {
                  const val = e.target.value
                  setData(d => d ? { ...d, moodNotes: val } : d)
                  save({ moodNotes: val }, 'moodNotes')
                }}
                rows={3}
                placeholder="Dark and cinematic? Light and cozy? Describe the vibe."
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-400 resize-none bg-white"
                style={{ color: '#1E2D3D' }}
              />
              <div className="flex justify-end mt-1"><SavedToast visible={!!savedFields.moodNotes} /></div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  )
}
