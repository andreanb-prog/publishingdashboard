'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, AlertTriangle, Check, Clipboard } from 'lucide-react'
import type { WorkbookData, StyleGuide } from '@/app/dashboard/writing-notebook/useWorkbook'

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_CHIPS = [
  'Tighten this scene',
  'Check kill list words',
  'Write what comes next',
  'Summarize for Story So Far',
  'Fix the pacing',
]

interface Props {
  bookId: string
  bookTitle: string
  workbookData: WorkbookData
  styleGuide: StyleGuide
  hasApiKey: boolean
  activeNavItem: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 mt-1.5 transition-colors"
      style={{ color: copied ? '#6EBF8B' : '#9CA3AF' }}
    >
      {copied ? <Check size={11} /> : <Clipboard size={11} />}
      <span className="text-[11px]">{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}

export function InlineAIPanel({
  bookId, bookTitle, workbookData, styleGuide, hasApiKey, activeNavItem,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history when expanded / bookId changes
  useEffect(() => {
    if (expanded && bookId) {
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
  }, [expanded, bookId])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Focus input when expanded
  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 150)
  }, [expanded])

  const persistMessage = useCallback(async (role: string, content: string) => {
    await fetch('/api/writing-notebook/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, bookId }),
    }).catch(() => {})
  }, [bookId])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isStreaming) return
    if (!hasApiKey) {
      setError('Add your Anthropic API key in Settings to use the writing assistant.')
      return
    }
    setInput('')
    setError('')

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setIsStreaming(true)
    await persistMessage('user', msg)

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookTitle,
          message: msg,
          activePhase: activeNavItem.startsWith('chapter:') ? 'writing'
            : activeNavItem === 'storySoFar' ? 'writing'
            : activeNavItem === 'consistencyCheck' || activeNavItem === 'vellumExport' ? 'polish'
            : 'setup',
          workbookData,
          styleGuide,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'no_api_key') setError('Add your Anthropic API key in Settings.')
        else if (data.error === 'invalid_key') setError('Your API key is invalid. Update it in Settings.')
        else if (data.error === 'rate_limited') setError('Rate limited — wait a moment and try again.')
        else if (data.error === 'server_error') setError('Server error — try again in a few seconds.')
        else if (res.status === 401) setError('Session expired — please refresh the page.')
        else setError(`Something went wrong (${data.error || res.status}). Please try again.`)
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages([...newMessages, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (chunk.includes('[ERROR:invalid_key]')) { setError('Your API key is invalid.'); break }
          if (chunk.includes('[ERROR:rate_limited]')) { setError('Rate limited. Wait a moment and try again.'); break }
          if (chunk.includes('[ERROR:unknown]')) { setError('Something went wrong.'); break }
          assistantContent += chunk
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
            return updated
          })
        }
      }

      if (assistantContent) await persistMessage('assistant', assistantContent)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsStreaming(false)
    }
  }, [input, messages, isStreaming, bookId, bookTitle, activeNavItem, workbookData, styleGuide, hasApiKey, persistMessage])

  // Auto-expand textarea height
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
  }

  // ── Collapsed bar ───────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div
        className="shrink-0 flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-[#FAFAF9]"
        style={{
          height: 44,
          background: '#FFFFFF',
          borderBottom: '0.5px solid #E5E7EB',
        }}
        onClick={() => setExpanded(true)}
      >
        {/* Spark icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#FFF3E0' }}
        >
          <span style={{ color: '#D97706', fontSize: 14 }}>✦</span>
        </div>

        {/* Placeholder */}
        <span className="flex-1 text-[13px]" style={{ color: '#9CA3AF' }}>
          Ask your writing coach anything…
        </span>

        {/* Open link */}
        <button
          className="text-[12px] font-medium shrink-0"
          style={{ color: '#D97706' }}
          onClick={e => { e.stopPropagation(); setExpanded(true) }}
        >
          Open ↑
        </button>
      </div>
    )
  }

  // ── Expanded panel ──────────────────────────────────────────────────────────
  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        background: '#FFFFFF',
        borderBottom: '0.5px solid #E5E7EB',
      }}
    >
      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2 flex items-center gap-2 text-[12px]"
          style={{ background: '#FEF2F2', color: '#DC2626' }}
        >
          <AlertTriangle size={13} />
          {error}
          <button
            className="ml-auto text-[11px] underline"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="overflow-y-auto px-4 py-3 space-y-2"
        style={{ maxHeight: 160 }}
      >
        {messages.length === 0 && (
          <p className="text-[12px] text-center py-2" style={{ color: '#9CA3AF' }}>
            {hasApiKey ? 'How can I help with your story?' : 'Add your Anthropic API key in Settings to start.'}
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className="max-w-[85%] px-3 py-2 text-[13px] whitespace-pre-wrap"
              style={{
                borderRadius: 2,
                background: msg.role === 'user' ? '#1E2D3D' : '#F3F4F6',
                color: msg.role === 'user' ? '#FFFFFF' : '#1E2D3D',
                lineHeight: '1.55',
              }}
            >
              {msg.content || (isStreaming && i === messages.length - 1 ? (
                <span className="flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
                  <Loader2 size={11} className="animate-spin" />
                  Writing…
                </span>
              ) : null)}
            </div>
            {/* Copy button — only on assistant messages with content */}
            {msg.role === 'assistant' && msg.content && !isStreaming && (
              <CopyButton text={msg.content} />
            )}
          </div>
        ))}
      </div>

      {/* Input bar (iMessage pill style) */}
      <div className="px-4 pb-2">
        <div
          className="flex items-end gap-2 px-3 py-2"
          style={{ borderRadius: 2, background: '#F7F2EC' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask anything about your story…"
            className="flex-1 bg-transparent resize-none focus:outline-none text-[13px]"
            style={{
              color: '#1E2D3D',
              minHeight: 20,
              maxHeight: 80,
              lineHeight: '1.5',
            }}
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: '#D97706', color: '#FFFFFF' }}
          >
            <Send size={13} />
          </button>
        </div>

        {/* Quick chips (horizontally scrollable, no scrollbar) */}
        <div
          className="flex gap-2 mt-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => {
                setInput(chip)
                inputRef.current?.focus()
              }}
              className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors hover:opacity-80"
              style={{ border: '1px solid #D97706', color: '#D97706', background: '#FFFBF0' }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Collapse button */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setExpanded(false)}
            className="text-[11px] transition-colors hover:opacity-70"
            style={{ color: '#9CA3AF' }}
          >
            ▲ Collapse
          </button>
        </div>
      </div>
    </div>
  )
}
