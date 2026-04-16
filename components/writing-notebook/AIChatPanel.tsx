'use client'
// components/writing-notebook/AIChatPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Save, Loader2, AlertTriangle } from 'lucide-react'
import type { WorkbookData, StyleGuide } from '@/app/dashboard/writing-notebook/useWorkbook'

type Message = { role: 'user' | 'assistant'; content: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  bookId: string
  bookTitle: string
  activePhase: string
  workbookData: WorkbookData
  styleGuide: StyleGuide
  hasApiKey: boolean
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
  isOpen, onClose, bookId, bookTitle, activePhase,
  workbookData, styleGuide, hasApiKey, onSaveToWorkbook,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history on open
  useEffect(() => {
    if (isOpen && bookId) {
      fetch(`/api/writing-notebook/chat?bookId=${bookId}`)
        .then(r => r.json())
        .then(d => {
          const msgs = (d.data ?? []).map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
          setMessages(msgs)
        })
        .catch(() => {})
    }
  }, [isOpen, bookId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Focus input
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  // Persist a message
  const persistMessage = useCallback(async (role: string, content: string) => {
    await fetch('/api/writing-notebook/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, bookId }),
    }).catch(() => {})
  }, [bookId])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || isStreaming) return
    if (!hasApiKey) { setError('Add your Anthropic API key in Settings to use the writing assistant.'); return }
    setInput('')
    setError('')

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsStreaming(true)

    // Persist user message
    await persistMessage('user', msg)

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookTitle,
          message: msg,
          activePhase,
          workbookData,
          styleGuide,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[AIChatPanel] POST failed', { status: res.status, error: data.error, data })
        if (data.error === 'no_api_key') setError('Add your Anthropic API key in Settings.')
        else if (data.error === 'invalid_key') setError('Your API key is invalid. Update it in Settings.')
        else if (data.error === 'rate_limited') setError('Rate limited — wait a moment and try again.')
        else if (data.error === 'server_error') setError('Server error — try again in a few seconds.')
        else if (res.status === 401) setError('Session expired — please refresh the page.')
        else setError(`Something went wrong (${data.error || res.status}). Please try again.`)
        setIsStreaming(false)
        return
      }

      // Read plain text stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })

          // Check for error markers
          if (chunk.includes('[ERROR:')) { setError('Something went wrong.'); break }

          assistantContent += chunk
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
            return updated
          })
        }
      }

      console.log('[chat] stream complete, length:', assistantContent.length)

      // Persist assistant message
      if (assistantContent) await persistMessage('assistant', assistantContent)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, bookId, bookTitle, activePhase, workbookData, styleGuide, hasApiKey, persistMessage])

  const handleSaveToWorkbook = useCallback(async (msgIndex: number) => {
    const msg = messages[msgIndex]
    if (!msg || msg.role !== 'assistant') return
    setSavingIndex(msgIndex)
    // Find next available chapter index from workbook data
    const existingChapters = Object.keys(workbookData).filter(k => k.startsWith('writing:chapter:')).length
    await onSaveToWorkbook(msg.content, existingChapters)
    setSavingIndex(null)
  }, [messages, workbookData, onSaveToWorkbook])

  const handleClearChat = useCallback(async () => {
    await fetch(`/api/writing-notebook/chat?bookId=${bookId}`, { method: 'DELETE' }).catch(() => {})
    setMessages([])
  }, [bookId])

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
      <div className="h-12 flex items-center px-4 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Writing Assistant</p>
          <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{bookTitle} &middot; {activePhase} phase</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={handleClearChat} className="text-xs px-2 py-1 rounded hover:bg-gray-100" style={{ color: '#9CA3AF' }}>
              Clear
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" style={{ color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm" style={{ background: '#FEF2F2', color: '#DC2626' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm font-medium mb-3" style={{ color: '#1E2D3D' }}>How can I help with your story?</p>
            {!hasApiKey && (
              <p className="text-xs mb-3 px-4" style={{ color: '#F97B6B' }}>
                Add your Anthropic API key in Settings to start writing with AI.
              </p>
            )}
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything about your story..."
            className="flex-1 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
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
