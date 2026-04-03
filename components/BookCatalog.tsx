'use client'
// components/BookCatalog.tsx
// Full book catalog manager for the Settings page.
// Drag-to-reorder cards, add/edit modal, cover image upload/URL/Amazon pull.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BOOK_COLORS } from '@/lib/bookColors'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Book {
  id: string
  title: string
  asin: string | null
  seriesName: string | null
  seriesOrder: number | null
  isLeadMagnet: boolean
  excludeFromDashboard: boolean
  coverUrl: string | null
  pubDate: string | null
  sortOrder: number
}

interface BookForm {
  title: string
  asin: string
  seriesName: string
  seriesOrder: string
  isLeadMagnet: boolean
  coverUrl: string
  pubDate: string
  coverTab: 'upload' | 'url' | 'amazon'
}

function blankForm(): BookForm {
  return {
    title: '',
    asin: '',
    seriesName: '',
    seriesOrder: '',
    isLeadMagnet: false,
    coverUrl: '',
    pubDate: '',
    coverTab: 'url',
  }
}

function bookToForm(b: Book): BookForm {
  // Determine initial cover tab
  let coverTab: BookForm['coverTab'] = 'url'
  if (b.coverUrl?.startsWith('data:')) coverTab = 'upload'
  else if (b.asin && b.coverUrl?.includes('ssl-images-amazon.com')) coverTab = 'amazon'

  return {
    title: b.title,
    asin: b.asin ?? '',
    seriesName: b.seriesName ?? '',
    seriesOrder: b.seriesOrder != null ? String(b.seriesOrder) : '',
    isLeadMagnet: b.isLeadMagnet,
    coverUrl: b.coverUrl ?? '',
    pubDate: b.pubDate ? b.pubDate.slice(0, 10) : '',
    coverTab,
  }
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const COLOR_NAMES = ['coral', 'peach', 'plum', 'teal', 'sky', 'rose']

function colorForIndex(i: number) {
  return BOOK_COLORS[i % BOOK_COLORS.length]
}

// ── Drag handle (6-dot grid) ──────────────────────────────────────────────────

function DragHandle() {
  return (
    <div className="flex flex-col gap-[3px]">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex gap-[3px]">
          <div className="w-[4px] h-[4px] rounded-full" style={{ background: '#c7c3c0' }} />
          <div className="w-[4px] h-[4px] rounded-full" style={{ background: '#c7c3c0' }} />
        </div>
      ))}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-10 h-6 rounded-full relative transition-colors border-none cursor-pointer shrink-0"
      style={{ background: checked ? '#34d399' : '#D6D3D1' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  )
}

// ── Cover image display ───────────────────────────────────────────────────────

// Navy placeholder shown when a book has no cover yet
function CoverPlaceholder({ color, width = 40, height = 60 }: { color: string; width?: number; height?: number }) {
  return (
    <div className="flex flex-col items-center shrink-0" style={{ width }}>
      <div
        className="rounded flex items-center justify-center"
        style={{ width, height, background: '#1E2D3D' }}
      >
        <div className="rounded-full" style={{ width: 9, height: 9, background: color }} />
      </div>
      <span className="mt-1 text-[10px] text-stone-400 leading-none">Add cover</span>
    </div>
  )
}

function CoverThumb({ coverUrl, asin, title, colorIndex }: { coverUrl: string | null; asin: string | null; title: string; colorIndex: number }) {
  const [errored, setErrored] = useState(false)
  const src = coverUrl || (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg` : null)
  const color = colorForIndex(colorIndex)

  if (!src || errored) {
    return <CoverPlaceholder color={color} />
  }
  return (
    <img
      src={src}
      alt={title}
      onError={() => setErrored(true)}
      className="rounded object-cover shrink-0"
      style={{ width: 40, height: 60 }}
    />
  )
}

// ── Sortable book card ────────────────────────────────────────────────────────

function SortableBookCard({
  book,
  index,
  onEdit,
  onDelete,
  onToggleExclude,
}: {
  book: Book
  index: number
  onEdit: (b: Book) => void
  onDelete: (id: string) => void
  onToggleExclude: (id: string, val: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: book.id })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const color = colorForIndex(index)
  const colorName = COLOR_NAMES[index % COLOR_NAMES.length]
  const slotLabel = `B${index + 1}`

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white group/card"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-30 group-hover/card:opacity-70 hover:!opacity-100 transition-opacity border-none bg-transparent p-0 shrink-0"
        aria-label="Drag to reorder"
        style={{ touchAction: 'none' }}
      >
        <DragHandle />
      </button>

      {/* Cover */}
      <CoverThumb coverUrl={book.coverUrl} asin={book.asin} title={book.title} colorIndex={index} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-[#1E2D3D] truncate">
          {book.title || <span className="text-stone-400 font-normal">Untitled</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {book.asin && (
            <span className="text-[10.5px] font-mono text-stone-400">{book.asin}</span>
          )}
          {book.seriesName && (
            <span className="text-[11px] text-stone-500">
              {book.seriesName}{book.seriesOrder != null ? ` #${book.seriesOrder}` : ''}
            </span>
          )}
          {book.isLeadMagnet && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(233,160,32,0.12)', color: '#92400e' }}
            >
              Lead Magnet
            </span>
          )}
          {book.excludeFromDashboard && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280' }}
            >
              Hidden
            </span>
          )}
          {book.pubDate && (
            <span className="text-[10.5px] text-stone-400">
              {new Date(book.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* Color slot badge */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
          {slotLabel}
        </span>
        <span className="text-[10px] text-stone-400 hidden sm:inline">{colorName}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          title={book.excludeFromDashboard ? 'Show in dashboard' : 'Exclude from dashboard'}
          onClick={() => onToggleExclude(book.id, !book.excludeFromDashboard)}
          className="text-[12px] px-2 py-1 rounded transition-colors border-none bg-transparent cursor-pointer"
          style={{ color: book.excludeFromDashboard ? '#E9A020' : '#D1D5DB' }}
        >
          {book.excludeFromDashboard ? '👁 Show' : '🚫 Hide'}
        </button>
        <button
          onClick={() => onEdit(book)}
          className="text-[12px] font-semibold text-stone-500 hover:text-[#1E2D3D] px-2 py-1 rounded transition-colors border-none bg-transparent cursor-pointer"
        >
          Edit
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(book.id)}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded border-none bg-transparent cursor-pointer"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] text-stone-400 hover:text-stone-600 px-1 py-1 rounded border-none bg-transparent cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[12px] text-stone-300 hover:text-red-500 px-2 py-1 rounded transition-colors border-none bg-transparent cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Book modal ────────────────────────────────────────────────────────────────

function BookModal({
  editing,
  onClose,
  onSave,
  isSaving,
  colorIndex,
}: {
  editing: Book | null
  onClose: () => void
  onSave: (form: BookForm) => void
  isSaving: boolean
  colorIndex: number
}) {
  const [form, setForm] = useState<BookForm>(editing ? bookToForm(editing) : blankForm())
  const fileRef = useRef<HTMLInputElement>(null)
  const [coverPreviewError, setCoverPreviewError] = useState(false)

  // When ASIN is entered, auto-switch to amazon tab if currently on url/upload
  useEffect(() => {
    if (form.asin && form.coverTab !== 'upload' && form.coverTab !== 'amazon') {
      setForm(f => ({ ...f, coverTab: 'amazon' }))
    }
  }, [form.asin]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof BookForm>(key: K, val: BookForm[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set('coverUrl', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleAmazonPull() {
    if (!form.asin) return
    const url = `https://images-na.ssl-images-amazon.com/images/P/${form.asin.trim()}.01.LZZZZZZZ.jpg`
    set('coverUrl', url)
    setCoverPreviewError(false)
  }

  // Derived: current cover preview source
  const previewSrc = (() => {
    if (form.coverTab === 'amazon' && form.asin) {
      return `https://images-na.ssl-images-amazon.com/images/P/${form.asin.trim()}.01.LZZZZZZZ.jpg`
    }
    return form.coverUrl || null
  })()

  const titleValid = form.title.trim().length > 0

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(30,45,61,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: '#FFF8F0', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <h2 className="font-sans text-[18px] text-[#1E2D3D]">
            {editing ? 'Edit Book' : 'Add a Book'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-[#1E2D3D] hover:bg-stone-100 transition-all border-none bg-transparent cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
              Book Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. My Off-Limits Roommate"
              autoFocus
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
            />
          </div>

          {/* ASIN + Publication date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
                ASIN
              </label>
              <input
                type="text"
                value={form.asin}
                onChange={e => set('asin', e.target.value)}
                placeholder="e.g. B0GSC2RTF8"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] font-mono text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
              />
              {form.asin && (
                <a
                  href={`https://www.amazon.com/dp/${form.asin.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-[11px] font-semibold no-underline hover:underline"
                  style={{ color: '#E9A020' }}
                >
                  Find your ASIN →
                </a>
              )}
              {!form.asin && (
                <span className="block mt-1 text-[11px] text-stone-400">Enter ASIN to verify on Amazon</span>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
                Publication Date
              </label>
              <input
                type="date"
                value={form.pubDate}
                onChange={e => set('pubDate', e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
              />
            </div>
          </div>

          {/* Series name + order */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
                Series Name <span className="normal-case font-normal text-stone-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.seriesName}
                onChange={e => set('seriesName', e.target.value)}
                placeholder="e.g. Stillwater Series"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-1.5">
                Order
              </label>
              <input
                type="number"
                min="1"
                value={form.seriesOrder}
                onChange={e => set('seriesOrder', e.target.value)}
                placeholder="1"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
              />
            </div>
          </div>

          {/* Lead magnet toggle */}
          <div className="flex items-center justify-between py-2 border-t border-stone-100">
            <div>
              <div className="text-[13px] font-semibold text-[#1E2D3D]">Is Lead Magnet</div>
              <div className="text-[11px] text-stone-500">This book is used to grow your email list</div>
            </div>
            <Toggle checked={form.isLeadMagnet} onChange={v => set('isLeadMagnet', v)} />
          </div>

          {/* Cover image */}
          <div className="border-t border-stone-100 pt-3">
            <label className="block text-[11px] font-bold uppercase tracking-[0.8px] text-stone-500 mb-2">
              Cover Image
            </label>

            {/* Persistent preview / placeholder */}
            <div className="flex items-start gap-3 mb-3">
              {previewSrc && !coverPreviewError ? (
                <>
                  <img
                    src={previewSrc}
                    alt="Cover preview"
                    onError={() => setCoverPreviewError(true)}
                    className="rounded object-cover border border-stone-200 shrink-0"
                    style={{ width: 48, height: 72 }}
                  />
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[11px] text-stone-500">Cover preview</span>
                    <button
                      type="button"
                      onClick={() => { set('coverUrl', ''); setCoverPreviewError(false) }}
                      className="text-[11px] text-stone-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer text-left p-0"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <CoverPlaceholder color={colorForIndex(colorIndex)} width={48} height={72} />
                  <span className="text-[11px] text-stone-400 pt-1 leading-relaxed">
                    No cover yet — upload a file, paste a URL, or pull from Amazon below.
                  </span>
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 p-1 rounded-lg" style={{ background: 'rgba(30,45,61,0.05)' }}>
              {(['upload', 'url', ...(form.asin ? ['amazon'] : [])] as BookForm['coverTab'][]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => set('coverTab', tab)}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all border-none cursor-pointer"
                  style={{
                    background: form.coverTab === tab ? 'white' : 'transparent',
                    color: form.coverTab === tab ? '#1E2D3D' : '#9CA3AF',
                    boxShadow: form.coverTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {tab === 'upload' ? 'Upload cover' : tab === 'url' ? 'Use URL' : 'Pull from Amazon'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {form.coverTab === 'upload' && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-lg text-[12px] font-semibold text-stone-500 hover:border-[#E9A020] hover:text-[#E9A020] transition-all cursor-pointer bg-transparent"
                >
                  {form.coverUrl?.startsWith('data:') ? '✓ Cover uploaded — click to change' : 'Click to upload cover image'}
                </button>
              </div>
            )}

            {form.coverTab === 'url' && (
              <input
                type="url"
                value={form.coverUrl?.startsWith('data:') ? '' : form.coverUrl}
                onChange={e => set('coverUrl', e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] text-[#1E2D3D] bg-white outline-none focus:border-[#E9A020] transition-colors"
              />
            )}

            {form.coverTab === 'amazon' && (
              <div className="flex gap-2">
                <div
                  className="flex-1 py-2.5 px-3 border border-stone-200 rounded-lg text-[12px] text-stone-400 bg-stone-50 truncate"
                >
                  {form.asin
                    ? `images-na.ssl-images-amazon.com/images/P/${form.asin}.01.LZZZZZZZ.jpg`
                    : 'Enter ASIN above to pull cover'}
                </div>
                <button
                  type="button"
                  onClick={handleAmazonPull}
                  disabled={!form.asin}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all disabled:opacity-40"
                  style={{ background: '#E9A020', color: '#1E2D3D' }}
                >
                  Pull
                </button>
              </div>
            )}

            {coverPreviewError && (
              <p className="mt-2 text-[11px] text-red-400">Could not load image — check the URL or try uploading instead.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12.5px] font-semibold border border-stone-200 text-stone-500 hover:bg-stone-50 transition-all cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!titleValid || isSaving}
            className="px-5 py-2 rounded-lg text-[12.5px] font-semibold border-none cursor-pointer transition-all disabled:opacity-40"
            style={{ background: '#E9A020', color: '#1E2D3D' }}
          >
            {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Add Book'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main BookCatalog component ────────────────────────────────────────────────

export function BookCatalog() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editingIndex, setEditingIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'position' | 'az'>('position')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Load books
  const loadBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books')
      const data = await res.json()
      if (Array.isArray(data.books)) {
        setBooks(data.books.map((b: Book & { pubDate?: string | null }) => ({
          ...b,
          excludeFromDashboard: b.excludeFromDashboard ?? false,
          pubDate: b.pubDate ? new Date(b.pubDate).toISOString() : null,
        })))
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadBooks() }, [loadBooks])

  // Filtered + sorted view (DnD only active when position order + no search)
  const displayedBooks = useMemo(() => {
    let result = [...books]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.asin?.toLowerCase().includes(q) ?? false)
      )
    }
    if (sortOrder === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }
    return result
  }, [books, searchQuery, sortOrder])

  const isDndActive = !searchQuery.trim() && sortOrder === 'position'

  // Open add modal
  function openAdd() {
    setEditingBook(null)
    setEditingIndex(books.length)
    setModalOpen(true)
  }

  // Open edit modal
  function openEdit(book: Book) {
    setEditingBook(book)
    setEditingIndex(books.findIndex(b => b.id === book.id))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingBook(null)
  }

  // Save (create or update)
  async function handleSave(form: BookForm) {
    setIsSaving(true)
    try {
      let coverUrl = form.coverUrl || null
      if (form.coverTab === 'amazon' && form.asin) {
        coverUrl = `https://images-na.ssl-images-amazon.com/images/P/${form.asin.trim()}.01.LZZZZZZZ.jpg`
      }

      const payload = {
        title: form.title.trim(),
        asin: form.asin.trim() || null,
        seriesName: form.seriesName.trim() || null,
        seriesOrder: form.seriesOrder ? parseInt(form.seriesOrder) : null,
        isLeadMagnet: form.isLeadMagnet,
        coverUrl,
        pubDate: form.pubDate || null,
      }

      if (editingBook) {
        await fetch(`/api/books/${editingBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      await loadBooks()
      closeModal()
    } finally {
      setIsSaving(false)
    }
  }

  // Delete
  async function handleDelete(id: string) {
    await fetch(`/api/books/${id}`, { method: 'DELETE' })
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  // Toggle exclude from dashboard
  async function handleToggleExclude(id: string, val: boolean) {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, excludeFromDashboard: val } : b))
    await fetch(`/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludeFromDashboard: val }),
    })
  }

  // Drag end — reorder locally then persist
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = books.findIndex(b => b.id === active.id)
    const newIndex = books.findIndex(b => b.id === over.id)
    const reordered = arrayMove(books, oldIndex, newIndex)
    setBooks(reordered)

    setReorderSaving(true)
    try {
      await fetch('/api/books/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map(b => b.id) }),
      })
    } finally {
      setReorderSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-[13px] text-stone-400">Loading your books…</div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '0.5px solid rgba(30,45,61,0.08)' }}>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>Your catalog</div>
          <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
            Drag to reorder — position sets B1–B6 color assignment
          </div>
        </div>
        <button
          onClick={openAdd}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer"
          style={{ background: '#E9A020', color: '#1E2D3D' }}
        >
          + Add book
        </button>
      </div>

      {/* Search + sort bar */}
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '0.5px solid rgba(30,45,61,0.06)' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search books..."
          className="flex-1 text-[11px] px-2.5 py-1.5 rounded-md outline-none"
          style={{
            border: '0.5px solid rgba(30,45,61,0.15)',
            background: '#FFF8F0',
            color: '#1E2D3D',
          }}
        />
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as 'position' | 'az')}
          className="text-[11px] px-2 py-1.5 rounded-md outline-none cursor-pointer"
          style={{
            border: '0.5px solid rgba(30,45,61,0.15)',
            background: '#FFF8F0',
            color: '#1E2D3D',
          }}
        >
          <option value="position">Position order</option>
          <option value="az">A → Z</option>
        </select>
        {reorderSaving && (
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Saving…</span>
        )}
      </div>

      {/* Scrollable book list */}
      <div style={{ maxHeight: 340, overflowY: 'auto' }}
        className="[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">
        {displayedBooks.length === 0 ? (
          searchQuery ? (
            <p className="text-[12px] px-4 py-4" style={{ color: '#9CA3AF' }}>
              No books match your search.
            </p>
          ) : (
            <div
              className="mx-4 my-5 flex flex-col items-center justify-center py-8 px-6 rounded-xl text-center"
              style={{ border: '1.5px dashed rgba(30,45,61,0.15)', background: '#FAFAFA' }}
            >
              {/* Stack of books icon */}
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-3">
                <rect x="6" y="26" width="28" height="6" rx="2" fill="#E9A020" opacity="0.3" />
                <rect x="9" y="19" width="22" height="8" rx="2" fill="#E9A020" opacity="0.5" />
                <rect x="12" y="10" width="16" height="10" rx="2" fill="#E9A020" opacity="0.85" />
                <rect x="15" y="13" width="2" height="4" rx="1" fill="white" opacity="0.7" />
              </svg>
              <div className="text-[13px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
                No books added yet.
              </div>
              <div className="text-[11px] leading-relaxed mb-4" style={{ color: '#9CA3AF', maxWidth: 240 }}>
                Add your first book to unlock color coding, per-title tracking, and performance insights.
              </div>
              <button
                onClick={openAdd}
                className="text-[11px] font-semibold px-4 py-2 rounded-lg border-none cursor-pointer"
                style={{ background: '#E9A020', color: '#1E2D3D' }}
              >
                + Add your first book
              </button>
            </div>
          )
        ) : isDndActive ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayedBooks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {displayedBooks.map((book, i) => {
                const posIdx = books.findIndex(b => b.id === book.id)
                return (
                  <SortableBookCard
                    key={book.id}
                    book={book}
                    index={posIdx >= 0 ? posIdx : i}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleExclude={handleToggleExclude}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        ) : (
          <div>
            {displayedBooks.map((book, i) => {
              const posIdx = books.findIndex(b => b.id === book.id)
              return (
                <div key={book.id}
                  className="flex items-center gap-3 px-4 py-3 group/card"
                  style={{ borderBottom: i < displayedBooks.length - 1 ? '0.5px solid rgba(30,45,61,0.06)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFFBF5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <CoverThumb coverUrl={book.coverUrl} asin={book.asin} title={book.title} colorIndex={posIdx >= 0 ? posIdx : i} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: '#1E2D3D' }}>{book.title}</div>
                    {book.asin && <div className="text-[10px] font-mono" style={{ color: '#9CA3AF' }}>{book.asin}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-2 h-2 rounded-full" style={{ background: colorForIndex(posIdx >= 0 ? posIdx : i) }} />
                    <span className="text-[10px] font-bold" style={{ color: colorForIndex(posIdx >= 0 ? posIdx : i) }}>
                      {COLOR_NAMES[posIdx >= 0 ? posIdx % COLOR_NAMES.length : i % COLOR_NAMES.length]}
                    </span>
                  </div>
                  <button
                    title={book.excludeFromDashboard ? 'Show in dashboard' : 'Exclude from dashboard'}
                    onClick={() => handleToggleExclude(book.id, !book.excludeFromDashboard)}
                    className="text-[11px] border-none bg-transparent cursor-pointer px-2 py-1 rounded"
                    style={{ color: book.excludeFromDashboard ? '#E9A020' : '#D1D5DB' }}
                  >{book.excludeFromDashboard ? '👁' : '🚫'}</button>
                  <button onClick={() => openEdit(book)}
                    className="text-[11px] font-semibold border-none bg-transparent cursor-pointer px-2 py-1 rounded"
                    style={{ color: '#6B7280' }}>Edit</button>
                  <button onClick={() => handleDelete(book.id)}
                    className="text-[11px] border-none bg-transparent cursor-pointer px-2 py-1 rounded"
                    style={{ color: '#D1D5DB' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F97B6B')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                  >Delete</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ borderTop: '0.5px solid rgba(30,45,61,0.06)' }}>
        <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
          {books.length} {books.length === 1 ? 'book' : 'books'} in catalog
        </span>
        <button
          onClick={openAdd}
          className="text-[11px] font-semibold px-3 py-1 rounded-lg cursor-pointer"
          style={{
            border: '1px dashed #E9A020',
            color: '#E9A020',
            background: 'transparent',
          }}
        >
          + Add a book
        </button>
      </div>

      {/* Modal */}
      {modalOpen && (
        <BookModal
          editing={editingBook}
          onClose={closeModal}
          onSave={handleSave}
          isSaving={isSaving}
          colorIndex={editingIndex}
        />
      )}
    </div>
  )
}
