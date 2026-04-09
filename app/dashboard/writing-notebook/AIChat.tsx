'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, Square, Trash2, Key, BookOpen, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface AIChatProps {
  hasApiKey: boolean
  bookId: string | null
  bookTitle: string
  activePhase: string
  systemPrompt: string
  onReopenOnboarding: (step?: number) => void
  onSaveToChapter: (content: string, chapterIndex: number) => void
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDateDivider(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' })
}

export function AIChat({
  hasApiKey,
  bookId,
  bookTitle,
  activePhase,
  systemPrompt,
  onReopenOnboarding,
  onSaveToChapter,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [chapterBanner, setChapterBanner] = useState<{ content: string; suggestedChapter: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load chat history on mount / book change
  useEffect(() => {
    if (!hasApiKey) return
    const params = new URLSearchParams()
    if (bookId) params.set('bookId', bookId)
    fetch(`/api/writing-notebook/chat/messages?${params}`)
      .then(r => r.json())
      .then(data => {
        setMessages((data.messages || []).map((m: Message) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })))
        setTimeout(scrollToBottom, 100)
      })
      .catch(() => {})
  }, [bookId, hasApiKey])

  useEffect(scrollToBottom, [messages])

  // Save message to DB
  const saveMessage = useCallback(async (role: string, content: string) => {
    await fetch('/api/writing-notebook/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, bookId }),
    }).catch(() => {})
  }, [bookId])

  // Auto-detect chapter pattern
  const detectChapter = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return false
    const words = text.trim().split(/\s+/).length
    if (words < 400) return false
    const first = text.trim().charAt(0)
    if (['?', '-', '*', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(first)) return false
    if (!['writing', 'polish'].includes(activePhase)) return false
    return true
  }, [activePhase])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMsg: Message = { role: 'user', content: input.trim(), createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setChapterBanner(null)

    // Save user message to DB
    await saveMessage('user', userMsg.content)

    setIsStreaming(true)
    const controller = new AbortController()
    abortRef.current = controller

    // Build messages for API (last 20)
    const allMsgs = [...messages, userMsg]
    const recentMsgs = allMsgs.slice(-20).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: recentMsgs, systemPrompt }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.error === 'invalid_key' ? 'Your API key is invalid. Please update it in Settings.'
          : data.error === 'rate_limited' ? 'Rate limited. Please wait a moment and try again.'
          : 'Something went wrong. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, createdAt: new Date().toISOString() }])
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      let assistantText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '', createdAt: new Date().toISOString() }])

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              assistantText += parsed.text
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantText }
                return copy
              })
            }
            if (parsed.error) {
              assistantText += `\n\n[Error: ${parsed.error}]`
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantText }
                return copy
              })
            }
          } catch { /* skip malformed */ }
        }
      }

      // Save assistant message to DB
      if (assistantText) {
        await saveMessage('assistant', assistantText)

        // Auto-detect chapter
        if (detectChapter(assistantText)) {
          // Find highest chapter with content — we can't access workbook directly,
          // so suggest based on message context
          const chMatch = userMsg.content.match(/chapter\s*(\d+)/i)
          const suggestedChapter = chMatch ? parseInt(chMatch[1], 10) - 1 : 0
          setChapterBanner({ content: assistantText, suggestedChapter })
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.', createdAt: new Date().toISOString() }])
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  const handleClear = async () => {
    const params = new URLSearchParams()
    if (bookId) params.set('bookId', bookId)
    await fetch(`/api/writing-notebook/chat/messages?${params}`, { method: 'DELETE' })
    setMessages([])
    setShowClearConfirm(false)
  }

  const handleSaveChapter = (content: string, chapterIndex: number) => {
    onSaveToChapter(content, chapterIndex)
    setChapterBanner(null)
    setToast(`Saved to Ch ${chapterIndex + 1}`)
    setTimeout(() => setToast(null), 2000)
  }

  const quickChips = [
    'Write next chapter',
    'Continue this scene',
    'Fix the pacing',
    'Add more tension',
    'Check continuity',
    'Punch up the dialogue',
  ]

  const handleChip = (chip: string) => {
    if (chip === 'Write next chapter') {
      setInput('Write the next chapter based on the outline. Pick up from where the Story So Far ends.')
    } else {
      setInput(chip)
    }
    inputRef.current?.focus()
  }

  // ── No key state ─────────────────
  if (!hasApiKey) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="p-6 rounded-lg max-w-sm" style={{ background: '#FFF8F0', borderLeft: '4px solid #E9A020' }}>
          <Key size={32} style={{ color: '#E9A020' }} />
          <h3 className="text-[16px] font-semibold mt-3 mb-2" style={{ color: '#1E2D3D' }}>
            Set up your writing assistant
          </h3>
          <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
            The AI uses your own Anthropic account — unlimited chapter generations, no extra cost.
          </p>
          <button
            onClick={() => onReopenOnboarding(2)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer mb-2"
            style={{ background: '#E9A020', color: 'white', border: 'none' }}
          >
            Add my key →
          </button>
          <button
            onClick={() => onReopenOnboarding(3)}
            className="text-[12px] cursor-pointer bg-transparent border-none"
            style={{ color: '#E9A020' }}
          >
            How do I get a key?
          </button>
        </div>
      </div>
    )
  }

  // ── Chat UI ──────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <div>
          <div className="text-[16px] font-semibold" style={{ color: '#1E2D3D' }}>Writing Assistant</div>
          <div className="text-[12px]" style={{ color: '#9CA3AF' }}>
            {bookTitle || 'No book selected'} &middot; {activePhase} phase
          </div>
        </div>
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-lg cursor-pointer bg-transparent border-none"
            style={{ color: '#9CA3AF' }}
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: '#F97B6B' }}>Clear conversation?</span>
            <button
              onClick={handleClear}
              className="px-2 py-1 rounded text-[11px] font-semibold cursor-pointer"
              style={{ background: '#E9A020', color: 'white', border: 'none' }}
            >
              Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="text-[11px] cursor-pointer bg-transparent border-none"
              style={{ color: '#9CA3AF' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => {
          // Date divider
          const showDivider = i === 0 || (
            msg.createdAt && messages[i - 1]?.createdAt &&
            new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt!).toDateString()
          )

          return (
            <div key={i}>
              {showDivider && msg.createdAt && (
                <div className="text-center text-[11px] py-2" style={{ color: '#9CA3AF' }}>
                  {formatDateDivider(msg.createdAt)}
                </div>
              )}
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="px-4 py-3 rounded-2xl max-w-[85%] text-[14px] relative group"
                  style={{
                    background: msg.role === 'user' ? '#E9A020' : 'white',
                    color: msg.role === 'user' ? 'white' : '#1E2D3D',
                    borderLeft: msg.role === 'assistant' ? '4px solid #E9A020' : undefined,
                    border: msg.role === 'assistant' ? '0.5px solid #E5E7EB' : undefined,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                  {msg.role === 'assistant' && i === messages.length - 1 && isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 animate-pulse" style={{ background: '#E9A020' }} />
                  )}
                  {msg.createdAt && (
                    <span className="absolute -bottom-4 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#9CA3AF', [msg.role === 'user' ? 'right' : 'left']: 0 }}>
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
              {/* Save to Workbook button for long assistant messages */}
              {msg.role === 'assistant' && !isStreaming && msg.content.split(/\s+/).length > 300 && (
                <div className="flex justify-start mt-1 ml-1">
                  <button
                    onClick={() => {
                      // Show chapter selection — simple: save to suggested chapter
                      const chMatch = messages.slice(0, i).reverse().find(m => m.role === 'user')?.content.match(/chapter\s*(\d+)/i)
                      const ch = chMatch ? parseInt(chMatch[1], 10) - 1 : 0
                      handleSaveChapter(msg.content, ch)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
                    style={{ background: 'transparent', border: '1px solid #E9A020', color: '#E9A020' }}
                  >
                    <BookOpen size={12} /> Save to Workbook
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chapter save banner */}
      {chapterBanner && !isStreaming && (
        <div className="flex items-center gap-3 px-4 py-3 mx-4 mb-2 rounded-lg" style={{ background: '#FFF8F0', border: '0.5px solid #E5E7EB' }}>
          <BookOpen size={16} style={{ color: '#E9A020' }} />
          <span className="text-[13px] flex-1" style={{ color: '#1E2D3D' }}>This looks like a full chapter.</span>
          <button
            onClick={() => handleSaveChapter(chapterBanner.content, chapterBanner.suggestedChapter)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
            style={{ background: '#E9A020', color: 'white', border: 'none' }}
          >
            Save to Ch {chapterBanner.suggestedChapter + 1} →
          </button>
          <button
            onClick={() => setChapterBanner(null)}
            className="cursor-pointer bg-transparent border-none"
            style={{ color: '#9CA3AF' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Quick chips */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {quickChips.map(chip => (
          <button
            key={chip}
            onClick={() => handleChip(chip)}
            className="px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap cursor-pointer flex-shrink-0 transition-colors"
            style={{ border: '1px solid #1E2D3D', background: 'transparent', color: '#1E2D3D' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E9A020'; e.currentTarget.style.color = 'white'; e.currentTarget.style.border = '1px solid #E9A020' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1E2D3D'; e.currentTarget.style.border = '1px solid #1E2D3D' }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3" style={{ borderTop: '1px solid #E5E7EB' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            if (e.target.value && chapterBanner) setChapterBanner(null)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Ask me to write a chapter, continue a scene, fix the pacing..."
          rows={1}
          className="flex-1 px-4 py-3 rounded-lg text-[14px] outline-none resize-none"
          style={{
            border: '1px solid #E5E7EB',
            color: '#1E2D3D',
            maxHeight: 120,
            lineHeight: 1.5,
          }}
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={handleStop}
            className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: '#F97B6B', color: 'white', border: 'none' }}
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{
              background: input.trim() ? '#E9A020' : '#E5E7EB',
              color: 'white',
              border: 'none',
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[13px] font-semibold z-50"
          style={{ background: '#6EBF8B', color: 'white' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
