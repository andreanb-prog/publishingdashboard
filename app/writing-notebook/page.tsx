'use client'
// app/writing-notebook/page.tsx — immersive writing notebook (no sidebar)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Sparkles, X } from 'lucide-react'
import { useBooks } from '@/hooks/useBooks'
import BookSelector from '@/components/BookSelector'
import { NotebookPane } from '@/components/writing-notebook/NotebookPane'
import { ChapterDrawer } from '@/components/writing-notebook/ChapterDrawer'
import { AIChatPanel } from '@/components/writing-notebook/AIChatPanel'
import { MobileBottomBar } from '@/components/writing-notebook/MobileBottomBar'

type Phase = 'setup' | 'writing' | 'polish'
type MobileTab = 'notebook' | 'chapters' | 'chat'

export interface WorkbookData { [key: string]: string }
export interface ChapterMeta { count: number; titles: string[] }
export interface StyleGuide {
  niche?: string; pov?: string; tense?: string
  totalWordCount?: string; chapterWordCount?: string
  tropes?: string; personalStylePreferences?: string
  killList?: { word: string; scope: 'global' | 'book' }[]
  aiRules?: { antiSlopEnabled: boolean; writingFormulaEnabled: boolean }
}

export default function WritingNotebookPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { books } = useBooks()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [workbookData, setWorkbookData] = useState<WorkbookData>({})
  const [activePhase, setActivePhase] = useState<Phase>('writing')
  const [activeSection, setActiveSection] = useState('chapter')
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drawerToggle, setDrawerToggle] = useState<'drafts' | 'final'>('drafts')
  const [mobileTab, setMobileTab] = useState<MobileTab>('notebook')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [hasApiKey, setHasApiKey] = useState(false)

  // Select book from URL param or first book
  useEffect(() => {
    if (books.length === 0) return
    const paramBookId = searchParams.get('bookId')
    const initial = paramBookId && books.find(b => b.id === paramBookId)
      ? paramBookId : books[0]?.id ?? null
    setSelectedBookId(prev => prev ?? initial)
  }, [books, searchParams])

  // Check API key
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setHasApiKey(!!d.anthropicApiKey))
      .catch(() => {})
  }, [])

  // Load workbook data
  const loadWorkbook = useCallback(async () => {
    if (!selectedBookId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/writing-notebook?bookId=${selectedBookId}`)
      const { data: records } = await res.json()
      const map: WorkbookData = {}
      for (const r of records ?? []) {
        const key = r.chapterIndex != null
          ? `${r.phase}:${r.section}:${r.chapterIndex}`
          : `${r.phase}:${r.section}`
        map[key] = r.content
      }
      setWorkbookData(map)
    } catch { /* noop */ }
    setLoading(false)
  }, [selectedBookId])

  useEffect(() => { loadWorkbook() }, [loadWorkbook])

  // Update URL
  useEffect(() => {
    if (selectedBookId) router.replace(`/writing-notebook?bookId=${selectedBookId}`, { scroll: false })
  }, [selectedBookId, router])

  // Get/set helpers
  const getValue = useCallback((phase: string, section: string, chapterIndex?: number): string => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    return workbookData[key] ?? ''
  }, [workbookData])

  const setValue = useCallback(async (phase: string, section: string, content: string, chapterIndex?: number) => {
    const key = chapterIndex != null ? `${phase}:${section}:${chapterIndex}` : `${phase}:${section}`
    setWorkbookData(prev => ({ ...prev, [key]: content }))
    setSaving(prev => ({ ...prev, [key]: true }))
    setSaved(prev => ({ ...prev, [key]: false }))
    try {
      await fetch('/api/writing-notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBookId, phase, section, chapterIndex: chapterIndex ?? null, content }),
      })
      setSaved(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [key]: false })), 2000)
    } catch { /* noop */ }
    setSaving(prev => ({ ...prev, [key]: false }))
  }, [selectedBookId])

  const getChapterMeta = useCallback((phase: 'writing' | 'polish'): ChapterMeta => {
    const raw = workbookData[`${phase}:chapterMeta`]
    if (!raw) return { count: 1, titles: [] }
    try { return JSON.parse(raw) } catch { return { count: 1, titles: [] } }
  }, [workbookData])

  const setChapterMeta = useCallback((phase: 'writing' | 'polish', meta: ChapterMeta) => {
    setValue(phase, 'chapterMeta', JSON.stringify(meta))
  }, [setValue])

  const getStyleGuide = useCallback((): StyleGuide => {
    const raw = workbookData['setup:styleGuide']
    if (!raw) return {}
    try { return JSON.parse(raw) } catch { return {} }
  }, [workbookData])

  const handleSectionChange = useCallback((section: string, chapterIndex?: number | null) => {
    setActiveSection(section)
    if (chapterIndex !== undefined) setActiveChapterIndex(chapterIndex)
  }, [])

  const handleChapterClick = useCallback((idx: number) => {
    setActivePhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(idx)
    setMobileTab('notebook')
  }, [])

  const handleSectionClick = useCallback((section: string) => {
    if (section === 'storyOutline') { setActivePhase('setup'); setActiveSection('storyOutline') }
    else if (section === 'storySoFar') { setActivePhase('writing'); setActiveSection('storySoFar') }
    setMobileTab('notebook')
  }, [])

  const handleAddChapter = useCallback(() => {
    const meta = getChapterMeta('writing')
    const newMeta = { count: meta.count + 1, titles: [...meta.titles, ''] }
    setChapterMeta('writing', newMeta)
    setActivePhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(meta.count) // 0-indexed, so meta.count is the new index
  }, [getChapterMeta, setChapterMeta])

  const handleSaveToWorkbook = useCallback(async (content: string, chapterIndex: number) => {
    await setValue('writing', 'chapter', content, chapterIndex)
    // Ensure chapter meta includes this index
    const meta = getChapterMeta('writing')
    if (chapterIndex >= meta.count) {
      setChapterMeta('writing', { count: chapterIndex + 1, titles: [...meta.titles] })
    }
    setIsChatOpen(false)
    setActivePhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(chapterIndex)
  }, [setValue, getChapterMeta, setChapterMeta])

  // Story So Far auto-update
  const triggerStorySoFar = useCallback(async () => {
    if (!selectedBookId) return
    const meta = getChapterMeta('writing')
    const chapters = Array.from({ length: meta.count }, (_, i) => ({
      title: meta.titles[i] ?? '',
      content: getValue('writing', 'chapter', i),
      order: i,
    })).filter(c => c.content.trim())
    if (!chapters.length) return
    try {
      const res = await fetch('/api/writing-notebook/story-so-far', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBookId, chapters }),
      })
      const data = await res.json()
      if (data.success && data.summary) {
        await setValue('writing', 'storySoFar', data.summary)
      }
    } catch { /* fail silently */ }
  }, [selectedBookId, getChapterMeta, getValue, setValue])

  // On load: fire once if chapters have content but storySoFar is empty
  const didLoadTriggerRef = useRef(false)
  useEffect(() => {
    if (loading || didLoadTriggerRef.current) return
    const currentSummary = workbookData['writing:storySoFar'] ?? ''
    if (currentSummary.trim()) return
    const meta = getChapterMeta('writing')
    const hasContent = Array.from({ length: meta.count }, (_, i) =>
      workbookData[`writing:chapter:${i}`] ?? ''
    ).some(c => c.trim())
    if (hasContent) {
      didLoadTriggerRef.current = true
      triggerStorySoFar()
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBook = books.find(b => b.id === selectedBookId)

  if (loading && books.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#E5E7EB', borderTopColor: '#E9A020' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading your notebook...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#FFF8F0' }}>
      {/* Immersive top bar */}
      <div className="h-12 flex items-center px-6 shrink-0" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <Link href="/dashboard" className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity" style={{ color: '#6B7280' }}>
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
        <div className="flex-1 flex justify-center">
          <BookSelector value={selectedBookId || null} onChange={setSelectedBookId} placeholder="Select a book" />
        </div>
        <button
          onClick={() => { setIsChatOpen(!isChatOpen); setMobileTab(isChatOpen ? 'notebook' : 'chat') }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          style={{ border: isChatOpen ? 'none' : '1.5px solid #E9A020', color: isChatOpen ? '#6B7280' : '#E9A020', background: isChatOpen ? '#F3F4F6' : 'transparent' }}
        >
          {isChatOpen ? <X size={14} /> : <Sparkles size={14} />}
          {isChatOpen ? 'Close Chat' : 'AI Chat'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left pane — Notebook */}
        <div
          className={`flex-1 overflow-hidden ${mobileTab !== 'notebook' ? 'hidden md:flex' : 'flex'} flex-col`}
          style={{ maxWidth: '55%' }}
        >
          <NotebookPane
            bookId={selectedBookId ?? ''}
            activePhase={activePhase}
            onPhaseChange={setActivePhase}
            activeSection={activeSection}
            activeChapterIndex={activeChapterIndex}
            onSectionChange={handleSectionChange}
            getValue={getValue}
            setValue={setValue}
            getChapterMeta={getChapterMeta}
            saving={saving}
            saved={saved}
            onChapterBlur={triggerStorySoFar}
          />
        </div>

        {/* Right pane — Chapter Drawer */}
        <div
          className={`overflow-hidden ${mobileTab !== 'chapters' ? 'hidden md:flex' : 'flex'} flex-col transition-opacity duration-200`}
          style={{ width: '45%', opacity: isChatOpen ? 0.4 : 1, pointerEvents: isChatOpen ? 'none' : 'auto' }}
        >
          <ChapterDrawer
            bookId={selectedBookId ?? ''}
            workbookData={workbookData}
            getChapterMeta={getChapterMeta}
            drawerToggle={drawerToggle}
            onDrawerToggle={setDrawerToggle}
            activeChapterIndex={activeChapterIndex}
            onChapterClick={handleChapterClick}
            onSectionClick={handleSectionClick}
            onAddChapter={handleAddChapter}
            onOpenChat={() => { setIsChatOpen(true); setMobileTab('chat') }}
          />
        </div>

        {/* Floating AI Chat Panel */}
        <AIChatPanel
          isOpen={isChatOpen || mobileTab === 'chat'}
          onClose={() => { setIsChatOpen(false); setMobileTab('notebook') }}
          bookId={selectedBookId ?? ''}
          bookTitle={selectedBook?.title ?? 'Untitled'}
          activePhase={activePhase}
          workbookData={workbookData}
          styleGuide={getStyleGuide()}
          hasApiKey={hasApiKey}
          onSaveToWorkbook={handleSaveToWorkbook}
        />
      </div>

      <MobileBottomBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  )
}
