'use client'
// components/writing-notebook/AIChatPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Save, Loader2 } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  bookTitle: string
  activePhase: string
  activeSection: string
  activeChapterIndex: number | null
  onSaveToWorkbook: (content: string, chapterIndex: number, chapterTitle?: string) => Promise<void>
}

const QUICK_CHIPS = [
  'Write the next chapter',
  'Help me brainstorm a plot twist',
  'Describe this scene with more detail',
  'Fix the pacing in this section',
  'Write dialogue for this scene',
]

export function AIChatPanel({
  isOpen, onClose, bookId, bookTitle, activePhase, activeSection,
  activeChapterIndex, onSaveToWorkbook,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || isStreaming) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsStreaming(true)

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          messages: newMessages,
          phase: activePhase,
          section: activeSection,
        }),
      })

      if (!res.ok) {
        setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
        setIsStreaming(false)
        return
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages([...newMessages, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Parse SSE events
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('event: content_block_delta')) continue
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  assistantContent += data.delta.text
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                    return updated
                  })
                }
              } catch {
                // Skip non-JSON lines
              }
            }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, bookId, activePhase, activeSection])

  const handleSaveToWorkbook = useCallback(async (msgIndex: number) => {
    const msg = messages[msgIndex]
    if (!msg || msg.role !== 'assistant') return
    setSavingIndex(msgIndex)
    const nextChapter = activeChapterIndex ?? 1
    await onSaveToWorkbook(msg.content, nextChapter)
    setSavingIndex(null)
  }, [messages, activeChapterIndex, onSaveToWorkbook])

  return (
    <div
      className="fixed top-12 right-0 bottom-0 flex flex-col z-50 transition-transform duration-300 ease-in-out"
      style={{
        width: 420,
        background: '#FFFFFF',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
        transform: isOpen ? 'translateX(0)' : 'translateX(420px)',
      }}
    >
      {/* Header */}
      <div
        className="h-12 flex items-center px-4 shrink-0"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <div className="flex-1">
          <p className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Writing Assistant</p>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            {bookTitle} &middot; {activePhase} phase
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" style={{ color: '#9CA3AF' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm font-medium mb-3" style={{ color: '#1E2D3D' }}>
              How can I help with your story?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors hover:opacity-80"
                  style={{ border: '1px solid #E9A020', color: '#E9A020' }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              style={{
                background: msg.role === 'user' ? '#1E2D3D' : '#F9FAFB',
                color: msg.role === 'user' ? '#FFFFFF' : '#1E2D3D',
                border: msg.role === 'assistant' ? '0.5px solid #E5E7EB' : undefined,
                lineHeight: '1.6',
              }}
            >
              {msg.content || (isStreaming && i === messages.length - 1 ? (
                <span className="flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={12} className="animate-spin" /> Writing...
                </span>
              ) : null)}

              {/* Save to workbook button for assistant messages */}
              {msg.role === 'assistant' && msg.content && !isStreaming && (
                <button
                  onClick={() => handleSaveToWorkbook(i)}
                  disabled={savingIndex === i}
                  className="flex items-center gap-1 mt-2 text-xs font-medium hover:underline transition-opacity"
                  style={{ color: '#E9A020' }}
                >
                  {savingIndex === i ? (
                    <><Loader2 size={12} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={12} /> Save to Workbook</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask anything about your story..."
            className="flex-1 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
            style={{ border: '0.5px solid #E5E7EB', maxHeight: 120, color: '#1E2D3D' }}
            rows={2}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="self-end p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: '#E9A020', color: '#FFFFFF' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
