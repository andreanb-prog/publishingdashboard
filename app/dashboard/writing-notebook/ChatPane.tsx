'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Lock, Trash2, ArrowRight, Square, BookOpen, Sparkles } from 'lucide-react'
import type { Phase, StyleGuide, WorkbookData } from './useWorkbook'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface Props {
  bookId: string | null
  bookTitle: string
  phase: Phase
  hasApiKey: boolean
  onReOpenOnboarding: () => void
  workbookData: WorkbookData
  getStyleGuide: () => StyleGuide
  prefillMessage: string
  clearPrefill: () => void
  onSaveToChapter?: (content: string, chapter: number) => void
  getChapterCount: () => number
}

const QUICK_CHIPS = [
  'Write next chapter',
  'Continue this scene',
  'Fix the pacing',
  'Add more tension',
  'Check continuity',
  'Punch up the dialogue',
]

export function ChatPane(props: Props) {
  const {
    bookId, bookTitle, phase, hasApiKey, onReOpenOnboarding,
    workbookData, getStyleGuide, prefillMessage, clearPrefill,
    onSaveToChapter, getChapterCount,
  } = props

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [chapterBanner, setChapterBanner] = useState<string | null>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history
  useEffect(() => {
    if (!bookId) { setMessages([]); return }
    fetch(`/api/writing-notebook/chat?bookId=${bookId}`)
      .then(r => r.json())
      .then(d => setMessages(d.data ?? []))
      .catch(() => {})
  }, [bookId])

  // Scroll to bottom
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  // Handle prefill
  useEffect(() => {
    if (prefillMessage) {
      setInput(prefillMessage)
      clearPrefill()
      textareaRef.current?.focus()
    }
  }, [prefillMessage, clearPrefill])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || streaming) return
    setInput('')

    // Save user message to DB
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    fetch('/api/writing-notebook/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: msg, bookId }),
    }).catch(() => {})

    // Stream response
    setStreaming(true)
    setStreamContent('')
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookTitle,
          message: msg,
          activePhase: phase,
          workbookData,
          styleGuide: getStyleGuide(),
        }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const errMsg = err.error === 'no_api_key'
          ? 'No API key found. Please add your Anthropic key in the onboarding flow.'
          : err.error === 'invalid_key'
          ? 'Your API key is invalid. Please update it in Settings.'
          : err.error === 'rate_limited'
          ? 'Rate limited. Please wait a moment and try again.'
          : err.error === 'server_error'
          ? 'Server error — try again in a few seconds.'
          : res.status === 401
          ? 'Session expired — please refresh the page.'
          : `Something went wrong (${err.error || res.status}). Please try again.`
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: errMsg, createdAt: new Date().toISOString() }])
        setStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamContent(full)
      }

      // Check for error markers
      if (full.includes('[ERROR:invalid_key]')) {
        full = full.replace('[ERROR:invalid_key]', '').trim()
        full += '\n\nYour API key appears to be invalid. Please update it in Settings.'
      } else if (full.includes('[ERROR:rate_limited]')) {
        full = full.replace('[ERROR:rate_limited]', '').trim()
        full += '\n\nRate limited. Please wait a moment and try again.'
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: full,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamContent('')

      // Save assistant message to DB
      fetch('/api/writing-notebook/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: full, bookId }),
      }).catch(() => {})

      // Auto-detect chapter banner
      const wordCount = full.trim().split(/\s+/).length
      const startsLikeProse = !full.trim().startsWith('?') && !full.trim().startsWith('-') && !full.trim().match(/^\d/)
      if (wordCount > 400 && startsLikeProse && (phase === 'writing' || phase === 'polish')) {
        setChapterBanner(full)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: 'assistant',
          content: 'Connection error. Please try again.',
          createdAt: new Date().toISOString(),
        }])
      }
    }
    setStreaming(false)
  }, [input, streaming, bookId, bookTitle, phase, workbookData, getStyleGuide])

  const stopStreaming = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const clearChat = async () => {
    await fetch(`/api/writing-notebook/chat?bookId=${bookId}`, { method: 'DELETE' })
    setMessages([])
    setShowClearConfirm(false)
  }

  const handleChipClick = (chip: string) => {
    if (chip === 'Write next chapter') {
      const n = getChapterCount() + 1
      sendMessage(`Write Chapter ${n} based on the outline. Pick up from where the Story So Far ends.`)
    } else {
      sendMessage(chip)
    }
  }

  // No API key gate
  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-start justify-center h-full p-6">
        <div className="p-5 rounded-lg" style={{ background: '#FFF8F0', borderLeft: '4px solid #E9A020' }}>
          <Lock size={32} style={{ color: '#E9A020' }} className="mb-3" />
          <h3 className="text-base font-bold mb-1" style={{ color: '#1E2D3D' }}>Set up your writing assistant</h3>
          <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
            The AI uses your own Anthropic account — unlimited generations, no extra cost.
          </p>
          <button
            onClick={onReOpenOnboarding}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            Add my key
          </button>
          <button
            onClick={onReOpenOnboarding}
            className="block mt-2 text-xs bg-transparent border-none cursor-pointer"
            style={{ color: '#E9A020' }}
          >
            How do I get a key?
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #EEEBE6' }}>
        <div>
          <div className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Writing Assistant</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>
            {bookTitle || 'No book selected'} · {phase} phase
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 rounded bg-transparent border-none cursor-pointer"
            style={{ color: '#9CA3AF' }}
            title="Clear conversation"
          >
            <Trash2 size={16} />
          </button>
          {showClearConfirm && (
            <div className="absolute right-0 top-8 p-3 rounded-lg shadow-lg z-10 w-52" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-xs mb-2" style={{ color: '#1E2D3D' }}>Clear conversation? This can't be undone.</p>
              <div className="flex gap-2">
                <button onClick={clearChat} className="px-3 py-1 rounded text-xs font-semibold border-none cursor-pointer" style={{ background: '#E9A020', color: '#FFFFFF' }}>Clear</button>
                <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1 rounded text-xs font-medium bg-transparent border-none cursor-pointer" style={{ color: '#9CA3AF' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} onSaveToChapter={onSaveToChapter} getChapterCount={getChapterCount} />
        ))}
        {streaming && streamContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm" style={{ background: '#FFFFFF', borderLeft: '4px solid #E9A020', color: '#1E2D3D' }}>
              <div className="wn-prose">
                <ReactMarkdown>{streamContent}</ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 ml-1 animate-pulse rounded-sm" style={{ background: '#E9A020' }} />
            </div>
          </div>
        )}

        {/* Chapter banner */}
        {chapterBanner && !streaming && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#FFF8F0', border: '1px solid #E5E7EB' }}>
            <BookOpen size={16} style={{ color: '#E9A020' }} />
            <span className="text-xs flex-1" style={{ color: '#1E2D3D' }}>This looks like a full chapter.</span>
            <button
              onClick={() => {
                if (onSaveToChapter) onSaveToChapter(chapterBanner, getChapterCount())
                setChapterBanner(null)
              }}
              className="px-3 py-1 rounded-lg text-xs font-semibold border-none cursor-pointer"
              style={{ background: '#E9A020', color: '#FFFFFF' }}
            >
              Save to Ch {getChapterCount() + 1}
            </button>
            <button
              onClick={() => setChapterBanner(null)}
              className="text-xs bg-transparent border-none cursor-pointer"
              style={{ color: '#9CA3AF' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      {/* Quick chips */}
      {!streaming && messages.length === 0 && (
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 bg-transparent cursor-pointer"
              style={{ color: '#1E2D3D', border: '1.5px solid #1E2D3D' }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #EEEBE6' }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              setChapterBanner(null)
              // Auto-resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask me to write a chapter, continue a scene..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ borderColor: '#E5E7EB', maxHeight: 120, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="w-9 h-9 rounded-lg flex items-center justify-center border-none cursor-pointer flex-shrink-0"
              style={{ background: '#F97B6B', color: '#FFFFFF' }}
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center border-none cursor-pointer flex-shrink-0 transition-opacity"
              style={{ background: '#E9A020', color: '#FFFFFF', opacity: input.trim() ? 1 : 0.4 }}
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, onSaveToChapter, getChapterCount }: {
  message: Message
  onSaveToChapter?: (content: string, chapter: number) => void
  getChapterCount: () => number
}) {
  const [showSaveMenu, setShowSaveMenu] = useState(false)
  const isUser = message.role === 'user'
  const wordCount = message.content.trim().split(/\s+/).length
  const showSaveButton = !isUser && wordCount > 300

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="relative max-w-[85%]">
        <div
          className="px-4 py-3 rounded-2xl text-sm"
          style={{
            background: isUser ? '#E9A020' : '#FFFFFF',
            color: isUser ? '#FFFFFF' : '#1E2D3D',
            borderLeft: isUser ? 'none' : '4px solid #E9A020',
          }}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <div className="wn-prose">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {showSaveButton && onSaveToChapter && (
          <div className="mt-1 relative">
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="text-[11px] font-medium bg-transparent border-none cursor-pointer"
              style={{ color: '#E9A020' }}
            >
              Save to Workbook
            </button>
            {showSaveMenu && (
              <div className="absolute left-0 bottom-6 p-2 rounded-lg shadow-lg z-10" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <p className="text-[11px] font-medium mb-1.5 px-1" style={{ color: '#6B7280' }}>Which chapter?</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: getChapterCount() + 1 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        onSaveToChapter(message.content, i)
                        setShowSaveMenu(false)
                      }}
                      className="px-2 py-1 rounded text-[11px] font-medium border-none cursor-pointer"
                      style={{ background: '#FFF4E0', color: '#E9A020' }}
                    >
                      {i < getChapterCount() ? `Ch ${i + 1}` : 'New Chapter'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
