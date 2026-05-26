'use client'
import { useEffect, useState } from 'react'

const LS_KEY = 'fetchFirstSyncSeen'

export function FetchFirstSyncToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) return
    } catch { return }

    fetch('/api/extension/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.hasExtension) return
        const timer = setTimeout(() => setVisible(true), 2000)
        return () => clearTimeout(timer)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => dismiss(), 8000)
    return () => clearTimeout(timer)
  }, [visible])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(LS_KEY, 'true') } catch {}
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 left-6 z-[300] flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg"
      style={{
        background: '#6EBF8B',
        color: 'white',
        fontFamily: 'var(--font-sans)',
        maxWidth: 320,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>🐕</span>
      <div className="flex-1">
        <p className="text-[13px] font-semibold m-0 leading-snug">
          Fetch just updated your numbers automatically.
        </p>
        <p className="text-[12px] m-0 mt-0.5 leading-snug" style={{ opacity: 0.88 }}>
          You didn&apos;t have to do anything.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border-none cursor-pointer"
        style={{ background: 'rgba(30,45,61,0.2)', color: '#1E2D3D' }}
        aria-label="Dismiss"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
