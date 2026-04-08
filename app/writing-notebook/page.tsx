'use client'
// app/writing-notebook/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { WritingNotebookTopBar } from '@/components/writing-notebook/WritingNotebookTopBar'
import { NotebookPane } from '@/components/writing-notebook/NotebookPane'
import { ChapterDrawer } from '@/components/writing-notebook/ChapterDrawer'
import { AIChatPanel } from '@/components/writing-notebook/AIChatPanel'
import { MobileBottomBar } from '@/components/writing-notebook/MobileBottomBar'

type Phase = 'setup' | 'writing' | 'polish'
type MobileTab = 'notebook' | 'chapters' | 'chat'
type Book = { id: string; title: string; coverUrl?: string | null }
type NRecord = {
  id: string; phase: string; section: string; chapterIndex: number | null
  chapterTitle: string | null; content: string; wordCount: number
}

export default function WritingNotebookPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [books, setBooks] = useState<Book[]>([])
  const [selectedBookId, setSelectedBookId] = useState('')
  const [records, setRecords] = useState<NRecord[]>([])
  const [activePhase, setActivePhase] = useState<Phase>('writing')
  const [activeSection, setActiveSection] = useState('chapter')
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drawerToggle, setDrawerToggle] = useState<'drafts' | 'final'>('drafts')
  const [mobileTab, setMobileTab] = useState<MobileTab>('notebook')
  const [loading, setLoading] = useState(true)

  // Fetch books
  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(data => {
        const bookList = data.books ?? []
        setBooks(bookList)
        const paramBookId = searchParams.get('bookId')
        const initial = paramBookId && bookList.find((b: Book) => b.id === paramBookId)
          ? paramBookId
          : bookList[0]?.id ?? ''
        setSelectedBookId(initial)
      })
      .catch(() => setLoading(false))
  }, [searchParams])

  // Fetch records when book changes
  const fetchRecords = useCallback(async () => {
    if (!selectedBookId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/writing-notebook?bookId=${selectedBookId}`)
      const data = await res.json()
      setRecords(data.records ?? [])
    } catch { /* empty */ }
    setLoading(false)
  }, [selectedBookId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Update URL when book changes
  useEffect(() => {
    if (selectedBookId) {
      router.replace(`/writing-notebook?bookId=${selectedBookId}`, { scroll: false })
    }
  }, [selectedBookId, router])

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
    if (section === 'storyOutline') {
      setActivePhase('setup')
      setActiveSection('storyOutline')
    } else if (section === 'storySoFar') {
      setActivePhase('writing')
      setActiveSection('storySoFar')
    }
    setMobileTab('notebook')
  }, [])

  const handleAddChapter = useCallback(async () => {
    const existingChapters = records
      .filter(r => r.section === 'chapter')
      .map(r => r.chapterIndex ?? 0)
    const nextIndex = existingChapters.length > 0 ? Math.max(...existingChapters) + 1 : 1

    await fetch('/api/writing-notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: selectedBookId,
        phase: 'writing',
        section: 'chapter',
        chapterIndex: nextIndex,
        content: '',
      }),
    })
    await fetchRecords()
    setActivePhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(nextIndex)
  }, [records, selectedBookId, fetchRecords])

  const handleSaveToWorkbook = useCallback(async (content: string, chapterIndex: number, chapterTitle?: string) => {
    await fetch('/api/writing-notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: selectedBookId,
        phase: 'writing',
        section: 'chapter',
        chapterIndex,
        chapterTitle,
        content,
      }),
    })
    await fetchRecords()
    setIsChatOpen(false)
    setActivePhase('writing')
    setActiveSection('chapter')
    setActiveChapterIndex(chapterIndex)
  }, [selectedBookId, fetchRecords])

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
      {/* Top Bar */}
      <WritingNotebookTopBar
        books={books}
        selectedBookId={selectedBookId}
        onBookChange={setSelectedBookId}
        isChatOpen={isChatOpen}
        onToggleChat={() => { setIsChatOpen(!isChatOpen); setMobileTab(isChatOpen ? 'notebook' : 'chat') }}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left pane — Notebook */}
        <div
          className={`flex-1 overflow-hidden ${mobileTab !== 'notebook' ? 'hidden md:flex' : 'flex'} flex-col`}
          style={{ maxWidth: '55%' }}
        >
          <NotebookPane
            bookId={selectedBookId}
            activePhase={activePhase}
            onPhaseChange={setActivePhase}
            activeSection={activeSection}
            activeChapterIndex={activeChapterIndex}
            onSectionChange={handleSectionChange}
            records={records}
            onRecordSaved={fetchRecords}
          />
        </div>

        {/* Right pane — Chapter Drawer */}
        <div
          className={`overflow-hidden ${mobileTab !== 'chapters' ? 'hidden md:flex' : 'flex'} flex-col transition-opacity duration-200`}
          style={{
            width: '45%',
            opacity: isChatOpen ? 0.4 : 1,
            pointerEvents: isChatOpen ? 'none' : 'auto',
          }}
        >
          <ChapterDrawer
            bookId={selectedBookId}
            records={records}
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
          bookId={selectedBookId}
          bookTitle={selectedBook?.title ?? 'Untitled'}
          activePhase={activePhase}
          activeSection={activeSection}
          activeChapterIndex={activeChapterIndex}
          onSaveToWorkbook={handleSaveToWorkbook}
        />
      </div>

      {/* Mobile bottom bar */}
      <MobileBottomBar activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  )
}
