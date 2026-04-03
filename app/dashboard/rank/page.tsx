'use client'
// app/dashboard/rank/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BookSetting {
  id: string
  title: string
  asin: string
  categories: string[]
  series?: string
  bookNumber?: string
}

interface RankLogEntry {
  id: string
  book: string
  rank: number
  category: string | null
  date: string
}

function getRankColor(rank: number) {
  if (rank < 50000) return '#34d399'
  if (rank < 200000) return '#fbbf24'
  return '#fb7185'
}

function getRankLabel(rank: number) {
  if (rank < 50000) return '🟢 Strong momentum'
  if (rank < 200000) return '🟡 Steady — keep promoting'
  return '🔴 Run a promo'
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null
  // Invert: lower rank = higher on chart (better)
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  return (
    <div className="flex items-end gap-px" style={{ height: 32 }}>
      {points.map((v, i) => {
        const pct = ((max - v) / range) * 100
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm min-w-[3px] opacity-70 hover:opacity-100 transition-opacity"
            style={{ height: `${Math.max(pct, 5)}%`, background: color }}
            title={`#${v.toLocaleString()}`}
          />
        )
      })}
    </div>
  )
}

export default function RankPage() {
  const [books, setBooks] = useState<BookSetting[]>([])
  const [logs, setLogs] = useState<Record<string, RankLogEntry[]>>({})
  // inputs keyed by `${bookKey}::${category|'overall'}`
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.books)) { setLoading(false); return }
        const settingsBooks: BookSetting[] = d.books.map((b: any) => ({
          ...b,
          categories: Array.isArray(b.categories) ? b.categories : b.category ? [b.category] : [],
        }))
        setBooks(settingsBooks)

        // Load logs for each book
        settingsBooks.forEach(async book => {
          const key = book.asin || book.id
          const res = await fetch(`/api/rank?book=${key}`)
          const data = await res.json()
          if (data.logs) {
            setLogs(prev => ({ ...prev, [key]: data.logs }))
          }
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function inputKey(bookKey: string, category: string | null) {
    return `${bookKey}::${category ?? 'overall'}`
  }

  async function logRank(book: BookSetting, category: string | null) {
    const key = book.asin || book.id
    const iKey = inputKey(key, category)
    const rankVal = parseInt(inputs[iKey] || '')
    if (!rankVal || rankVal < 1) return

    setSaving(s => ({ ...s, [iKey]: true }))
    try {
      const res = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: key, asin: book.asin || '', rank: rankVal, category }),
      })
      const json = await res.json()
      if (json.success) {
        setLogs(prev => ({ ...prev, [key]: [json.log, ...(prev[key] || [])] }))
        setInputs(i => ({ ...i, [iKey]: '' }))
        const label = category ?? 'Overall BSR'
        const prevLog = (logs[key] || []).find(l => (l.category ?? null) === category)
        const prevRank = prevLog?.rank ?? rankVal
        const diff = prevRank - rankVal
        const msg = diff > 0
          ? `↑ Up ${diff.toLocaleString()} spots — ${label}`
          : diff < 0
          ? `↓ Down ${Math.abs(diff).toLocaleString()} spots — ${label}`
          : `Rank unchanged at #${rankVal.toLocaleString()} — ${label}`
        setFeedback(f => ({ ...f, [key]: msg }))
        setTimeout(() => setFeedback(f => ({ ...f, [key]: '' })), 4000)
      }
    } finally {
      setSaving(s => ({ ...s, [iKey]: false }))
    }
  }

  async function logAll(book: BookSetting) {
    const key = book.asin || book.id
    const rows: Array<string | null> = [null, ...book.categories]
    for (const cat of rows) {
      const iKey = inputKey(key, cat)
      if (inputs[iKey]) await logRank(book, cat)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 pb-8 max-w-[1200px]">
        <div className="animate-pulse text-stone-500 text-[13px]">Loading your books…</div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="p-4 sm:p-8 pb-8 max-w-[1200px]">
        <div className="mb-6">
          <h1 className="font-sans text-[22px] text-[#0d1f35] mb-1">Sales Rank Tracker</h1>
          <p className="text-[12.5px] text-stone-500">Track your Amazon BSR and subcategory ranks daily.</p>
        </div>
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-[15px] font-bold text-[#0d1f35] mb-2">No books set up yet</div>
          <p className="text-[13px] text-stone-500 mb-5">
            Add your books in Settings first, then come back to log ranks.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-bold"
            style={{ background: '#e9a020', color: '#0d1f35' }}
          >
            Go to Settings →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 pb-8 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="font-sans text-[22px] text-[#0d1f35] mb-1">Sales Rank Tracker</h1>
        <p className="text-[12.5px] text-stone-500">
          Log your rank every morning — takes 10 seconds. Over time you'll see exactly which days move the needle.
        </p>
      </div>

      <div className="space-y-5 mb-6">
        {books.map(book => {
          const key = book.asin || book.id
          const bookLogs = logs[key] || []
          const overallLogs = bookLogs.filter(l => l.category === null)
          const latestOverall = overallLogs[0]?.rank ?? null
          const hasBestseller = bookLogs.some(l => l.rank < 100)

          // All rows: overall + per category
          const rows: Array<{ label: string; category: string | null }> = [
            { label: 'Overall BSR', category: null },
            ...book.categories.map(c => ({ label: c, category: c })),
          ]

          const hasAnyInput = rows.some(r => !!inputs[inputKey(key, r.category)])

          return (
            <div key={key} className="card p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <div className="text-[14px] font-bold text-[#0d1f35]">{book.title || 'Untitled'}</div>
                    {hasBestseller && (
                      <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(233,160,32,0.15)', color: '#92400e' }}>
                        🏆 Bestseller!
                      </span>
                    )}
                  </div>
                  {book.asin && (
                    <div className="text-[10.5px] text-stone-500 font-mono">{book.asin}</div>
                  )}
                </div>
                {latestOverall !== null && (
                  <div className="text-right">
                    <div className="font-sans text-[30px] leading-none tracking-tight"
                      style={{ color: getRankColor(latestOverall) }}>
                      #{latestOverall.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: getRankColor(latestOverall) }}>
                      {getRankLabel(latestOverall)}
                    </div>
                  </div>
                )}
              </div>

              {/* No categories hint */}
              {book.categories.length === 0 && (
                <div className="mb-4 text-[12px] text-stone-500 flex items-center gap-1.5">
                  <span>💡 No subcategories set.</span>
                  <Link href="/dashboard/settings" className="text-amber-600 font-semibold hover:underline">
                    Add categories in Settings →
                  </Link>
                </div>
              )}

              {/* Input rows */}
              <div className="space-y-2.5 mb-4">
                {rows.map(({ label, category }) => {
                  const iKey = inputKey(key, category)
                  const catLogs = bookLogs.filter(l => (l.category ?? null) === category)
                  const latest = catLogs[0]?.rank
                  const isSaving = saving[iKey]

                  return (
                    <div key={iKey} className="flex items-center gap-3">
                      <div className="w-44 flex-shrink-0">
                        <div className="text-[11.5px] font-semibold text-stone-600 truncate">{label}</div>
                        {latest !== undefined && (
                          <div className="text-[10.5px] font-mono" style={{ color: getRankColor(latest) }}>
                            Last: #{latest.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 45000"
                        value={inputs[iKey] || ''}
                        onChange={e => setInputs(i => ({ ...i, [iKey]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && logRank(book, category)}
                        className="input-field flex-1"
                        style={{ maxWidth: 160 }}
                      />
                      <button
                        onClick={() => logRank(book, category)}
                        disabled={isSaving || !inputs[iKey]}
                        className="px-3.5 py-2 rounded-lg text-[12.5px] font-bold transition-all disabled:opacity-40"
                        style={{ background: '#e9a020', color: '#0d1f35', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {isSaving ? '…' : 'Log It'}
                      </button>

                      {/* Mini sparkline inline */}
                      {catLogs.length >= 2 && (
                        <div className="w-20 flex-shrink-0">
                          <Sparkline
                            points={[...catLogs].reverse().slice(-14).map(l => l.rank)}
                            color={getRankColor(catLogs[0].rank)}
                          />
                        </div>
                      )}

                      {/* Bestseller badge per row */}
                      {latest !== undefined && latest < 100 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(233,160,32,0.15)', color: '#92400e' }}>
                          🏆 #1 Bestseller!
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Log All + feedback */}
              <div className="flex items-center gap-3 border-t border-stone-100 pt-4">
                {hasAnyInput && (
                  <button
                    onClick={() => logAll(book)}
                    className="px-5 py-2 rounded-lg text-[12.5px] font-bold transition-all"
                    style={{ background: 'rgba(233,160,32,0.15)', color: '#92400e', border: 'none', cursor: 'pointer' }}
                  >
                    Log All →
                  </button>
                )}
                {feedback[key] && (
                  <div className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: '#eaf7f1', color: '#0f6b46' }}>
                    {feedback[key]}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* How to read your rank */}
      <div className="card p-5">
        <div className="text-[13px] font-bold text-[#0d1f35] mb-3">How to read your rank</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: '🟢 Top 50,000', bg: '#eaf7f1', text: '#0f6b46', body: 'Strong sales momentum. Your promos are working. Keep the swap calendar full.' },
            { label: '🟡 50K – 200K', bg: '#fdf5e3', text: '#7a4f00', body: 'Steady sales. Good for a newer title. Schedule a promo week to push higher.' },
            { label: '🔴 200K+', bg: '#fdf0f0', text: '#8c2020', body: 'Slow sales right now. Run a newsletter swap or paid promo to boost visibility.' },
          ].map(b => (
            <div key={b.label} className="rounded-lg p-3" style={{ background: b.bg }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: b.text }}>{b.label}</div>
              <div className="text-[11.5px]" style={{ color: b.text }}>{b.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
