'use client'
import { useState, useCallback, useRef, useEffect } from 'react'

export type Phase = 'setup' | 'writing' | 'edit' | 'polish'

export interface ChapterMeta {
  count: number
  titles: string[]
}

export interface StyleGuide {
  niche?: string
  pov?: string
  tense?: string
  totalWordCount?: string
  chapterWordCount?: string
  tropes?: string
  personalStylePreferences?: string
  killList?: { word: string; scope: 'global' | 'book' }[]
  aiRules?: { antiSlopEnabled: boolean; writingFormulaEnabled: boolean }
}

export interface ChapterDraftMeta {
  draftCount: number
  activeDraft: number
}

export interface WorkbookData {
  [key: string]: string
}

export function useWorkbook(bookId: string | null) {
  const [data, setData] = useState<WorkbookData>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const [loaded, setLoaded] = useState(false)

  // Load all records for this book
  const load = useCallback(async () => {
    if (!bookId) {
      setData({})
      setLoaded(true)
      return
    }
    try {
      const res = await fetch(`/api/writing-notebook?bookId=${bookId}`)
      if (!res.ok) return
      const { data: records } = await res.json()
      const map: WorkbookData = {}
      for (const r of records) {
        const key = r.chapterIndex != null
          ? `${r.phase}:${r.section}:${r.chapterIndex}`
          : `${r.phase}:${r.section}`
        map[key] = r.content
      }
      setData(map)
    } catch { /* noop */ }
    setLoaded(true)
  }, [bookId])

  useEffect(() => { load() }, [load])

  const getValue = useCallback((phase: string, section: string, chapterIndex?: number): string => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    return data[key] ?? ''
  }, [data])

  // Keep bookId in a ref so debounced callbacks always use the current value
  const bookIdRef = useRef(bookId)
  bookIdRef.current = bookId

  const setValue = useCallback((phase: string, section: string, content: string, chapterIndex?: number) => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    setData(prev => ({ ...prev, [key]: content }))

    // Debounced auto-save
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
    setSaving(prev => ({ ...prev, [key]: true }))
    setSaved(prev => ({ ...prev, [key]: false }))

    debounceTimers.current[key] = setTimeout(async () => {
      const currentBookId = bookIdRef.current
      if (!currentBookId) {
        setSaving(prev => ({ ...prev, [key]: false }))
        return
      }
      try {
        await fetch('/api/writing-notebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: currentBookId,
            phase,
            section,
            chapterIndex: chapterIndex ?? null,
            content,
          }),
        })
        setSaved(prev => ({ ...prev, [key]: true }))
        setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000)
      } catch { /* noop */ }
      setSaving(prev => ({ ...prev, [key]: false }))
    }, 1000)
  }, [])

  const isSaving = useCallback((phase: string, section: string, chapterIndex?: number): boolean => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    return saving[key] ?? false
  }, [saving])

  const isSaved = useCallback((phase: string, section: string, chapterIndex?: number): boolean => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    return saved[key] ?? false
  }, [saved])

  // Get styleGuide parsed from the workbook data
  const getStyleGuide = useCallback((): StyleGuide => {
    const raw = data['setup:styleGuide']
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  }, [data])

  const setStyleGuide = useCallback((guide: StyleGuide) => {
    setValue('setup', 'styleGuide', JSON.stringify(guide))
  }, [setValue])

  // Get chapterMeta
  const getChapterMeta = useCallback((phase: 'writing' | 'polish'): ChapterMeta => {
    const raw = data[`${phase}:chapterMeta`]
    if (!raw) return { count: 1, titles: [] }
    try { return JSON.parse(raw) } catch { return { count: 1, titles: [] } }
  }, [data])

  const setChapterMeta = useCallback((phase: 'writing' | 'polish', meta: ChapterMeta) => {
    setValue(phase, 'chapterMeta', JSON.stringify(meta))
  }, [setValue])

  // ── Draft versioning helpers ───────────────────────────────────────────────

  const getChapterDraftMeta = useCallback((chapterIndex: number): ChapterDraftMeta => {
    const raw = data['writing:chapterDraftMeta']
    if (!raw) return { draftCount: 1, activeDraft: 0 }
    try {
      const all = JSON.parse(raw) as Record<string, ChapterDraftMeta>
      return all[String(chapterIndex)] ?? { draftCount: 1, activeDraft: 0 }
    } catch { return { draftCount: 1, activeDraft: 0 } }
  }, [data])

  const setChapterDraftMeta = useCallback((chapterIndex: number, meta: ChapterDraftMeta) => {
    const raw = data['writing:chapterDraftMeta']
    let all: Record<string, ChapterDraftMeta> = {}
    if (raw) { try { all = JSON.parse(raw) } catch { /* noop */ } }
    all[String(chapterIndex)] = meta
    setValue('writing', 'chapterDraftMeta', JSON.stringify(all))
  }, [data, setValue])

  const getChapterDraft = useCallback((chapterIndex: number, draftIndex: number): string => {
    // New format first
    const draftKey = `writing:chapter:${chapterIndex}:draft:${draftIndex}`
    if (data[draftKey] != null) return data[draftKey]
    // Fallback to old format for draft 0
    if (draftIndex === 0) return data[`writing:chapter:${chapterIndex}`] ?? ''
    return ''
  }, [data])

  const setChapterDraft = useCallback((chapterIndex: number, draftIndex: number, content: string) => {
    // Always write to new draft key format
    // We store as writing:chapter:{N}:draft:{D} — phase=writing, section=chapter:{N}:draft:{D}
    setValue('writing', `chapter:${chapterIndex}:draft:${draftIndex}`, content)
  }, [setValue])

  const getActiveDraftContent = useCallback((chapterIndex: number): string => {
    const meta = getChapterDraftMeta(chapterIndex)
    return getChapterDraft(chapterIndex, meta.activeDraft)
  }, [getChapterDraftMeta, getChapterDraft])

  return {
    data, loaded, getValue, setValue, isSaving, isSaved,
    saving, saved,
    getStyleGuide, setStyleGuide, getChapterMeta, setChapterMeta, load,
    getChapterDraftMeta, setChapterDraftMeta,
    getChapterDraft, setChapterDraft, getActiveDraftContent,
  }
}
