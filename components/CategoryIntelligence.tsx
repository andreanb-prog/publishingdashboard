'use client'
// components/CategoryIntelligence.tsx
import { useState, useEffect } from 'react'
import { Search, AlertCircle, Sparkles, Loader2, ExternalLink } from 'lucide-react'

type RankStrength = 'top100' | 'strong' | 'competitive' | 'low'

interface Category {
  rank: number
  path: string[]
  rawPath: string
  bestSellersUrl: string
  newReleasesUrl: string
  rankStrength: RankStrength
}

interface CategoryData {
  categories: Category[]
  bestRank: number | null
  bestCategory: string | null
  asin: string
  fetchedAt: string
}

interface Suggestion {
  category: string
  reason: string
  competition: 'low' | 'medium' | 'high'
}

interface Book {
  id: string
  title: string
  asin?: string | null
  tropes?: string[]
  blurb?: string | null
}

const RANK_STYLES: Record<RankStrength, { bg: string; text: string; label: string }> = {
  top100:      { bg: '#EAF5EE', text: '#27500A', label: 'Top 100' },
  strong:      { bg: '#FFF3DC', text: '#633806', label: 'Strong' },
  competitive: { bg: '#F5F5F4', text: '#6B7280', label: 'Competitive' },
  low:         { bg: '#FAECE7', text: '#712B13', label: 'Low visibility' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function CategoryIntelligence({ books }: { books: Book[] }) {
  const booksWithAsin = books.filter(b => b.asin)
  const [selectedBookId, setSelectedBookId] = useState(booksWithAsin[0]?.id ?? '')
  const [asinInput, setAsinInput] = useState(booksWithAsin[0]?.asin ?? '')
  const [data, setData] = useState<CategoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  // AI suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [sugLoading, setSugLoading] = useState(false)
  const [sugError, setSugError] = useState<string | null>(null)

  // Sync ASIN input when book selection changes
  useEffect(() => {
    const book = booksWithAsin.find(b => b.id === selectedBookId)
    if (book?.asin) setAsinInput(book.asin)
  }, [selectedBookId]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBook = booksWithAsin.find(b => b.id === selectedBookId)

  async function fetchCategories() {
    const asin = asinInput.trim()
    if (!asin) return
    setLoading(true)
    setError(null)
    setData(null)
    setSuggestions([])
    setSugError(null)
    try {
      const res = await fetch(`/api/books/categories?asin=${encodeURIComponent(asin)}`)
      if (res.status === 429) {
        setError('rate_limited')
        return
      }
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'unknown')
        return
      }
      setData(json.data)
      setCached(json.cached ?? false)
    } catch {
      setError('fetch_failed')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSuggestions() {
    if (!data || !selectedBook) return
    setSugLoading(true)
    setSugError(null)
    try {
      const res = await fetch('/api/books/categories/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedBook.title,
          tropes: selectedBook.tropes?.join(', ') ?? '',
          description: selectedBook.blurb ?? '',
          currentCategories: data.categories,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuggestions(json.suggestions)
      } else {
        setSugError('Could not get suggestions. Try again.')
      }
    } catch {
      setSugError('Something went wrong. Try again.')
    } finally {
      setSugLoading(false)
    }
  }

  const competitionColor: Record<string, { bg: string; text: string }> = {
    low:    { bg: '#EAF5EE', text: '#27500A' },
    medium: { bg: '#FFF3DC', text: '#633806' },
    high:   { bg: '#FAECE7', text: '#712B13' },
  }

  return (
    <section id="category-intelligence" className="scroll-mt-20">
      <div className="px-5 py-5">
        {/* Section header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[18px] font-medium" style={{ color: '#1E2D3D' }}>
              Category Intelligence
            </h2>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: '#F5F5F4', color: '#6B7280' }}
            >
              Live Amazon data
            </span>
          </div>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>
            See every Amazon category your book is in and how you rank
          </p>
        </div>

        {/* Input row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={selectedBookId}
            onChange={e => setSelectedBookId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-[13px]"
            style={{
              borderColor: '#EEEBE6',
              color: '#1E2D3D',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              maxWidth: 280,
            }}
          >
            {booksWithAsin.map(b => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.asin})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={asinInput}
            onChange={e => setAsinInput(e.target.value)}
            placeholder="ASIN"
            className="border rounded-lg px-3 py-2 text-[13px] w-[140px]"
            style={{
              borderColor: '#EEEBE6',
              color: '#1E2D3D',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          />

          <button
            onClick={fetchCategories}
            disabled={loading || !asinInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
            style={{
              background: loading ? '#D4A017' : '#E9A020',
              color: 'white',
              opacity: loading || !asinInput.trim() ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Check Categories
          </button>

          {data?.fetchedAt && (
            <span className="text-[12px] ml-auto" style={{ color: '#9CA3AF' }}>
              Last checked: {timeAgo(data.fetchedAt)}
              {cached && ' (cached)'}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 py-10 justify-center" style={{ color: '#6B7280' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: '#E9A020' }} />
            <span className="text-[13px]">Fetching from Amazon...</span>
          </div>
        )}

        {/* Error states */}
        {error === 'rate_limited' && (
          <div className="text-[13px] py-8 text-center" style={{ color: '#F97B6B' }}>
            Amazon is busy. Try again in a few minutes.
          </div>
        )}
        {error === 'fetch_failed' && (
          <div className="text-[13px] py-8 text-center" style={{ color: '#F97B6B' }}>
            Something went wrong. Try again.
          </div>
        )}
        {error && error !== 'rate_limited' && error !== 'fetch_failed' && (
          <div className="text-[13px] py-8 text-center" style={{ color: '#F97B6B' }}>
            {error}
          </div>
        )}

        {/* Not checked yet state */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center py-10 gap-2">
            <Search size={32} style={{ color: '#D1D5DB' }} />
            <span className="text-[13px]" style={{ color: '#9CA3AF' }}>
              Click Check Categories to look up your book
            </span>
          </div>
        )}

        {/* No results */}
        {!loading && !error && data && data.categories.length === 0 && (
          <div className="text-[13px] py-8 text-center" style={{ color: '#6B7280' }}>
            No categories found. Check the ASIN is correct.
          </div>
        )}

        {/* Results */}
        {!loading && data && data.categories.length > 0 && (
          <>
            {/* Summary bar */}
            <div
              className="flex flex-wrap items-center gap-4 rounded-lg p-3 mb-4"
              style={{ background: '#FFF8F0' }}
            >
              <span className="text-[13px] font-medium" style={{ color: '#1E2D3D' }}>
                {data.categories.length} categories found
              </span>
              {data.bestRank && (
                <span className="text-[13px]" style={{ color: '#1E2D3D' }}>
                  Best rank:{' '}
                  <strong>#{data.bestRank.toLocaleString()}</strong>
                  <span
                    className="ml-1.5 text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      background: RANK_STYLES[data.categories[0].rankStrength].bg,
                      color: RANK_STYLES[data.categories[0].rankStrength].text,
                    }}
                  >
                    {RANK_STYLES[data.categories[0].rankStrength].label}
                  </span>
                </span>
              )}
            </div>

            {/* Category cards */}
            {data.categories.map((cat, i) => {
              const style = RANK_STYLES[cat.rankStrength]
              const pathParts = cat.rawPath.split('>').map(p => p.trim()).filter(Boolean)
              const lastPart = pathParts[pathParts.length - 1]
              const leadParts = pathParts.slice(0, -1)

              return (
                <div
                  key={i}
                  className="bg-white rounded-lg p-3 mb-2 transition-all duration-150"
                  style={{ border: '0.5px solid #EEEBE6' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#E9A020')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#EEEBE6')}
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: style.bg, color: style.text }}
                    >
                      #{cat.rank.toLocaleString()}
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                    <span className="text-[13px] ml-1">
                      <span style={{ color: '#9CA3AF' }}>
                        {leadParts.join(' \u203A ')}
                        {leadParts.length > 0 && ' \u203A '}
                      </span>
                      <span className="font-semibold" style={{ color: '#1E2D3D' }}>
                        {lastPart}
                      </span>
                    </span>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center gap-4 mt-1">
                    <a
                      href={cat.bestSellersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] flex items-center gap-0.5 no-underline transition-opacity hover:opacity-70"
                      style={{ color: '#E9A020' }}
                    >
                      Best Sellers <ExternalLink size={10} />
                    </a>
                    <a
                      href={cat.newReleasesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] flex items-center gap-0.5 no-underline transition-opacity hover:opacity-70"
                      style={{ color: '#E9A020' }}
                    >
                      New Releases <ExternalLink size={10} />
                    </a>
                    {cat.rank > 5000 && (
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: '#F97B6B' }}>
                        <AlertCircle size={14} />
                        Consider replacing
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Find Better Categories button */}
            <button
              onClick={fetchSuggestions}
              disabled={sugLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium mt-4 transition-all duration-150"
              style={{
                background: 'white',
                color: '#E9A020',
                border: '1px solid #E9A020',
                cursor: sugLoading ? 'wait' : 'pointer',
                opacity: sugLoading ? 0.7 : 1,
              }}
            >
              {sugLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {sugLoading ? 'Analyzing your book...' : 'Find Better Categories'}
            </button>

            {/* Suggestion error */}
            {sugError && (
              <div className="text-[13px] mt-2" style={{ color: '#F97B6B' }}>
                {sugError}
              </div>
            )}

            {/* Suggestion cards */}
            {suggestions.length > 0 && (
              <div className="mt-4">
                {suggestions.map((sug, i) => {
                  const cc = competitionColor[sug.competition] ?? competitionColor.medium
                  return (
                    <div
                      key={i}
                      className="p-3 mb-2 rounded-r-lg"
                      style={{
                        background: '#FFF8F0',
                        borderLeft: '3px solid #E9A020',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-medium" style={{ color: '#1E2D3D' }}>
                          {sug.category}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ background: cc.bg, color: cc.text }}
                        >
                          {sug.competition}
                        </span>
                      </div>
                      <p className="text-[13px] italic m-0" style={{ color: '#6B7280' }}>
                        {sug.reason}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
