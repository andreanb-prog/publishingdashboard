'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { WritingOnboarding } from './WritingOnboarding'
import { useWorkbook, type Phase } from './useWorkbook'
import { WritingTopBar } from './components/WritingTopBar'
import { WritingSidebar, type SidebarSection } from './components/WritingSidebar'
import { WritingAIPanel } from './components/WritingAIPanel'
import { WritingEditor } from './components/WritingEditor'
import { Toast } from './components/Toast'

interface BookOption {
  id: string
  title: string
  sortOrder?: number
}

// Section label/placeholder map
const SECTION_META: Record<string, { label: string; placeholder: string }> = {
  storyOutline:     { label: 'Story Outline', placeholder: 'Outline your story chapter by chapter...' },
  styleGuide:       { label: 'Style Guide', placeholder: 'Document your writing style preferences, POV, tense, tropes...' },
  killList:         { label: 'Kill List', placeholder: 'Words and phrases to avoid in your writing...' },
  seriesBible:      { label: 'Series Bible', placeholder: 'Document your series world, timeline, recurring characters...' },
  storySoFar:       { label: 'Story So Far', placeholder: 'Running summary of your story will appear here...' },
  consistencyCheck: { label: 'Consistency Check', placeholder: 'Paste your consistency notes or AI feedback here...' },
  vellumExport:     { label: 'Vellum Export', placeholder: 'Export notes and settings for Vellum formatting...' },
}

function sectionToPhaseSection(s: SidebarSection): { phase: string; section: string; chapterIndex?: number } {
  if (typeof s === 'object' && 'type' in s && s.type === 'chapter') {
    return { phase: 'writing', section: 'chapter', chapterIndex: s.index }
  }
  switch (s) {
    case 'storyOutline':     return { phase: 'setup', section: 'storyOutline' }
    case 'styleGuide':       return { phase: 'setup', section: 'styleGuide' }
    case 'killList':         return { phase: 'setup', section: 'killList' }
    case 'seriesBible':      return { phase: 'setup', section: 'characterBible' }
    case 'storySoFar':       return { phase: 'writing', section: 'storySoFar' }
    case 'consistencyCheck': return { phase: 'edit', section: 'diagnose' }
    case 'vellumExport':     return { phase: 'polish', section: 'verify' }
    default:                 return { phase: 'setup', section: 'storyOutline' }
  }
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
  const [activeSection, setActiveSection] = useState<SidebarSection>('storyOutline')
  const [wordCount, setWordCount] = useState(0)

  // Save status
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  // Story So Far status
  const [storySoFarStatus, setStorySoFarStatus] = useState<'up_to_date' | 'updating' | 'idle'>('idle')
  const [toastVisible, setToastVisible] = useState(false)

  // Idle timer for Story So Far
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevSectionRef = useRef<SidebarSection>(activeSection)

  const workbook = useWorkbook(selectedBookId)
  const selectedBook = books.find(b => b.id === selectedBookId)

  // Load user state
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
        const bks = (d.books ?? d.data ?? []).map((b: any) => ({ id: b.id, title: b.title, sortOrder: b.sortOrder }))
        setBooks(bks)
        if (!selectedBookId && bks.length > 0) setSelectedBookId(bks[0].id)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedBookId) localStorage.setItem('wn_selected_book', selectedBookId)
  }, [selectedBookId])

  // Chapter meta
  const chapterMeta = workbook.getChapterMeta('writing')

  // Derive chapter info for sidebar
  const chapters = Array.from({ length: chapterMeta.count }, (_, i) => {
    const content = workbook.getValue('writing', 'chapter', i)
    const title = chapterMeta.titles[i] || ''
    const status = !content ? 'Empty' as const : 'Draft' as const
    return { index: i, title, status }
  })

  // Chapter/word counts for dropdown
  const chapterCounts: Record<string, number> = {}
  const wordCounts: Record<string, number> = {}
  if (selectedBookId) {
    chapterCounts[selectedBookId] = chapterMeta.count
    // Count words across all chapters
    let totalWords = 0
    for (let i = 0; i < chapterMeta.count; i++) {
      const c = workbook.getValue('writing', 'chapter', i)
      if (c) totalWords += c.trim().split(/\s+/).length
    }
    wordCounts[selectedBookId] = totalWords
  }

  // Current section content
  const ps = sectionToPhaseSection(activeSection)
  const currentContent = workbook.getValue(ps.phase, ps.section, ps.chapterIndex)
  const currentTitle = ps.chapterIndex != null ? (chapterMeta.titles[ps.chapterIndex] || '') : ''
  const currentStatus = ps.chapterIndex != null
    ? (!currentContent ? 'Empty' : 'Draft')
    : ''

  // Wire save state from workbook
  useEffect(() => {
    const anySaving = Object.values(workbook.data).length > 0 &&
      (workbook.isSaving(ps.phase, ps.section, ps.chapterIndex))
    if (anySaving) {
      setSaveState('saving')
    }
  }, [workbook, ps])

  // Content change handler
  const handleContentChange = useCallback((content: string) => {
    workbook.setValue(ps.phase, ps.section, content, ps.chapterIndex)
    setSaveState('saving')

    // Reset idle timer for Story So Far
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      triggerStorySoFar()
    }, 60000) // 60s idle

    // Auto-save status update (debounce mirrors useWorkbook's 1200ms)
    setTimeout(() => {
      setSaveState('saved')
      setLastSavedAt(Date.now())
    }, 1400)
  }, [workbook, ps]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = useCallback((title: string) => {
    if (ps.chapterIndex == null) return
    const meta = workbook.getChapterMeta('writing')
    const titles = [...meta.titles]
    titles[ps.chapterIndex] = title
    workbook.setChapterMeta('writing', { ...meta, titles })
  }, [workbook, ps.chapterIndex])

  const handleAddChapter = useCallback(() => {
    const meta = workbook.getChapterMeta('writing')
    workbook.setChapterMeta('writing', { count: meta.count + 1, titles: [...meta.titles, ''] })
    setActiveSection({ type: 'chapter', index: meta.count })
  }, [workbook])

  const handleAddBook = useCallback(async () => {
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Book' }),
      })
      const data = await res.json()
      if (data.book) {
        setBooks(prev => [...prev, { id: data.book.id, title: data.book.title }])
        setSelectedBookId(data.book.id)
      }
    } catch {}
  }, [])

  // Trigger Story So Far update
  const triggerStorySoFar = useCallback(async () => {
    if (!selectedBookId) return
    const meta = workbook.getChapterMeta('writing')
    const chaptersToSend = []
    for (let i = 0; i < meta.count; i++) {
      const content = workbook.getValue('writing', 'chapter', i)
      if (content?.trim()) {
        chaptersToSend.push({
          title: meta.titles[i] || `Chapter ${i + 1}`,
          content,
          order: i,
        })
      }
    }
    if (chaptersToSend.length === 0) return

    setStorySoFarStatus('updating')
    try {
      const res = await fetch('/api/writing-notebook/story-so-far', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBookId, chapters: chaptersToSend }),
      })
      if (res.ok) {
        const { summary } = await res.json()
        // Also update the local workbook data
        workbook.setValue('writing', 'storySoFar', summary)
        setStorySoFarStatus('up_to_date')
        setToastVisible(true)
      } else {
        setStorySoFarStatus('idle')
      }
    } catch {
      setStorySoFarStatus('idle')
    }
  }, [selectedBookId, workbook])

  // Trigger Story So Far on section change (leaving a chapter)
  useEffect(() => {
    const prev = prevSectionRef.current
    prevSectionRef.current = activeSection
    if (typeof prev === 'object' && 'type' in prev && prev.type === 'chapter') {
      // Left a chapter — trigger update
      triggerStorySoFar()
    }
  }, [activeSection, triggerStorySoFar])

  const handleExport = useCallback(async () => {
    if (!selectedBookId) return
    try {
      const res = await fetch('/api/writing-notebook/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedBookId, type: 'manuscript', format: 'text', source: 'drafts' }),
      })
      const data = await res.json()
      if (data.text) {
        navigator.clipboard.writeText(data.text)
      }
    } catch {}
  }, [selectedBookId])

  const sectionMeta = typeof activeSection === 'string'
    ? SECTION_META[activeSection] || { label: activeSection, placeholder: '' }
    : { label: `Chapter ${(activeSection as any).index + 1}`, placeholder: 'Start writing...' }

  if (onboardingComplete === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
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
      <WritingTopBar
        books={books}
        selectedBookId={selectedBookId}
        onSelectBook={setSelectedBookId}
        onAddBook={handleAddBook}
        onAddChapter={handleAddChapter}
        onExport={handleExport}
        wordCount={wordCount}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        chapterCounts={chapterCounts}
        wordCounts={wordCounts}
      />

      {/* Main area: sidebar + center */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <WritingSidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          chapters={chapters}
          onAddChapter={handleAddChapter}
          storySoFarStatus={storySoFarStatus}
        />

        {/* Center column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* AI Panel */}
          <WritingAIPanel
            bookId={selectedBookId}
            bookTitle={selectedBook?.title ?? ''}
            phase="writing"
            hasApiKey={hasApiKey}
            workbookData={workbook.data}
            getStyleGuide={workbook.getStyleGuide}
            activeChapterContent={currentContent}
          />

          {/* Editor */}
          <WritingEditor
            section={activeSection}
            chapterIndex={ps.chapterIndex ?? null}
            chapterTitle={currentTitle}
            chapterStatus={currentStatus}
            content={currentContent}
            onContentChange={handleContentChange}
            onTitleChange={handleTitleChange}
            onWordCountChange={setWordCount}
            sectionLabel={sectionMeta.label}
            sectionPlaceholder={sectionMeta.placeholder}
          />
        </div>
      </div>

      {/* Toast */}
      <Toast
        message="Story So Far updated"
        dotColor="#8B5CF6"
        visible={toastVisible}
        onDone={() => setToastVisible(false)}
      />
    </div>
  )
}
