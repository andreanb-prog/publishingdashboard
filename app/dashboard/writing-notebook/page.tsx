'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { WritingOnboarding } from './WritingOnboarding'
import { WorkbookPane } from './WorkbookPane'
import { ChatPane } from './ChatPane'
import { BookSelector } from './BookSelector'
import { useWorkbook, type Phase } from './useWorkbook'

interface BookOption {
  id: string
  title: string
}

export default function WritingNotebookPage() {
  const { data: session } = useSession()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [books, setBooks] = useState<BookOption[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('wn_selected_book')
    return null
  })
  const [phase, setPhase] = useState<Phase>('setup')
  const [splitPos, setSplitPos] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wn_split_pos')
      return saved ? parseInt(saved, 10) : 60
    }
    return 60
  })
  const [mobileView, setMobileView] = useState<'workbook' | 'chat'>('workbook')
  const [prefillMessage, setPrefillMessage] = useState('')
  const [globalKillList, setGlobalKillList] = useState<{ word: string; scope: 'global' | 'book' }[]>([])

  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const workbook = useWorkbook(selectedBookId)
  const selectedBook = books.find(b => b.id === selectedBookId)

  // Load user state
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setOnboardingComplete(d.writingOnboardingComplete ?? false)
        setHasApiKey(!!d.anthropicApiKey)
        if (d.writingKillList) {
          try { setGlobalKillList(JSON.parse(d.writingKillList)) } catch {}
        }
        if (!d.writingOnboardingComplete) setShowOnboarding(true)
      })
      .catch(() => setOnboardingComplete(false))
  }, [])

  // Load books
  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(d => {
        const bks = (d.books ?? d.data ?? []).map((b: any) => ({ id: b.id, title: b.title }))
        setBooks(bks)
        if (!selectedBookId && bks.length > 0) {
          setSelectedBookId(bks[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedBookId) localStorage.setItem('wn_selected_book', selectedBookId)
  }, [selectedBookId])

  useEffect(() => {
    localStorage.setItem('wn_split_pos', String(splitPos))
  }, [splitPos])

  // Drag divider
  const onMouseDown = useCallback(() => { dragging.current = true }, [])
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPos(Math.max(30, Math.min(80, pct)))
    }
    const onMouseUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleBookCreated = useCallback((book: { id: string; title: string }) => {
    setBooks(prev => [...prev, book])
  }, [])

  const handleBookRenamed = useCallback((id: string, newTitle: string) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, title: newTitle } : b))
  }, [])

  const onSendToChat = useCallback((text: string) => {
    setPrefillMessage(text)
    setMobileView('chat')
  }, [])

  const onSaveToChapter = useCallback((content: string, chapterIdx: number) => {
    const phaseKey = phase === 'polish' ? 'polish' : 'writing'
    const meta = workbook.getChapterMeta(phaseKey as 'writing' | 'polish')
    if (chapterIdx >= meta.count) {
      workbook.setChapterMeta(phaseKey as 'writing' | 'polish', { count: meta.count + 1, titles: [...meta.titles, ''] })
    }
    workbook.setValue(phaseKey, 'chapter', content, chapterIdx)
  }, [phase, workbook])

  const getChapterCount = useCallback(() => {
    const phaseKey = phase === 'polish' ? 'polish' : 'writing'
    return workbook.getChapterMeta(phaseKey as 'writing' | 'polish').count
  }, [phase, workbook])

  const updateGlobalKillList = useCallback(async (list: { word: string; scope: 'global' | 'book' }[]) => {
    setGlobalKillList(list)
    // Persist to user record
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writingKillList: JSON.stringify(list) }),
      })
    } catch {}
  }, [])

  if (onboardingComplete === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Onboarding overlay */}
      {showOnboarding && (
        <WritingOnboarding
          onComplete={() => {
            setShowOnboarding(false)
            setOnboardingComplete(true)
            // Re-check API key
            fetch('/api/settings').then(r => r.json()).then(d => setHasApiKey(!!d.anthropicApiKey)).catch(() => {})
          }}
        />
      )}

      {/* Book selector */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #EEEBE6', background: '#FFFFFF' }}>
        <BookSelector
          books={books}
          selectedBookId={selectedBookId}
          onSelectBook={setSelectedBookId}
          onBookCreated={handleBookCreated}
          onBookRenamed={handleBookRenamed}
        />

        {/* Mobile toggle */}
        <div className="md:hidden ml-auto">
          <button
            onClick={() => setMobileView(mobileView === 'workbook' ? 'chat' : 'workbook')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            {mobileView === 'workbook' ? 'Open AI Chat' : 'Back to Workbook'}
          </button>
        </div>
      </div>

      {/* Split pane — desktop */}
      <div ref={containerRef} className="flex-1 hidden md:flex overflow-hidden" style={{ background: '#FAFAF9' }}>
        {/* Left — Workbook */}
        <div style={{ width: `${splitPos}%` }} className="overflow-hidden flex flex-col" >
          <WorkbookPane
            phase={phase}
            setPhase={setPhase}
            getValue={workbook.getValue}
            setValue={workbook.setValue}
            isSaving={workbook.isSaving}
            isSaved={workbook.isSaved}
            getStyleGuide={workbook.getStyleGuide}
            setStyleGuide={workbook.setStyleGuide}
            getChapterMeta={workbook.getChapterMeta}
            setChapterMeta={workbook.setChapterMeta}
            onSendToChat={onSendToChat}
            globalKillList={globalKillList}
            onUpdateGlobalKillList={updateGlobalKillList}
            bookId={selectedBookId}
            bookTitle={selectedBook?.title ?? ''}
            data={workbook.data}
          />
        </div>

        {/* Divider */}
        <div
          onMouseDown={onMouseDown}
          className="w-[3px] flex-shrink-0 hover:bg-[#E9A020] transition-colors"
          style={{ background: '#EEEBE6', cursor: 'col-resize' }}
        />

        {/* Right — Chat */}
        <div style={{ width: `${100 - splitPos}%` }} className="overflow-hidden flex flex-col bg-white">
          <ChatPane
            bookId={selectedBookId}
            bookTitle={selectedBook?.title ?? ''}
            phase={phase}
            hasApiKey={hasApiKey}
            onReOpenOnboarding={() => setShowOnboarding(true)}
            workbookData={workbook.data}
            getStyleGuide={workbook.getStyleGuide}
            prefillMessage={prefillMessage}
            clearPrefill={() => setPrefillMessage('')}
            onSaveToChapter={onSaveToChapter}
            getChapterCount={getChapterCount}
          />
        </div>
      </div>

      {/* Mobile — stacked */}
      <div className="flex-1 md:hidden overflow-hidden">
        {mobileView === 'workbook' ? (
          <WorkbookPane
            phase={phase}
            setPhase={setPhase}
            getValue={workbook.getValue}
            setValue={workbook.setValue}
            isSaving={workbook.isSaving}
            isSaved={workbook.isSaved}
            getStyleGuide={workbook.getStyleGuide}
            setStyleGuide={workbook.setStyleGuide}
            getChapterMeta={workbook.getChapterMeta}
            setChapterMeta={workbook.setChapterMeta}
            onSendToChat={onSendToChat}
            globalKillList={globalKillList}
            onUpdateGlobalKillList={updateGlobalKillList}
            bookId={selectedBookId}
            bookTitle={selectedBook?.title ?? ''}
            data={workbook.data}
          />
        ) : (
          <ChatPane
            bookId={selectedBookId}
            bookTitle={selectedBook?.title ?? ''}
            phase={phase}
            hasApiKey={hasApiKey}
            onReOpenOnboarding={() => setShowOnboarding(true)}
            workbookData={workbook.data}
            getStyleGuide={workbook.getStyleGuide}
            prefillMessage={prefillMessage}
            clearPrefill={() => setPrefillMessage('')}
            onSaveToChapter={onSaveToChapter}
            getChapterCount={getChapterCount}
          />
        )}
      </div>
    </div>
  )
}
