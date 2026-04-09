'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface WorkbookRecord {
  phase: string
  section: string
  chapterIndex: number | null
  content: string
}

export function useWorkbook(bookId: string | null) {
  const [records, setRecords] = useState<Map<string, string>>(new Map())
  const [saveStates, setSaveStates] = useState<Map<string, 'idle' | 'saving' | 'saved'>>(new Map())
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const loaded = useRef(false)

  const makeKey = (phase: string, section: string, chapterIndex?: number | null) =>
    `${phase}:${section}:${chapterIndex ?? 'null'}`

  // Load records on mount / book change
  useEffect(() => {
    loaded.current = false
    const params = new URLSearchParams()
    if (bookId) params.set('bookId', bookId)
    fetch(`/api/writing-notebook?${params}`)
      .then(r => r.json())
      .then(data => {
        const map = new Map<string, string>()
        for (const r of (data.records || []) as WorkbookRecord[]) {
          map.set(makeKey(r.phase, r.section, r.chapterIndex), r.content)
        }
        setRecords(map)
        loaded.current = true
      })
      .catch(() => { loaded.current = true })
  }, [bookId])

  const getValue = useCallback((phase: string, section: string, chapterIndex?: number | null) => {
    return records.get(makeKey(phase, section, chapterIndex)) || ''
  }, [records])

  const setValue = useCallback((phase: string, section: string, chapterIndex: number | null, value: string) => {
    const key = makeKey(phase, section, chapterIndex)

    setRecords(prev => {
      const next = new Map(prev)
      next.set(key, value)
      return next
    })

    // Debounced save
    const existing = timeoutRefs.current.get(key)
    if (existing) clearTimeout(existing)

    setSaveStates(prev => {
      const next = new Map(prev)
      next.set(key, 'saving')
      return next
    })

    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/writing-notebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, phase, section, chapterIndex, content: value }),
        })
        setSaveStates(prev => {
          const next = new Map(prev)
          next.set(key, 'saved')
          return next
        })
        setTimeout(() => {
          setSaveStates(prev => {
            const next = new Map(prev)
            next.set(key, 'idle')
            return next
          })
        }, 2000)
      } catch {
        setSaveStates(prev => {
          const next = new Map(prev)
          next.set(key, 'idle')
          return next
        })
      }
    }, 1000)

    timeoutRefs.current.set(key, timeout)
  }, [bookId])

  const getSaveState = useCallback((phase: string, section: string, chapterIndex?: number | null) => {
    return saveStates.get(makeKey(phase, section, chapterIndex)) || 'idle'
  }, [saveStates])

  return { getValue, setValue, getSaveState, loaded: loaded.current }
}
