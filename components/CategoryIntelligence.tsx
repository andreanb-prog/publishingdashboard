'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState, useMemo } from 'react'
import { BookOpen, BookMarked, Book, Headphones, Globe, RefreshCw, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

interface BookEntry {
  asin: string
  title: string
  shortTitle: string
  units: number
  kenp: number
  royalties: number
  format?: string
}

interface Props {
  books?: BookEntry[]
  bookColorMap?: Record<string, number>
  myBooksList?: any[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOOK_COLORS = ['#F97B6B', '#F4A261', '#8B5CF6', '#5BBFB5', '#60A5FA', '#F472B6']

const FORMAT_CONFIG: Record<FormatKey, { icon: LucideIcon; label: string; hasPages: boolean }> = {
  ebook:       { icon: BookOpen,   label: 'Ebook',       hasPages: true  },
  ku:          { icon: RefreshCw,  label: 'KU Reads',    hasPages: true  },
  paperback:   { icon: BookMarked, label: 'Paperback',   hasPages: false },
  hardcover:   { icon: Book,       label: 'Hardcover',   hasPages: false },
  audiobook:   { icon: Headphones, label: 'Audiobook',   hasPages: false },
  translation: { icon: Globe,      label: 'Translation', hasPages: false },
}

type FormatKey = 'ebook' | 'ku' | 'paperback' | 'hardcover' | 'audiobook' | 'translation'

const FORMAT_ORDER: FormatKey[] = ['ebook', 'ku', 'paperback', 'hardcover', 'audiobook', 'translation']

const SORT_OPTIONS = ['Units Sold', 'Page Reads', 'Royalties', 'Title A-Z'] as const
type SortOption = typeof SORT_OPTIONS[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortTitle(title: string): string {
  return title.length > 35 ? title.substring(0, 35) + '…' : title
}

function fmtPages(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return n.toString()
}

function getFormatRows(b: BookEntry): { format: FormatKey; units: number; pages: number }[] {
  const rows: { format: FormatKey; units: number; pages: number }[] = []
  if (b.format === 'paperback') {
    if ((b.units ?? 0) > 0) rows.push({ format: 'paperback', units: b.units, pages: 0 })
  } else if (b.format === 'hardcover') {
    if ((b.units ?? 0) > 0) rows.push({ format: 'hardcover', units: b.units, pages: 0 })
  } else if (b.format === 'audiobook') {
    if ((b.units ?? 0) > 0) rows.push({ format: 'audiobook', units: b.units, pages: 0 })
  } else if (b.format === 'translation') {
    if ((b.units ?? 0) > 0) rows.push({ format: 'translation', units: b.units, pages: 0 })
  } else {
    if ((b.units ?? 0) > 0) rows.push({ format: 'ebook', units: b.units, pages: 0 })
    if ((b.kenp ?? 0) > 0)  rows.push({ format: 'ku', units: 0, pages: b.kenp })
  }
  return rows
}

interface BookCardData {
  asin: string
  title: string
  displayShortTitle: string
  colorIndex: number
  color: string
  formatRows: { format: FormatKey; units: number; pages: number }[]
  totalUnits: number
  totalPages: number
  totalRoyalties: number
  topCategory: string | null
  topRank: number | null
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CategoryIntelligence({
  books = [],
  bookColorMap = {},
  myBooksList = [],
}: Props) {
  const [categoryEntries, setCategoryEntries] = useState<CategoryEntry[]>([])
  const [selectedBooks, setSelectedBooks]     = useState<Set<string>>(new Set())
  const [activeFormats, setActiveFormats]     = useState<Set<FormatKey>>(
    new Set(FORMAT_ORDER)
  )
  const [sortBy, setSortBy] = useState<SortOption>('Units Sold')

  useEffect(() => {
    fetch('/api/kdp/category-cache')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.data)) setCategoryEntries(d.data) })
      .catch(() => {})
  }, [])

  // ── Group books into cards ─────────────────────────────────────────────────
  const rawCards = useMemo((): BookCardData[] => {
    if (books.length === 0) return []

    const cards: BookCardData[] = []

    if (myBooksList.length > 0) {
      myBooksList
        .filter((mb: any) => mb.asin)
        .forEach((mb: any, i: number) => {
          const mbAsinUpper   = (mb.asin as string).trim().toUpperCase()
          const mbTitleLower  = (mb.title as string || '').toLowerCase().trim()

          const matches = books.filter(b => {
            const bAsinUpper  = (b.asin || '').trim().toUpperCase()
            if (bAsinUpper === mbAsinUpper) return true
            // Paperback ISBNs won't match by ASIN — fall back to title
            const bTitleLower = (b.title || '').toLowerCase().trim()
            return mbTitleLower.length > 0 && bTitleLower === mbTitleLower
          })

          if (matches.length === 0) return

          // Merge format rows across all matching entries
          const rowMap = new Map<FormatKey, { units: number; pages: number }>()
          matches.forEach(m => {
            getFormatRows(m).forEach(r => {
              const prev = rowMap.get(r.format) ?? { units: 0, pages: 0 }
              rowMap.set(r.format, { units: prev.units + r.units, pages: prev.pages + r.pages })
            })
          })
          const mergedRows = FORMAT_ORDER
            .filter(f => rowMap.has(f))
            .map(f => ({ format: f, ...rowMap.get(f)! }))

          const colorIdx = bookColorMap[mbAsinUpper] ?? i

          cards.push({
            asin:             mb.asin,
            title:            (mb.title as string) || matches[0].title,
            displayShortTitle: matches[0].shortTitle || shortTitle((mb.title as string) || matches[0].title),
            colorIndex:       colorIdx,
            color:            BOOK_COLORS[colorIdx] || '#6B7280',
            formatRows:       mergedRows,
            totalUnits:       mergedRows.reduce((s, r) => s + r.units, 0),
            totalPages:       mergedRows.reduce((s, r) => s + r.pages, 0),
            totalRoyalties:   matches.reduce((s, m) => s + m.royalties, 0),
            topCategory:      null,
            topRank:          null,
          })
        })
    } else {
      // No catalog — each book entry becomes its own card
      books.forEach((b, i) => {
        const colorIdx  = bookColorMap[(b.asin || '').trim().toUpperCase()] ?? i
        const fmtRows   = getFormatRows(b)
        cards.push({
          asin:             b.asin,
          title:            b.title,
          displayShortTitle: b.shortTitle,
          colorIndex:       colorIdx,
          color:            BOOK_COLORS[colorIdx] || '#6B7280',
          formatRows:       fmtRows,
          totalUnits:       fmtRows.reduce((s, r) => s + r.units, 0),
          totalPages:       fmtRows.reduce((s, r) => s + r.pages, 0),
          totalRoyalties:   b.royalties,
          topCategory:      null,
          topRank:          null,
        })
      })
    }

    return cards
  }, [books, myBooksList, bookColorMap])

  // ── Attach category data ───────────────────────────────────────────────────
  const bookCards = useMemo((): BookCardData[] => {
    return rawCards.map(card => {
      const matches = categoryEntries.filter(
        e => e.asin.trim().toUpperCase() === card.asin.trim().toUpperCase()
      )
      if (matches.length === 0) return card
      const best = matches.reduce<CategoryEntry | null>((min, e) => {
        if (e.rank == null) return min
        if (!min || min.rank == null) return e
        return e.rank < min.rank ? e : min
      }, null)
      return { ...card, topCategory: best?.category ?? null, topRank: best?.rank ?? null }
    })
  }, [rawCards, categoryEntries])

  // ── Derived state ──────────────────────────────────────────────────────────
  const availableFormats = useMemo((): FormatKey[] => {
    const keys = new Set<FormatKey>()
    bookCards.forEach(c => c.formatRows.forEach(r => keys.add(r.format)))
    return FORMAT_ORDER.filter(f => keys.has(f))
  }, [bookCards])

  const maxUnits = useMemo(
    () => Math.max(...bookCards.map(c => c.totalUnits), 1),
    [bookCards]
  )
  const maxPages = useMemo(
    () => Math.max(...bookCards.map(c => c.totalPages), 1),
    [bookCards]
  )

  const visibleCards = useMemo((): BookCardData[] => {
    let cards = bookCards

    if (selectedBooks.size > 0) {
      cards = cards.filter(c => selectedBooks.has(c.asin))
    }

    cards = cards.filter(c =>
      c.formatRows.some(r => activeFormats.has(r.format))
    )

    const sorted = [...cards]
    if (sortBy === 'Units Sold')  sorted.sort((a, b) => b.totalUnits - a.totalUnits)
    if (sortBy === 'Page Reads')  sorted.sort((a, b) => b.totalPages - a.totalPages)
    if (sortBy === 'Royalties')   sorted.sort((a, b) => b.totalRoyalties - a.totalRoyalties)
    if (sortBy === 'Title A-Z')   sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [bookCards, selectedBooks, activeFormats, sortBy])

  if (books.length === 0) return null

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleBook = (asin: string) => {
    setSelectedBooks(prev => {
      const next = new Set(prev)
      if (next.has(asin)) next.delete(asin); else next.add(asin)
      return next
    })
  }

  const toggleFormat = (fmt: FormatKey) => {
    setActiveFormats(prev => {
      const next = new Set(prev)
      if (next.has(fmt)) {
        if (next.size === 1) return prev // keep at least one active
        next.delete(fmt)
      } else {
        next.add(fmt)
      }
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 20px 20px' }}>

      {/* Insight card */}
      <div style={{
        background: '#FFF8F0',
        borderLeft: '3px solid #E9A020',
        borderRadius: 4,
        padding: '12px 16px',
        marginBottom: 20,
      }}>
        <p style={{
          fontStyle: 'italic',
          fontSize: 13,
          color: '#1E2D3D',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Your category placement is your opening hook — the right category puts your book in front of readers who are already looking for exactly what you write. Track your best ranks and double down on them.
        </p>
      </div>

      {/* Filter bar — Row 1: Books */}
      {bookCards.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(30,45,61,0.4)' }}>
            Books
          </span>
          <button
            onClick={() => setSelectedBooks(new Set())}
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: selectedBooks.size === 0 ? '#E9A020' : '#FFF8F0',
              color:      selectedBooks.size === 0 ? '#fff'    : '#1E2D3D',
              outline:    selectedBooks.size === 0 ? 'none'    : '0.5px solid rgba(30,45,61,0.12)',
            }}
          >
            All Books
          </button>
          {bookCards.map(card => {
            const isSelected = selectedBooks.has(card.asin)
            return (
              <button
                key={card.asin}
                onClick={() => toggleBook(card.asin)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  background: isSelected ? card.color : '#FFF8F0',
                  color:      isSelected ? '#fff'     : '#1E2D3D',
                  outline:    isSelected ? 'none'     : '0.5px solid rgba(30,45,61,0.12)',
                }}
              >
                <span style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(255,255,255,0.8)' : card.color,
                  flexShrink: 0,
                }} />
                {card.displayShortTitle}
              </button>
            )
          })}
        </div>
      )}

      {/* Filter bar — Row 2: Formats */}
      {availableFormats.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(30,45,61,0.4)' }}>
            Format
          </span>
          <div style={{
            display: 'inline-flex',
            background: '#F5F0EB',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            {availableFormats.map(fmt => {
              const { icon: Icon, label } = FORMAT_CONFIG[fmt]
              const isActive = activeFormats.has(fmt)
              return (
                <button
                  key={fmt}
                  onClick={() => toggleFormat(fmt)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    background: isActive ? '#fff'              : 'transparent',
                    color:      isActive ? '#1E2D3D'           : 'rgba(30,45,61,0.35)',
                    boxShadow:  isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={11} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Sort control */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(30,45,61,0.5)', fontWeight: 500 }}>Sort by</span>
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              style={{
                appearance: 'none',
                background: '#fff',
                border: '0.5px solid rgba(30,45,61,0.15)',
                borderRadius: 6,
                padding: '4px 28px 4px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: '#1E2D3D',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown
              size={11}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#1E2D3D' }}
            />
          </div>
        </label>
      </div>

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
      }}>
        {visibleCards.map(card => (
          <BookCard
            key={card.asin}
            card={card}
            activeFormats={activeFormats}
            maxUnits={maxUnits}
            maxPages={maxPages}
          />
        ))}
      </div>

      {visibleCards.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(30,45,61,0.4)', fontSize: 13 }}>
          No books match the current filters.
        </div>
      )}
    </div>
  )
}

// ─── Book card ────────────────────────────────────────────────────────────────
function BookCard({
  card,
  activeFormats,
  maxUnits,
  maxPages,
}: {
  card: BookCardData
  activeFormats: Set<FormatKey>
  maxUnits: number
  maxPages: number
}) {
  const visibleRows = card.formatRows.filter(r => activeFormats.has(r.format))
  if (visibleRows.length === 0) return null

  const showRankBadge = card.topRank != null && card.topRank <= 3

  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(30,45,61,0.10)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px 12px' }}>
        <span style={{
          width: 10, height: 10,
          borderRadius: '50%',
          background: card.color,
          flexShrink: 0,
          marginTop: 3,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: '#1E2D3D',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {card.title}
          </p>
        </div>
        {showRankBadge && (
          <span style={{
            flexShrink: 0,
            background: '#E9A020',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}>
            #{card.topRank} in {truncateCat(card.topCategory!)}
          </span>
        )}
      </div>

      {/* Format rows */}
      <div style={{ padding: '0 16px' }}>
        {visibleRows.map((row, idx) => {
          const { icon: Icon, label } = FORMAT_CONFIG[row.format]
          const isKu   = row.format === 'ku'
          const barPct = isKu
            ? (maxPages > 0 ? (row.pages / maxPages) * 100 : 0)
            : (maxUnits > 0 ? (row.units / maxUnits) * 100 : 0)

          return (
            <div key={row.format} style={{ marginBottom: idx < visibleRows.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {/* Format badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  minWidth: 88,
                  padding: '3px 8px',
                  background: '#FFF8F0',
                  border: '0.5px solid rgba(30,45,61,0.12)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#1E2D3D',
                  flexShrink: 0,
                }}>
                  <Icon size={11} style={{ flexShrink: 0 }} />
                  {label}
                </span>

                {/* Units metric */}
                <div style={{ minWidth: 50 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E2D3D', lineHeight: 1.2 }}>
                    {isKu ? '—' : row.units.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(30,45,61,0.45)', lineHeight: 1 }}>Units</div>
                </div>

                {/* Pages metric */}
                <div style={{ minWidth: 44 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E2D3D', lineHeight: 1.2 }}>
                    {isKu && row.pages > 0 ? fmtPages(row.pages) : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(30,45,61,0.45)', lineHeight: 1 }}>Pages</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 5, background: '#FFF8F0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(barPct, 100)}%`,
                  background: card.color,
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 0.5, background: 'rgba(30,45,61,0.06)', margin: '14px 0 0' }} />

      {/* Card footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 12px',
        gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(30,45,61,0.4)', marginBottom: 2 }}>Total royalties</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1E2D3D' }}>
            ${card.totalRoyalties.toFixed(2)}
          </div>
        </div>
        {card.topCategory && (
          <span style={{
            background: '#FFF8F0',
            border: '0.5px solid rgba(30,45,61,0.12)',
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 500,
            color: '#1E2D3D',
            padding: '3px 8px',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {card.topCategory}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncateCat(cat: string): string {
  const parts = cat.split(' > ')
  const last = parts[parts.length - 1].trim()
  return last.length > 22 ? last.substring(0, 22) + '…' : last
}
