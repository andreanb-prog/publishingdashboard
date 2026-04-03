'use client'
// components/OnboardingBanner.tsx — Welcome modal for first-time users
// Shows once per browser session (sessionStorage) while onboardingDismissed is false in DB.

import { useEffect, useState } from 'react'

interface Props {
  userName?: string | null
}

export function OnboardingBanner({ userName }: Props) {
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('welcome-seen')) return
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => { if (!d.onboardingDismissed) setVisible(true) })
      .catch(() => {})
  }, [])

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') sessionStorage.setItem('welcome-seen', '1')
    setTimeout(() => setVisible(false), 350)
  }

  if (!visible) return null

  const firstName  = userName ?? null
  // Expose via NEXT_PUBLIC_ so it's available in client bundle
  const videoUrl   = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL ?? null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{
        background: 'rgba(30,45,61,0.65)',
        backdropFilter: 'blur(6px)',
        opacity: dismissed ? 0 : 1,
        transition: 'opacity 0.35s ease',
        pointerEvents: dismissed ? 'none' : 'auto',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}
      >
        {/* Amber top bar */}
        <div style={{ height: 4, background: '#E9A020', flexShrink: 0 }} />

        <div className="p-8">
          {/* Wordmark */}
          <div className="flex items-center justify-center gap-2 mb-7">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#E9A020' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0"   y="6" width="3.5" height="8"  rx="1" fill="white" />
                <rect x="5.25" y="3" width="3.5" height="11" rx="1" fill="white" />
                <rect x="10.5" y="0" width="3.5" height="14" rx="1" fill="white" />
              </svg>
            </div>
            <span className="text-[17px] font-bold" style={{ color: '#1E2D3D' }}>AuthorDash</span>
          </div>

          {/* Headline */}
          <h1 className="text-[24px] font-semibold text-center leading-snug mb-2"
            style={{ color: '#1E2D3D' }}>
            Welcome to AuthorDash{firstName ? `, ${firstName}` : ''}.
          </h1>

          {/* Subhead */}
          <p className="text-[14px] text-center leading-relaxed mb-6" style={{ color: '#6B7280' }}>
            Your publishing dashboard is ready.{' '}
            Let&apos;s get your data connected.
          </p>

          {/* Optional founder video */}
          {videoUrl && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: '#1E2D3D' }}>
              <iframe
                src={videoUrl}
                className="w-full h-full"
                style={{ border: 0, width: '100%', height: '100%' }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          )}

          {/* CTA */}
          <button
            onClick={dismiss}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold border-none cursor-pointer transition-all hover:opacity-90"
            style={{ background: '#E9A020', color: '#0d1f35' }}
          >
            Get started →
          </button>

          <p className="text-center text-[12px] mt-3" style={{ color: '#9CA3AF' }}>
            Takes about 3 minutes to set up
          </p>
        </div>
      </div>
    </div>
  )
}
