'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'onboarding-banner-dismissed'

type StepStatus = 'done' | 'current' | 'upcoming'

const STEPS = [
  { number: 1, label: 'Add your books', link: '/dashboard/settings#my-books', linkLabel: 'Go to My Books →' },
  { number: 2, label: 'Upload your KDP report', link: '/dashboard?upload=1', linkLabel: 'Upload now →' },
  { number: 3, label: 'Connect MailerLite', link: '/dashboard/settings#connections', linkLabel: 'Connect →' },
]

const STATUS_COLORS: Record<StepStatus, { bg: string; text: string; numBg: string; numText: string }> = {
  done:     { bg: '#F0FAF4', text: '#2D6A4F', numBg: '#6EBF8B', numText: '#fff' },
  current:  { bg: '#FFFBF0', text: '#92400E', numBg: '#E9A020', numText: '#fff' },
  upcoming: { bg: '#F9F9F9', text: '#9CA3AF', numBg: '#E5E7EB', numText: '#6B7280' },
}

interface Props {
  bookCount: number
  hasKdpData: boolean
  hasMailerLiteKey: boolean
}

export function OnboardingBanner({ bookCount, hasKdpData, hasMailerLiteKey }: Props) {
  const [dismissed, setDismissed] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(LS_KEY)) return
    if (bookCount > 0 && hasKdpData && hasMailerLiteKey) return
    setDismissed(false)
  }, [bookCount, hasKdpData, hasMailerLiteKey])

  function dismiss() {
    setFading(true)
    setTimeout(() => {
      setDismissed(true)
      if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, '1')
    }, 300)
  }

  if (dismissed) return null

  function getStatus(n: number): StepStatus {
    if (n === 1) return bookCount > 0 ? 'done' : 'current'
    if (n === 2) {
      if (hasKdpData) return 'done'
      return bookCount > 0 ? 'current' : 'upcoming'
    }
    if (n === 3) {
      if (hasMailerLiteKey) return 'done'
      return hasKdpData ? 'current' : 'upcoming'
    }
    return 'upcoming'
  }

  return (
    <div
      className="mb-5 rounded-xl overflow-hidden"
      style={{
        background: '#FFF8F0',
        border: '0.5px solid #E8DDD0',
        fontFamily: "var(--font-sans)",
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={{ height: 3, background: '#E9A020' }} />

      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-shrink-0">
          <p className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
            Get set up in 3 steps
          </p>
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
            Your dashboard is ready — let&apos;s connect your data.
          </p>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          {STEPS.map((step) => {
            const status = getStatus(step.number)
            const colors = STATUS_COLORS[status]
            return (
              <div
                key={step.number}
                className="flex items-center gap-2.5 flex-1 rounded-lg px-3 py-2.5"
                style={{ background: colors.bg, border: '0.5px solid #E8DDD0' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: colors.numBg, color: colors.numText }}
                >
                  {status === 'done' ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium leading-tight truncate" style={{ color: colors.text }}>
                    {step.label}
                  </p>
                  {status !== 'done' && (
                    <a
                      href={step.link}
                      className="text-[11px] font-semibold hover:underline"
                      style={{ color: status === 'current' ? '#E9A020' : '#D1D5DB' }}
                    >
                      {step.linkLabel}
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={dismiss}
          className="self-start sm:self-center flex-shrink-0 text-[12px] font-semibold rounded-lg px-3 py-1.5 transition-opacity hover:opacity-70"
          style={{ background: '#F0EBE3', color: '#6B7280', border: 'none', cursor: 'pointer' }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
