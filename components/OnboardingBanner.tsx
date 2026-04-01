'use client'
// components/OnboardingBanner.tsx

import { useEffect, useState } from 'react'

export function OnboardingBanner({ analysesCount }: { analysesCount: number }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (analysesCount > 0) return
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => {
        if (!d.onboardingDismissed) setVisible(true)
      })
      .catch(() => {})
  }, [analysesCount])

  function dismiss() {
    setDismissed(true)
    setTimeout(() => setVisible(false), 400)
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss-onboarding' }),
    }).catch(() => {})
  }

  if (!visible) return null

  return (
    <div
      className="rounded-xl p-5 mb-6 relative"
      style={{
        background: 'linear-gradient(135deg, #0d1f35, #162d47)',
        border: '1px solid rgba(233,160,32,0.25)',
        opacity: dismissed ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[14px]"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
        aria-label="Dismiss"
      >
        ×
      </button>

      <div className="flex items-start gap-4">
        <div className="text-3xl flex-shrink-0">👋</div>
        <div>
          <div className="font-serif text-[18px] text-white mb-2 leading-snug">
            Welcome to AuthorDash
          </div>
          <p className="text-[13px] leading-[1.7] mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Your marketing coach is here to help you <strong style={{ color: 'rgba(255,255,255,0.85)' }}>read your data</strong> — not to think for you.
            Use these insights as a starting point. Your gut knows your readers better than any algorithm.
          </p>
          <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            We&apos;ll show you the numbers. <strong style={{ color: '#e9a020' }}>You make the calls.</strong>
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/upload"
              className="inline-block px-4 py-2 rounded-lg text-[13px] font-semibold no-underline mr-3"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              Upload your first files →
            </a>
            <button
              onClick={dismiss}
              className="text-[12px] font-medium"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Got it, dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
