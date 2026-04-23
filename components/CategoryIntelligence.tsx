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
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E1D3',
      marginBottom: 20,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: '#6B7280',
        padding: '12px 16px 8px',
      }}>
        Category Rankings
      </div>
      {entries.map((e, i) => (
        <div
          key={e.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: i === 0 ? '1px solid #E8E1D3' : '1px solid #EEEBE6',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: '#1E2D3D',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            marginRight: 12,
          }}>
            {e.category}
          </span>
          {e.rank != null && (
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 16,
              fontWeight: 600,
              color: '#D97706',
              flexShrink: 0,
              tabularNums: true,
            } as React.CSSProperties}>
              #{e.rank.toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
