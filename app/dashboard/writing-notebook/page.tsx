'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { WritingOnboarding } from './WritingOnboarding'
import { useWorkbook } from './useWorkbook'
import { useBooks } from '@/hooks/useBooks'

// ── Desktop components (new layout) ──────────────────────────────────
import { WritingNotebookTopBar } from '@/components/writing-notebook/WritingNotebookTopBar'
import { SidebarNav } from '@/components/writing-notebook/SidebarNav'
import { InlineAIPanel } from '@/components/writing-notebook/InlineAIPanel'
import { EditorArea } from '@/components/writing-notebook/EditorArea'

// ── Mobile components (kept from previous layout) ─────────────────────
import { NotebookPane } from '@/components/writing-notebook/NotebookPane'
import { ChapterDrawer } from '@/components/writing-notebook/ChapterDrawer'
import { AIChatPanel } from '@/components/writing-notebook/AIChatPanel'
import { MobileBottomBar } from '@/components/writing-notebook/MobileBottomBar'

type NotebookPhase = 'setup' | 'writing' | 'polish'

export default function WritingNotebookPage() {
  useSession()

  const { books } = useBooks()

  // ── Shared state ───────────────────────────────────────────────────
  const [selectedBookId, setSelectedBookId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('wn_selected_book') : null
  )
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
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
  const [mobileTab, setMobileTab] = useState<'notebook' | 'chapters' | 'chat'>('notebook')

  // ── Init: load settings ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setOnboardingComplete(d.writingOnboardingComplete ?? false)
        setHasApiKey(!!d.anthropicApiKey)
        if (!d.writingOnboardingComplete) setShowOnboarding(true)
      })
      .catch(() => setOnboardingComplete(false))
  }, [])

  // Auto-select first book
  useEffect(() => {
    if (books.length > 0 && !selectedBookId) setSelectedBookId(books[0].id)
  }, [books]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBookId) localStorage.setItem('wn_selected_book', selectedBookId)
  }, [selectedBookId])

  // ── Save tracking: update lastSavedAt when saving → idle ──────────
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

  // On page load: auto-generate Story So Far once if chapters have content but summary is empty
  const didLoadTriggerRef = useRef(false)
  useEffect(() => {
    if (!workbook.loaded || didLoadTriggerRef.current) return
    const currentSummary = workbook.getValue('writing', 'storySoFar')
    if (currentSummary.trim()) return // already populated
    const meta = workbook.getChapterMeta('writing')
    const hasContent = Array.from({ length: meta.count }, (_, i) =>
      workbook.getValue('writing', 'chapter', i)
    ).some(c => c.trim())
    if (hasContent) {
      didLoadTriggerRef.current = true
      triggerStorySoFarUpdate()
    }
  }, [workbook.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger when navigating away from a chapter
  const prevNavRef = useRef(activeNavItem)

  const handleNavChange = useCallback((item: string) => {
    const prev = prevNavRef.current
    if (prev.startsWith('chapter:') && !item.startsWith('chapter:')) {
      triggerStorySoFarUpdate()
    }
    prevNavRef.current = item
    setActiveNavItem(item)
  }, [triggerStorySoFarUpdate])

  // 60-second idle timer while in a chapter
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (activeNavItem.startsWith('chapter:')) {
      idleTimerRef.current = setTimeout(() => triggerStorySoFarUpdate(), 60_000)
    }
  }, [activeNavItem, triggerStorySoFarUpdate])

  // Clear idle timer when nav changes
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

  // Mobile equivalent
  const handleMobileAddChapter = useCallback(() => {
    const meta = workbook.getChapterMeta('writing')
    workbook.setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
    setPhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(meta.count)
  }, [workbook])

  const handleMobileSectionChange = useCallback((section: string, chapterIndex?: number | null) => {
    setActiveSection(section)
    setActiveChapterIndex(chapterIndex ?? null)
  }, [])

  const handleMobileChapterClick = useCallback((idx: number) => {
    setPhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(idx)
  }, [])

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

  // ── Loading state ──────────────────────────────────────────────────
  if (onboardingComplete === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>
      </div>
    )
  }

  const bookId = selectedBookId ?? ''
  const bookTitle = selectedBook?.title ?? ''

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <WritingOnboarding
          onComplete={() => {
            setShowOnboarding(false)
            setOnboardingComplete(true)
            fetch('/api/settings')
              .then(r => r.json())
              .then(d => setHasApiKey(!!d.anthropicApiKey))
              .catch(() => {})
          }}
        />
      )}

      {/* ── Shared top bar ─────────────────────────────────────────── */}
      <WritingNotebookTopBar
        books={books}
        selectedBookId={bookId}
        onBookChange={id => setSelectedBookId(id)}
        onNewBook={() => window.open('/dashboard/settings', '_blank')}
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
        />

        {/* Center — AI panel + editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Inline AI panel (collapsed by default) */}
          <InlineAIPanel
            bookId={bookId}
            bookTitle={bookTitle}
            workbookData={workbook.data}
            styleGuide={workbook.getStyleGuide()}
            hasApiKey={hasApiKey}
            activeNavItem={activeNavItem}
          />

          {/* Editor */}
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
            onSectionChange={handleMobileSectionChange}
            getValue={workbook.getValue}
            setValue={setValueAsync}
            getChapterMeta={workbook.getChapterMeta}
            saving={workbook.saving}
            saved={workbook.saved}
            onChapterBlur={triggerStorySoFarUpdate}
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
            onChapterClick={idx => { handleMobileChapterClick(idx); setMobileTab('notebook') }}
            onSectionClick={section => {
              handleMobileSectionChange(section)
              setPhase(section === 'storySoFar' ? 'writing' : 'setup')
              setMobileTab('notebook')
            }}
            onAddChapter={() => { handleMobileAddChapter(); setMobileTab('notebook') }}
            onOpenChat={() => setMobileTab('chat')}
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

      {/* ── Story So Far toast ─────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium z-50 transition-opacity duration-300"
          style={{
            background: '#1E2D3D',
            color: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#8B5CF6' }}
          />
          {toast}
        </div>
      )}
    </div>
  )
}
