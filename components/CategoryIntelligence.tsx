'use client'
// components/CategoryIntelligence.tsx
import { useEffect, useState } from 'react'

interface CategoryEntry {
  id: string
  asin: string
  category: string
  rank: number | null
  fetchedAt: string
}

export default function CategoryIntelligence({ bookAsin }: { bookAsin?: string }) {
  const [entries, setEntries] = useState<CategoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = bookAsin
      ? `/api/kdp/category-cache?asin=${encodeURIComponent(bookAsin)}`
      : '/api/kdp/category-cache'
    fetch(url)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.data)) setEntries(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bookAsin])

  if (loading || entries.length === 0) return null

  return (
    <div className="rounded-xl p-5 mb-5" style={{ background: '#1c1917', border: '1px solid #292524' }}>
      <h3 className="text-[13.5px] font-semibold mb-3" style={{ color: '#d6d3d1' }}>
        Category Intelligence
      </h3>
      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="flex items-center justify-between text-[12px]" style={{ color: '#a8a29e' }}>
            <span className="truncate flex-1 mr-3" style={{ color: '#d6d3d1' }}>{e.category}</span>
            {e.rank != null && (
              <span className="font-semibold tabular-nums" style={{ color: '#e9a020' }}>
                #{e.rank.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
