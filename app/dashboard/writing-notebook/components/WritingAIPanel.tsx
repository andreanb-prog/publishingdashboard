'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronUp, ChevronDown, Square, ArrowRight, Copy, Check } from 'lucide-react'
import type { Phase, StyleGuide, WorkbookData } from '../useWorkbook'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_CHIPS = [
  'Tighten this scene',
  'Check kill list words',
  'Write what comes next',
  'Summarize for Story So Far',
  'Fix the pacing',
]

interface Props {
  bookId: string | null
  bookTitle: string
  phase: Phase
  hasApiKey: boolean
  workbookData: WorkbookData
  getStyleGuide: () => StyleGuide
  activeChapterContent?: string
}

export function WritingAIPanel({ bookId, bookTitle, phase, hasApiKey, workbookData, getStyleGuide, activeChapterContent }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEnd = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history on book change
  useEffect(() => {
    if (!bookId) { setMessages([]); return }
    fetch(`/api/writing-notebook/chat?bookId=${bookId}`)
      .then(r => r.json())
      .then(d => setMessages((d.data ?? []).map((m: any) => ({ id: m.id, role: m.role, content: m.content }))))
      .catch(() => {})
  }, [bookId])

  useEffect(() => {
    if (expanded) messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent, expanded])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || streaming || !hasApiKey) return
    setInput('')

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    fetch('/api/writing-notebook/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: msg, bookId }),
    }).catch(() => {})

    setStreaming(true)
    setStreamContent('')
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/writing-notebook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId, bookTitle, message: msg,
          activePhase: phase, workbookData, styleGuide: getStyleGuide(),
        }),
        signal: abort.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const errMsg = err.error === 'no_api_key' ? 'No API key found.'
          : err.error === 'rate_limited' ? 'Rate limited. Try again soon.'
          : 'Something went wrong.'
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: errMsg }])
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
        full += decoder.decode(value, { stream: true })
        setStreamContent(full)
      }

      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: full }])
      setStreamContent('')

      fetch('/api/writing-notebook/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: full, bookId }),
      }).catch(() => {})
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: 'Connection error.' }])
      }
    }
    setStreaming(false)
  }, [input, streaming, bookId, bookTitle, phase, workbookData, getStyleGuide, hasApiKey])

  // Collapsed state
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent border-none cursor-pointer text-left transition-colors flex-shrink-0"
        style={{ borderBottom: '1px solid #EEEBE6' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <span className="w-7 h-7 rounded-md flex items-center justify-center text-[14px]" style={{ background: '#FFF3DC' }}>
          &#10022;
        </span>
        <span className="text-[13px] flex-1" style={{ color: '#9CA3AF' }}>
          Ask your writing coach anything...
        </span>
        <span className="text-[12px] font-medium" style={{ color: '#E9A020' }}>
          Open <ChevronUp size={12} className="inline" />
        </span>
      </button>
    )
  }

  // Expanded state
  return (
    <div className="flex flex-col flex-shrink-0" style={{ borderBottom: '1px solid #EEEBE6', maxHeight: 360 }}>
      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2" style={{ maxHeight: 160 }}>
        {messages.map(m => (
          <AIBubble key={m.id} message={m} />
        ))}
        {streaming && streamContent && (
          <div className="text-[13px] px-3 py-2 rounded-lg" style={{ background: '#FFFFFF', borderLeft: '3px solid #E9A020', color: '#1E2D3D' }}>
            <div className="wn-prose"><ReactMarkdown>{streamContent}</ReactMarkdown></div>
            <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm" style={{ background: '#E9A020' }} />
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-2">
        <div className="flex items-end gap-2 rounded-full px-3 py-1.5" style={{ background: '#F7F2EC' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] py-1"
            style={{ maxHeight: 80, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1E2D3D' }}
          />
          {streaming ? (
            <button
              onClick={() => { abortRef.current?.abort(); setStreaming(false) }}
              className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer flex-shrink-0"
              style={{ background: '#F97B6B', color: '#FFFFFF' }}
            >
              <Square size={11} />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer flex-shrink-0 transition-opacity"
              style={{ background: '#E9A020', color: '#FFFFFF', opacity: input.trim() ? 1 : 0.4 }}
            >
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => { setInput(chip); textareaRef.current?.focus() }}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 bg-transparent cursor-pointer"
            style={{ color: '#1E2D3D', border: '1px solid #EEEBE6' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFF8F0')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center justify-center gap-1 py-1.5 bg-transparent border-none cursor-pointer text-[11px] font-medium"
        style={{ color: '#9CA3AF', borderTop: '0.5px solid #EEEBE6' }}
      >
        <ChevronDown size={12} /> Collapse
      </button>
    </div>
  )
}

function AIBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div
        className="text-[13px] px-3 py-2 rounded-lg"
        style={{
          background: isUser ? '#E9A020' : '#FFFFFF',
          color: isUser ? '#FFFFFF' : '#1E2D3D',
          borderLeft: isUser ? 'none' : '3px solid #E9A020',
        }}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="wn-prose"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
      </div>
      {!isUser && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 mt-0.5 text-[11px] bg-transparent border-none cursor-pointer transition-colors"
          style={{ color: copied ? '#6EBF8B' : '#9CA3AF' }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}
