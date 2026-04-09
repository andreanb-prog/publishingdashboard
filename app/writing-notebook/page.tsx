'use client'
// app/writing-notebook/page.tsx — immersive writing notebook (Google Docs layout, no dashboard shell)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBooks } from '@/hooks/useBooks'
import { useWorkbook } from '@/app/dashboard/writing-notebook/useWorkbook'

// ── Desktop components (new layout) ──────────────────────────────────
import { WritingNotebookTopBar } from '@/components/writing-notebook/WritingNotebookTopBar'
import { SidebarNav } from '@/components/writing-notebook/SidebarNav'
import { InlineAIPanel } from '@/components/writing-notebook/InlineAIPanel'
import { EditorArea } from '@/components/writing-notebook/EditorArea'

// ── Mobile components ─────────────────────────────────────────────────
import { NotebookPane } from '@/components/writing-notebook/NotebookPane'
import { ChapterDrawer } from '@/components/writing-notebook/ChapterDrawer'
import { AIChatPanel } from '@/components/writing-notebook/AIChatPanel'
import { MobileBottomBar } from '@/components/writing-notebook/MobileBottomBar'

type NotebookPhase = 'setup' | 'writing' | 'polish'
type MobileTab = 'notebook' | 'chapters' | 'chat'

export default function WritingNotebookPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { books } = useBooks()

  // ── Shared ─────────────────────────────────────────────────────────
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)

  const workbook = useWorkbook(selectedBookId)
  const selectedBook = books.find(b => b.id === selectedBookId)

  // ── Desktop state ──────────────────────────────────────────────────
  const [activeNavItem, setActiveNavItem] = useState('storyOutline')
  const [wordCount, setWordCount] = useState(0)
  const [storySoFarStatus, setStorySoFarStatus] = useState<'upToDate' | 'updating'>('upToDate')
  const [toast, setToast] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // ── Mobile state ───────────────────────────────────────────────────
  const [phase, setPhase] = useState<NotebookPhase>('setup')
  const [activeSection, setActiveSection] = useState('storyOutline')
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drawerToggle, setDrawerToggle] = useState<'drafts' | 'final'>('drafts')
  const [mobileTab, setMobileTab] = useState<MobileTab>('notebook')

  // ── Init ───────────────────────────────────────────────────────────
  // Select book from URL param or first book
  useEffect(() => {
    if (books.length === 0) return
    const paramBookId = searchParams.get('bookId')
    const initial = paramBookId && books.find(b => b.id === paramBookId)
      ? paramBookId
      : books[0]?.id ?? null
    setSelectedBookId(prev => prev ?? initial)
  }, [books, searchParams])

  // Check API key
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => setHasApiKey(!!d.anthropicApiKey))
      .catch(() => {})
  }, [])

  // Sync book to URL
  useEffect(() => {
    if (selectedBookId) router.replace(`/writing-notebook?bookId=${selectedBookId}`, { scroll: false })
  }, [selectedBookId, router])

  // ── Save tracking ──────────────────────────────────────────────────
  const isSavingAny = Object.values(workbook.saving).some(Boolean)
  const prevSavingRef = useRef(false)
  useEffect(() => {
    if (prevSavingRef.current && !isSavingAny) setLastSavedAt(new Date())
    prevSavingRef.current = isSavingAny
  }, [isSavingAny])

  // ── Story So Far auto-update ───────────────────────────────────────
  const triggerStorySoFarUpdate = useCallback(async () => {
    if (!selectedBookId) return
    const meta = workbook.getChapterMeta('writing')
    const chapters = Array.from({ length: meta.count }, (_, i) => ({
      title: meta.titles[i] ?? '',
      content: workbook.getValue('writing', 'chapter', i),
      order: i,
    })).filter(c => c.content.trim())
    if (!chapters.length) return
    setStorySoFarStatus('updating')
    try {
      const res = await fetch('/api/writing-notebook/story-so-far', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBookId, chapters }),
      })
      const data = await res.json()
      if (data.success && data.summary) {
        workbook.setValue('writing', 'storySoFar', data.summary)
        setToast('Story So Far updated')
        setTimeout(() => setToast(null), 3000)
      }
    } catch { /* fail silently */ }
    finally { setStorySoFarStatus('upToDate') }
  }, [selectedBookId, workbook])

  // On load: auto-generate once if chapters exist but storySoFar is empty
  const didLoadTriggerRef = useRef(false)
  useEffect(() => {
    if (!workbook.loaded || didLoadTriggerRef.current) return
    if (workbook.getValue('writing', 'storySoFar').trim()) return
    const meta = workbook.getChapterMeta('writing')
    const hasContent = Array.from({ length: meta.count }, (_, i) =>
      workbook.getValue('writing', 'chapter', i)
    ).some(c => c.trim())
    if (hasContent) {
      didLoadTriggerRef.current = true
      triggerStorySoFarUpdate()
    }
  }, [workbook.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger on chapter nav-away
  const prevNavRef = useRef(activeNavItem)
  const handleNavChange = useCallback((item: string) => {
    if (prevNavRef.current.startsWith('chapter:') && !item.startsWith('chapter:')) {
      triggerStorySoFarUpdate()
    }
    prevNavRef.current = item
    setActiveNavItem(item)
  }, [triggerStorySoFarUpdate])

  // 60-second idle timer
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (activeNavItem.startsWith('chapter:')) {
      idleTimerRef.current = setTimeout(() => triggerStorySoFarUpdate(), 60_000)
    }
  }, [activeNavItem, triggerStorySoFarUpdate])

  useEffect(() => {
    if (!activeNavItem.startsWith('chapter:') && idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
  }, [activeNavItem])

  // ── Chapter handlers ───────────────────────────────────────────────
  const handleAddChapter = useCallback(() => {
    const meta = workbook.getChapterMeta('writing')
    workbook.setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
    setActiveNavItem(`chapter:${meta.count}`)
  }, [workbook])

  const handleMobileAddChapter = useCallback(() => {
    const meta = workbook.getChapterMeta('writing')
    workbook.setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
    setPhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(meta.count)
  }, [workbook])

  const handleSaveToWorkbook = useCallback(async (content: string, chapterIndex: number, chapterTitle?: string) => {
    const meta = workbook.getChapterMeta('writing')
    if (chapterIndex >= meta.count) {
      workbook.setChapterMeta('writing', { count: chapterIndex + 1, titles: [...meta.titles, chapterTitle ?? ''] })
    }
    workbook.setValue('writing', 'chapter', content, chapterIndex)
  }, [workbook])

  const setValueAsync = useCallback(
    async (p: string, s: string, content: string, chapterIndex?: number) => {
      workbook.setValue(p, s, content, chapterIndex)
    },
    [workbook]
  )

  const bookId = selectedBookId ?? ''
  const bookTitle = selectedBook?.title ?? ''

  const hasChapterContent = (() => {
    const meta = workbook.getChapterMeta('writing')
    return Array.from({ length: meta.count }, (_, i) =>
      workbook.getValue('writing', 'chapter', i)
    ).some(c => c.trim())
  })()

  return (
    <div className="flex flex-col h-screen" style={{ background: '#FFFFFF' }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <WritingNotebookTopBar
        books={books}
        selectedBookId={bookId}
        onBookChange={id => setSelectedBookId(id)}
        wordCount={wordCount}
        saving={workbook.saving}
        lastSavedAt={lastSavedAt}
        bookId={bookId}
        onAddChapter={handleAddChapter}
      />

      {/* ═══ DESKTOP LAYOUT ════════════════════════════════════════ */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left — SidebarNav (196px) */}
        <SidebarNav
          workbookData={workbook.data}
          getChapterMeta={workbook.getChapterMeta}
          activeNavItem={activeNavItem}
          onNavChange={handleNavChange}
          onAddChapter={handleAddChapter}
          storySoFarStatus={storySoFarStatus}
          onStorySoFarUpdate={triggerStorySoFarUpdate}
          hasChapterContent={hasChapterContent}
        />

        {/* Center — AI panel + editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <InlineAIPanel
            bookId={bookId}
            bookTitle={bookTitle}
            workbookData={workbook.data}
            styleGuide={workbook.getStyleGuide()}
            hasApiKey={hasApiKey}
            activeNavItem={activeNavItem}
          />

          <div className="flex-1 overflow-hidden">
            <EditorArea
              key={activeNavItem}
              activeNavItem={activeNavItem}
              bookId={bookId}
              workbookData={workbook.data}
              getValue={workbook.getValue}
              setValue={workbook.setValue}
              getChapterMeta={workbook.getChapterMeta}
              setChapterMeta={workbook.setChapterMeta}
              getStyleGuide={workbook.getStyleGuide}
              setStyleGuide={workbook.setStyleGuide}
              onWordCountChange={setWordCount}
              onKeystroke={resetIdleTimer}
              onStorySoFarUpdate={triggerStorySoFarUpdate}
              storySoFarStatus={storySoFarStatus}
              hasChapterContent={hasChapterContent}
            />
          </div>
        </div>
      </div>

      {/* ═══ MOBILE LAYOUT ════════════════════════════════════════ */}
      <div className="flex-1 md:hidden overflow-hidden pb-14">
        {mobileTab === 'notebook' && (
          <NotebookPane
            bookId={bookId}
            activePhase={phase}
            onPhaseChange={setPhase}
            activeSection={activeSection}
            activeChapterIndex={activeChapterIndex}
            onSectionChange={(section, chapterIndex) => {
              setActiveSection(section)
              setActiveChapterIndex(chapterIndex ?? null)
            }}
            getValue={workbook.getValue}
            setValue={setValueAsync}
            getChapterMeta={workbook.getChapterMeta}
            saving={workbook.saving}
            saved={workbook.saved}
          />
        )}
        {mobileTab === 'chapters' && (
          <ChapterDrawer
            bookId={bookId}
            workbookData={workbook.data}
            getChapterMeta={workbook.getChapterMeta}
            drawerToggle={drawerToggle}
            onDrawerToggle={setDrawerToggle}
            activeChapterIndex={activeChapterIndex}
            onChapterClick={idx => {
              setPhase('writing')
              setActiveSection('chapter')
              setActiveChapterIndex(idx)
              setMobileTab('notebook')
            }}
            onSectionClick={section => {
              setActiveSection(section)
              setPhase(section === 'storySoFar' ? 'writing' : 'setup')
              setMobileTab('notebook')
            }}
            onAddChapter={() => { handleMobileAddChapter(); setMobileTab('notebook') }}
            onOpenChat={() => { setIsChatOpen(true); setMobileTab('chat') }}
          />
        )}
        {mobileTab === 'chat' && (
          <AIChatPanel
            isOpen
            onClose={() => setMobileTab('notebook')}
            bookId={bookId}
            bookTitle={bookTitle}
            activePhase={phase}
            workbookData={workbook.data}
            styleGuide={workbook.getStyleGuide()}
            hasApiKey={hasApiKey}
            onSaveToWorkbook={handleSaveToWorkbook}
          />
        )}
      </div>

      <MobileBottomBar activeTab={mobileTab} onTabChange={setMobileTab} />

      {/* Story So Far toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium z-50"
          style={{ background: '#1E2D3D', color: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
          {toast}
        </div>
      )}
    </div>
  )
}
