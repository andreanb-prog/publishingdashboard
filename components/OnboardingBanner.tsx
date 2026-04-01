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
    setTimeout(() => setVisible(false), 300)
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss-onboarding' }),
    }).catch(() => {})
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: 'rgba(13,31,53,0.72)',
        backdropFilter: 'blur(4px)',
        opacity: dismissed ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: dismissed ? 'none' : 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative rounded-2xl p-8 w-full max-w-lg shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0d1f35, #162d47)',
          border: '1px solid rgba(233,160,32,0.3)',
        }}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-[16px]"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
          aria-label="Dismiss"
        >
          ×
        </button>

        <div className="font-serif text-[22px] text-white mb-3 leading-snug">
          Welcome to AuthorDash
        </div>
        <p className="text-[14px] leading-[1.75] mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Your marketing coach is here to help you <strong style={{ color: 'rgba(255,255,255,0.85)' }}>read your data</strong> — not to think for you.
          Use these insights as a starting point. Your gut knows your readers better than any algorithm.
        </p>
        <p className="text-[13px] leading-[1.7] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          We&apos;ll show you the numbers. <strong style={{ color: '#e9a020' }}>You make the calls.</strong>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="/dashboard/upload"
            className="inline-block px-5 py-2.5 rounded-lg text-[13.5px] font-semibold no-underline"
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
  )
}
