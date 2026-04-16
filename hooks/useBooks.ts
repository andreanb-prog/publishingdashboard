'use client'
import { useState, useEffect } from 'react'

export interface BookRecord {
  id: string
  title: string
  asin: string | null
  position: number
  color: string
  coverUrl: string | null
}

const BOOK_COLORS = [
  '#F97B6B', // B1 coral
  '#F4A261', // B2 peach
  '#8B5CF6', // B3 plum
  '#5BBFB5', // B4 teal
  '#60A5FA', // B5 sky
  '#F472B6', // B6 rose
]

export function useBooks() {
  const [books, setBooks] = useState<BookRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(d => {
        const raw: Array<{ id: string; title: string; asin: string | null; sortOrder: number; coverUrl: string | null }> =
          d.books ?? d.data ?? []
        const mapped: BookRecord[] = raw.map((b, i) => ({
          id: b.id,
          title: b.title,
          asin: b.asin ?? null,
          coverUrl: b.coverUrl ?? null,
          position: (b.sortOrder ?? i) + 1,
          color: BOOK_COLORS[b.sortOrder ?? i] ?? '#E9A020',
        }))
        setBooks(mapped)
      })
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  return { books, loading }
}
