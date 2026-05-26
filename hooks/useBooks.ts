'use client'
import { useRef, useState, useEffect } from 'react'

export interface BookRecord {
  id: string
  title: string
  asin: string | null
  position: number
  color: string
  coverUrl: string | null
}

export type RawBook = {
  id: string
  title: string
  asin?: string | null
  sortOrder?: number | null
  coverUrl?: string | null
}

const BOOK_COLORS = [
  '#F97B6B', // B1 coral
  '#F4A261', // B2 peach
  '#8B5CF6', // B3 plum
  '#5BBFB5', // B4 teal
  '#60A5FA', // B5 sky
  '#F472B6', // B6 rose
]

function mapRaw(raw: RawBook[]): BookRecord[] {
  return raw.map((b, i) => ({
    id: b.id,
    title: b.title,
    asin: b.asin ?? null,
    coverUrl: b.coverUrl ?? null,
    position: (b.sortOrder ?? i) + 1,
    color: BOOK_COLORS[b.sortOrder ?? i] ?? '#E9A020',
  }))
}

export function useBooks(initialData?: RawBook[]) {
  const skipFetch = useRef(initialData !== undefined)

  const [books, setBooks] = useState<BookRecord[]>(() =>
    initialData ? mapRaw(initialData) : []
  )
  const [loading, setLoading] = useState(!skipFetch.current)

  useEffect(() => {
    if (skipFetch.current) return
    fetch('/api/books')
      .then(r => r.json())
      .then(d => {
        const raw: RawBook[] = d.books ?? d.data ?? []
        setBooks(mapRaw(raw))
      })
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  return { books, loading }
}
