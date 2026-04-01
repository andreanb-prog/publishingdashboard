'use client'
// app/(dashboard)/swaps/page.tsx
import { useState } from 'react'
import { DarkPage } from '@/components/DarkPage'

export default function SwapsPage() {
  const [notified, setNotified] = useState(false)

  return (
    <DarkPage title="🔁 Newsletter Swaps">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-2xl p-10 max-w-lg w-full"
          style={{ background: '#1c1917', border: '1px solid #292524' }}>

          <div className="text-5xl mb-5">🔁</div>

          <h2 className="font-serif text-2xl mb-4" style={{ color: '#fafaf9' }}>
            Coming Soon
          </h2>

          <p className="text-[14px] leading-relaxed mb-6" style={{ color: '#a8a29e' }}>
            We&apos;re building something good here.
          </p>

          <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: '#78716c' }}>
            Newsletter swap tracking — including your swap calendar, partner ROI, click tracking,
            and rank lift per send — is coming in the next update.
          </p>

          <p className="text-[13.5px] leading-relaxed mb-8" style={{ color: '#78716c' }}>
            For now, your swap calendar lives in Notion. We&apos;ll pull it in here soon.
          </p>

          {notified ? (
            <div className="text-[13.5px] font-semibold px-5 py-3 rounded-xl"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
              You&apos;ll be the first to know! 🎉
            </div>
          ) : (
            <button
              onClick={() => setNotified(true)}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-80"
              style={{
                background: 'rgba(168,162,158,0.1)',
                color: '#a8a29e',
                border: '1px solid #292524',
              }}>
              Notify me when it&apos;s ready
            </button>
          )}
        </div>
      </div>
    </DarkPage>
  )
}
