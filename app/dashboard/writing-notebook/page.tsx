'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { WritingOnboarding } from './WritingOnboarding'
import { useWorkbook } from './useWorkbook'
import { WritingNotebookTopBar } from '@/components/writing-notebook/WritingNotebookTopBar'
import { NotebookPane } from '@/components/writing-notebook/NotebookPane'
import { ChapterDrawer } from '@/components/writing-notebook/ChapterDrawer'
import { AIChatPanel } from '@/components/writing-notebook/AIChatPanel'
import { MobileBottomBar } from '@/components/writing-notebook/MobileBottomBar'

interface BookOption {
  id: string
  title: string
}

type NotebookPhase = 'setup' | 'writing' | 'polish'

export default function WritingNotebookPage() {
  useSession() // keep auth context active
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [books, setBooks] = useState<BookOption[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('wn_selected_book')
    return null
  })

  const [phase, setPhase] = useState<NotebookPhase>('setup')
  const [activeSection, setActiveSection] = useState('storyOutline')
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drawerToggle, setDrawerToggle] = useState<'drafts' | 'final'>('drafts')
  const [mobileTab, setMobileTab] = useState<'notebook' | 'chapters' | 'chat'>('notebook')

  const workbook = useWorkbook(selectedBookId)
  const selectedBook = books.find(b => b.id === selectedBookId)

  // Load user settings
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

  // Load books
  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(d => {
        const bks = (d.books ?? d.data ?? []).map((b: { id: string; title: string }) => ({ id: b.id, title: b.title }))
        setBooks(bks)
        if (!selectedBookId && bks.length > 0) setSelectedBookId(bks[0].id)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBookId) localStorage.setItem('wn_selected_book', selectedBookId)
  }, [selectedBookId])

  const handleSectionChange = useCallback((section: string, chapterIndex?: number | null) => {
    setActiveSection(section)
    setActiveChapterIndex(chapterIndex ?? null)
  }, [])

  const handleChapterClick = useCallback((chapterIndex: number) => {
    setPhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(chapterIndex)
  }, [])

  const handleAddChapter = useCallback(() => {
    const meta = workbook.getChapterMeta('writing')
    workbook.setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
    setPhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(meta.count)
  }, [workbook])

  const handleSaveToWorkbook = useCallback(async (content: string, chapterIndex: number, chapterTitle?: string) => {
    const meta = workbook.getChapterMeta('writing')
    if (chapterIndex >= meta.count) {
      workbook.setChapterMeta('writing', {
        count: chapterIndex + 1,
        titles: [...meta.titles, chapterTitle ?? ''],
      })
    }
    workbook.setValue('writing', 'chapter', content, chapterIndex)
  }, [workbook])

  // Wrap setValue so it matches NotebookPane's Promise<void> signature
  const setValueAsync = useCallback(
    async (phase: string, section: string, content: string, chapterIndex?: number) => {
      workbook.setValue(phase, section, content, chapterIndex)
    },
    [workbook]
  )

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
            fetch('/api/settings').then(r => r.json()).then(d => setHasApiKey(!!d.anthropicApiKey)).catch(() => {})
          }}
        />
      )}

      {/* Top bar */}
      <WritingNotebookTopBar
        books={books}
        selectedBookId={bookId}
        onBookChange={(id) => setSelectedBookId(id)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(prev => !prev)}
      />

      {/* ── Desktop layout ─────────────────────────────────── */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left — Chapter Drawer */}
        <div className="overflow-hidden flex flex-col shrink-0" style={{ width: 260 }}>
          <ChapterDrawer
            bookId={bookId}
            workbookData={workbook.data}
            getChapterMeta={workbook.getChapterMeta}
            drawerToggle={drawerToggle}
            onDrawerToggle={setDrawerToggle}
            activeChapterIndex={activeChapterIndex}
            onChapterClick={handleChapterClick}
            onSectionClick={(section) => {
              handleSectionChange(section)
              setPhase(section === 'storySoFar' ? 'writing' : 'setup')
            }}
            onAddChapter={handleAddChapter}
            onOpenChat={() => setIsChatOpen(true)}
          />
        </div>

        {/* Center — Notebook editor (shrinks when chat opens) */}
        <div
          className="flex-1 overflow-hidden flex flex-col transition-all duration-300"
          style={{ marginRight: isChatOpen ? 420 : 0 }}
        >
          <NotebookPane
            bookId={bookId}
            activePhase={phase}
            onPhaseChange={setPhase}
            activeSection={activeSection}
            activeChapterIndex={activeChapterIndex}
            onSectionChange={handleSectionChange}
            getValue={workbook.getValue}
            setValue={setValueAsync}
            getChapterMeta={workbook.getChapterMeta}
            saving={workbook.saving}
            saved={workbook.saved}
          />
        </div>

        {/* Right — AI Chat Panel (fixed, slides in) */}
        <AIChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          bookId={bookId}
          bookTitle={bookTitle}
          activePhase={phase}
          workbookData={workbook.data}
          styleGuide={workbook.getStyleGuide()}
          hasApiKey={hasApiKey}
          onSaveToWorkbook={handleSaveToWorkbook}
        />
      </div>

      {/* ── Mobile layout ──────────────────────────────────── */}
      <div className="flex-1 md:hidden overflow-hidden pb-14">
        {mobileTab === 'notebook' && (
          <NotebookPane
            bookId={bookId}
            activePhase={phase}
            onPhaseChange={setPhase}
            activeSection={activeSection}
            activeChapterIndex={activeChapterIndex}
            onSectionChange={handleSectionChange}
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
            onChapterClick={(idx) => { handleChapterClick(idx); setMobileTab('notebook') }}
            onSectionClick={(section) => {
              handleSectionChange(section)
              setPhase(section === 'storySoFar' ? 'writing' : 'setup')
              setMobileTab('notebook')
            }}
            onAddChapter={() => { handleAddChapter(); setMobileTab('notebook') }}
            onOpenChat={() => setMobileTab('chat')}
          />
        )}
        {mobileTab === 'chat' && (
          <AIChatPanel
            isOpen={true}
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

      {/* Mobile bottom nav */}
      <MobileBottomBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  )
}
