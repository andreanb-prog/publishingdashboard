'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { OnboardingFlow } from './OnboardingFlow'
import { Workbook } from './Workbook'
import { AIChat } from './AIChat'
import { useWorkbook } from './useWorkbook'
import { ChevronDown, MessageSquare, BookOpen } from 'lucide-react'

interface Book {
  id: string
  title: string
  genre?: string
  subgenre?: string
}

interface UserData {
  writingOnboardingComplete: boolean
  anthropicApiKey: string | null
  bookCatalog: Book[]
}

const LS_BOOK = 'wn_selected_book'
const LS_SPLIT = 'wn_split_pos'

export default function WritingNotebookPage() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStart, setOnboardingStart] = useState<number | undefined>()
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [splitPos, setSplitPos] = useState(60) // percentage for left pane
  const [activePhase, setActivePhase] = useState('setup')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [showBookDropdown, setShowBookDropdown] = useState(false)
  const dividerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const wb = useWorkbook(selectedBookId)

  // Load user data
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setUserData({
          writingOnboardingComplete: data.writingOnboardingComplete ?? false,
          anthropicApiKey: data.anthropicApiKey ?? null,
          bookCatalog: data.bookCatalog ?? [],
        })
        if (!data.writingOnboardingComplete) setShowOnboarding(true)
      })
      .catch(() => {})
  }, [])

  // Restore selected book from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_BOOK)
    if (saved) setSelectedBookId(saved)
  }, [])

  // Restore split position
  useEffect(() => {
    const saved = localStorage.getItem(LS_SPLIT)
    if (saved) setSplitPos(parseFloat(saved))
  }, [])

  const handleBookChange = (id: string) => {
    setSelectedBookId(id)
    localStorage.setItem(LS_BOOK, id)
    setShowBookDropdown(false)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setUserData(prev => prev ? { ...prev, writingOnboardingComplete: true } : prev)
  }

  const handleReopenOnboarding = (step?: number) => {
    setOnboardingStart(step)
    setShowOnboarding(true)
  }

  // Draggable divider
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startSplit = splitPos

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const delta = e.clientX - startX
      const deltaPercent = (delta / rect.width) * 100
      const newSplit = Math.min(80, Math.max(30, startSplit + deltaPercent))
      setSplitPos(newSplit)
      localStorage.setItem(LS_SPLIT, String(newSplit))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [splitPos])

  // Build system prompt
  const selectedBook = userData?.bookCatalog.find(b => b.id === selectedBookId)
  const systemPrompt = useMemo(() => {
    const sg = (() => {
      try { return JSON.parse(wb.getValue('setup', 'styleGuide') || '{}') }
      catch { return {} }
    })()

    return `You are a fiction writing assistant helping the author write ${selectedBook?.title || 'their book'}.

STORY SPECIFICATIONS:
- Genre: ${sg.niche || 'Not specified'}
- POV: ${sg.pov || 'Not specified'}
- Tense: ${sg.tense || 'Not specified'}
- Target: ${sg.totalWordCount || 'Not specified'} words total, ${sg.chapterWordCount || 'Not specified'} words per chapter
- Tropes: ${sg.tropes || 'Not specified'}

STORY OUTLINE:
${(wb.getValue('setup', 'outline') || 'Not filled in yet.').slice(0, 2000)}

CHARACTER BIBLE:
${(wb.getValue('setup', 'characterBible') || 'Not filled in yet.').slice(0, 1500)}

WRITING STYLE:
${sg.personalStyle || 'No personal style preferences set.'}

STORY SO FAR:
${(wb.getValue('writing', 'storySoFar') || 'Not started yet.').slice(0, 1500)}

WRITING FORMULA:
- Hook readers in the first paragraph, start in the middle of the action
- Introduce key tropes within the first 500 words
- Every chapter ends with a cliffhanger or hook
- Short sentences and paragraphs (1-3 sentences max)
- Show don't tell
- Minimize dialogue tags
- Balance dialogue, action, and internal thought

CHICAGO STYLE REMINDERS:
- Use serial (Oxford) comma
- Dialogue punctuation inside quotes: "Like this," she said.
- Em dashes without spaces—like this
- Spell out numbers under one hundred in narrative

CALENDAR DATE RULE:
NEVER use a specific calendar date, month, or day of the week as atmospheric filler.
Calendar anchors are PLOT FACTS. For atmosphere use time of day instead.
If a calendar anchor is genuinely needed, flag it: [TIMELINE ANCHOR: Friday, November]

CURRENT PHASE: ${activePhase}

When writing a chapter, respond with ONLY the chapter prose — no preamble, no notes, no "Here is Chapter X:". Just the story, ready to use. Target ${sg.chapterWordCount || '1500-2000'} words. Always end with a hook or cliffhanger.`
  }, [selectedBook, wb, activePhase])

  // Handle save to chapter from chat
  const handleSaveToChapter = useCallback((content: string, chapterIndex: number) => {
    wb.setValue('writing', 'drafts', chapterIndex, content)
    setActivePhase('writing')
  }, [wb])

  // Handle send to chat from workbook
  const handleSendToChat = useCallback((text: string) => {
    // We can't directly set the chat input from here, so we'll use a ref pattern
    // For now, switch to chat on mobile
    setShowMobileChat(true)
  }, [])

  if (!session) return null

  // Loading state
  if (!userData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 rounded-full" style={{ border: '3px solid #E5E7EB', borderTopColor: '#E9A020' }} />
      </div>
    )
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: 'white' }}>
        <OnboardingFlow onComplete={handleOnboardingComplete} startStep={onboardingStart} />
      </div>
    )
  }

  // Main workspace
  return (
    <div className="flex flex-col h-full" style={{ background: 'white' }}>
      {/* Book selector */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="relative">
          <button
            onClick={() => setShowBookDropdown(!showBookDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-semibold cursor-pointer"
            style={{ background: '#FFF8F0', color: '#1E2D3D', border: '0.5px solid #E5E7EB' }}
          >
            <BookOpen size={14} style={{ color: '#E9A020' }} />
            {selectedBook?.title || 'Select a book'}
            <ChevronDown size={14} style={{ color: '#9CA3AF' }} />
          </button>
          {showBookDropdown && (
            <div
              className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
              style={{ background: 'white', border: '1px solid #E5E7EB' }}
            >
              {(userData.bookCatalog || []).map(book => (
                <button
                  key={book.id}
                  onClick={() => handleBookChange(book.id)}
                  className="w-full text-left px-4 py-2.5 text-[13px] cursor-pointer bg-transparent border-none hover:bg-gray-50 transition-colors"
                  style={{ color: '#1E2D3D' }}
                >
                  {book.title}
                </button>
              ))}
              {(!userData.bookCatalog || userData.bookCatalog.length === 0) && (
                <div className="px-4 py-3 text-[13px]" style={{ color: '#9CA3AF' }}>
                  No books yet. Add one in Settings.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop split pane */}
      <div ref={containerRef} className="flex-1 hidden md:flex overflow-hidden relative">
        {/* Left pane — Workbook */}
        <div style={{ width: `${splitPos}%` }} className="overflow-y-auto">
          <Workbook
            getValue={wb.getValue}
            setValue={wb.setValue}
            getSaveState={wb.getSaveState}
            onSendToChat={handleSendToChat}
            activePhase={activePhase}
            setActivePhase={setActivePhase}
          />
        </div>

        {/* Divider */}
        <div
          ref={dividerRef}
          className="w-[3px] flex-shrink-0 hover:w-[5px] transition-all"
          style={{ background: '#1E2D3D', cursor: 'col-resize', opacity: 0.2 }}
          onMouseDown={handleDividerMouseDown}
        />

        {/* Right pane — AI Chat */}
        <div style={{ width: `${100 - splitPos}%` }} className="overflow-hidden">
          <AIChat
            hasApiKey={!!userData.anthropicApiKey}
            bookId={selectedBookId}
            bookTitle={selectedBook?.title || ''}
            activePhase={activePhase}
            systemPrompt={systemPrompt}
            onReopenOnboarding={handleReopenOnboarding}
            onSaveToChapter={handleSaveToChapter}
          />
        </div>
      </div>

      {/* Mobile stacked view */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        {!showMobileChat ? (
          <div className="flex-1 overflow-y-auto">
            <Workbook
              getValue={wb.getValue}
              setValue={wb.setValue}
              getSaveState={wb.getSaveState}
              onSendToChat={handleSendToChat}
              activePhase={activePhase}
              setActivePhase={setActivePhase}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <AIChat
              hasApiKey={!!userData.anthropicApiKey}
              bookId={selectedBookId}
              bookTitle={selectedBook?.title || ''}
              activePhase={activePhase}
              systemPrompt={systemPrompt}
              onReopenOnboarding={handleReopenOnboarding}
              onSaveToChapter={handleSaveToChapter}
            />
          </div>
        )}

        {/* Mobile toggle */}
        <button
          onClick={() => setShowMobileChat(!showMobileChat)}
          className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold cursor-pointer"
          style={{ background: '#E9A020', color: 'white', border: 'none' }}
        >
          {showMobileChat ? (
            <><BookOpen size={14} /> Switch to Workbook</>
          ) : (
            <><MessageSquare size={14} /> Switch to AI Chat</>
          )}
        </button>
      </div>
    </div>
  )
}
