'use client'
// app/dashboard/meta/error/page.tsx — Meta OAuth error page
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function MetaErrorContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'Something went wrong during authorization.'

  function tryAgain() {
    window.location.href = '/api/meta/connect'
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF8F0' }}>
      <div className="text-center max-w-sm px-6">
        {/* Amber warning icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5"
          style={{ background: 'rgba(233,160,32,0.12)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L29 26H3L16 4Z" stroke="#E9A020" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 13V19" stroke="#E9A020" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="22.5" r="1" fill="#E9A020" />
          </svg>
        </div>

        <h1 className="text-[22px] font-semibold mb-2" style={{ color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Couldn't connect Meta Ads
        </h1>

        <p className="text-[13px] mb-6 leading-relaxed" style={{ color: '#6B7280', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {reason}
        </p>

        <button
          onClick={tryAgain}
          className="px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 border-none cursor-pointer"
          style={{ background: '#E9A020', color: '#1E2D3D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Try again →
        </button>

        <div className="mt-4">
          <a href="/dashboard/settings"
            className="text-[12px] no-underline hover:underline"
            style={{ color: '#9CA3AF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Back to Settings
          </a>
        </div>
      </div>
    </div>
  )
}

export default function MetaErrorPage() {
  return (
    <Suspense fallback={null}>
      <MetaErrorContent />
    </Suspense>
  )
}
