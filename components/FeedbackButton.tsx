'use client'
// components/FeedbackButton.tsx
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

type Tab = 'bug' | 'idea'
type State = 'idle' | 'submitting' | 'done'

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen]       = useState(false)
  const [tab, setTab]         = useState<Tab>('bug')
  const [message, setMessage] = useState('')
  const [status, setStatus]   = useState<State>('idle')
  const panelRef = useRef<HTMLDivElement>(null)
  const textRef  = useRef<HTMLTextAreaElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) setTimeout(() => textRef.current?.focus(), 150)
  }, [open])

  function handleOpen() {
    setOpen(o => !o)
    setStatus('idle')
    setMessage('')
  }

  async function handleSubmit() {
    if (!message.trim() || status !== 'idle') return
    setStatus('submitting')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, message, page: pathname }),
      })
      setStatus('done')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
        setMessage('')
      }, 2800)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

      {/* Slide-up panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: open ? '480px' : '0px',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          width: '320px',
        }}
      >
        <div className="rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#1c1917', border: '1px solid #292524' }}>

          {status === 'done' ? (
            /* ── Thank-you state ── */
            <div className="px-5 py-8 text-center">
              <div className="text-3xl mb-3">🙏</div>
              <div className="font-serif text-[16px] mb-1.5" style={{ color: '#fafaf9' }}>
                Got it! Thank you —
              </div>
              <div className="text-[13px]" style={{ color: '#a8a29e' }}>
                we read every single one.
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 pt-5 pb-3">
                <div className="font-serif text-[16px] mb-1" style={{ color: '#fafaf9' }}>
                  What&apos;s on your mind?
                </div>
                <div className="text-[12px] leading-relaxed" style={{ color: '#78716c' }}>
                  Bug, idea, or just something that felt weird — we want to know.
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-5 pb-3">
                {([
                  { key: 'bug',  label: "Something's broken" },
                  { key: 'idea', label: 'I have an idea' },
                ] as { key: Tab; label: string }[]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="flex-1 text-[11.5px] font-semibold px-2 py-1.5 rounded-lg transition-all"
                    style={{
                      background: tab === t.key ? 'rgba(233,160,32,0.15)' : 'rgba(255,255,255,0.04)',
                      color:      tab === t.key ? '#e9a020' : '#78716c',
                      border:     `1px solid ${tab === t.key ? 'rgba(233,160,32,0.3)' : 'transparent'}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Text area */}
              <div className="px-5 pb-3">
                <textarea
                  ref={textRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
                  rows={4}
                  placeholder="Tell us what happened..."
                  className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed
                             outline-none transition-colors"
                  style={{
                    background: '#0c0a09',
                    border: '1px solid #292524',
                    color: '#d6d3d1',
                  }}
                />
              </div>

              {/* Page URL (for bugs) */}
              {tab === 'bug' && (
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: '#0c0a09', border: '1px solid #292524' }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: '#44403c' }}>
                      Page
                    </span>
                    <span className="text-[11px] font-mono truncate" style={{ color: '#57534e' }}>
                      {pathname}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'submitting'}
                  className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#e9a020', color: '#0d1f35' }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send it →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="group flex items-center gap-1.5 rounded-full text-[12px] font-semibold
                   shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: 'rgba(233,160,32,0.9)',
          color: '#0d1f35',
          padding: '8px 14px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ fontSize: '14px' }}>💬</span>
        Something feel off?
      </button>
    </div>
  )
}
