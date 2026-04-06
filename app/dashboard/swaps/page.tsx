'use client'
// app/(dashboard)/swaps/page.tsx
import { useState, useEffect } from 'react'
import { DarkPage } from '@/components/DarkPage'

const QUICK_OPTIONS = [
  'Swap calendar',
  'Partner click tracking',
  'Rank lift per swap',
  'BookFunnel integration',
  'Automated thank you emails',
  'Partner scorecard',
  'Best swap partners list',
  'Something else...',
]

const DISMISS_KEY = 'swaps_inbound_banner_dismissed'

function InboundBanner() {
  const [address, setAddress]   = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true)
      return
    }
    fetch('/api/email/inbound-address')
      .then(r => r.json())
      .then(d => setAddress(d.address ?? null))
      .catch(() => {})
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function copy() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the input
    }
  }

  if (dismissed || !address) return null

  return (
    <div className="mb-6 rounded-lg p-4 relative"
      style={{
        background:   '#FFF8F0',
        borderLeft:   '3px solid #E9A020',
        border:       '1px solid #EEEBE6',
        borderLeftWidth: '3px',
      }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>
            Set up automatic swap tracking
          </div>
          <p className="text-[13px] mb-3" style={{ color: '#6B7280' }}>
            Forward your BookClicker emails to the address below and they&apos;ll appear here automatically.
            Works with Gmail, Yahoo, Outlook, or any email client.
          </p>

          {/* Copyable address field */}
          <div className="flex items-center gap-2 mb-3">
            <input
              readOnly
              value={address}
              className="flex-1 rounded px-3 py-2 text-[13px] font-mono outline-none"
              style={{
                background: '#FFF8F0',
                border:     '1.5px solid #1E2D3D',
                color:      '#1E2D3D',
              }}
            />
            <button
              onClick={copy}
              className="px-3 py-2 rounded text-[12px] font-bold whitespace-nowrap transition-all border-none cursor-pointer"
              style={{
                background: copied ? '#6EBF8B' : '#E9A020',
                color:      '#fff',
                minWidth:   72,
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
            In your email settings, create a forwarding rule for any email from bookclicker.com to this address.
          </p>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-[11px] underline bg-transparent border-none cursor-pointer"
        style={{ color: '#9CA3AF' }}
      >
        Dismiss
      </button>
    </div>
  )
}

export default function SwapsPage() {
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [details, setDetails]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [swapCount, setSwapCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/swaps')
      .then(r => r.json())
      .then(d => setSwapCount(Array.isArray(d.swaps) ? d.swaps.length : 0))
      .catch(() => setSwapCount(0))
  }, [])

  function toggle(opt: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      return next
    })
  }

  async function handleSubmit() {
    if (selected.size === 0 && !details.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'swap_idea',
          page: 'swaps',
          message: `Selected: ${Array.from(selected).join(', ')}${details.trim() ? `\n\nDetails: ${details}` : ''}`,
        }),
      })
      setSubmitted(true)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DarkPage title="Newsletter Swaps">
      <div className="max-w-2xl">
        {/* Setup banner — only for first-time users with zero swaps */}
        {swapCount === 0 && <InboundBanner />}

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-[20px] font-semibold" style={{ color: '#1E2D3D' }}>
            Newsletter Swaps
          </h2>
          <span className="text-[10px] font-bold tracking-[1px] uppercase px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            Coming Soon
          </span>
        </div>

        <p className="text-[14px] leading-relaxed mb-8" style={{ color: '#6B7280' }}>
          We&apos;re building the swap tracker — calendar, partner ROI, click tracking, and rank lift per send.
          Before we build it, we want to know what <strong style={{ color: '#1E2D3D' }}>you</strong> need most.
        </p>

        {submitted ? (
          <div className="rounded-xl p-8 text-center"
            style={{ background: 'white', border: '1px solid #EEEBE6' }}>
            <div className="text-4xl mb-3">💛</div>
            <div className="text-[16px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>
              You&apos;re helping build this — thank you!
            </div>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              We&apos;ll let you know when it launches.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
            <div className="text-[13px] font-semibold mb-4" style={{ color: '#1E2D3D' }}>
              What would make this page incredibly useful for you?
            </div>

            {/* Quick tap options */}
            <div className="flex flex-wrap gap-2 mb-5">
              {QUICK_OPTIONS.map(opt => {
                const active = selected.has(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all border-none cursor-pointer"
                    style={{
                      background: active ? 'rgba(233,160,32,0.12)' : '#F5F5F4',
                      color: active ? '#e9a020' : '#6B7280',
                      border: active ? '1.5px solid rgba(233,160,32,0.4)' : '1.5px solid #E7E5E4',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            {/* Text field */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: '#6B7280' }}>
                Tell us more (optional)
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="What would be most helpful for your swap strategy?"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none"
                style={{ background: 'white', border: '1.5px solid #E7E5E4', color: '#1E2D3D' }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || (selected.size === 0 && !details.trim())}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all
                         disabled:opacity-40 border-none cursor-pointer"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {submitting ? 'Sending...' : 'Send my ideas →'}
            </button>
          </div>
        )}
      </div>
    </DarkPage>
  )
}
