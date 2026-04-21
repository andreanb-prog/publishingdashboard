'use client'
// components/FirstRunBanner.tsx
// Inline first-run onboarding progress strip.
// Shows when setup is incomplete; dismissal stored in localStorage.

import { useState, useEffect } from 'react'

const LS_KEY = 'authordash-onboarding-dismissed'

interface Props {
  hasBooks: boolean
  hasKdpData: boolean
  hasMailerLite: boolean
  onUploadClick?: () => void
}

interface Step {
  label: string
  linkLabel: string
  href?: string
  onClick?: () => void
  done: boolean
}

export function FirstRunBanner({ hasBooks, hasKdpData, hasMailerLite, onUploadClick }: Props) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(LS_KEY)
    if (!stored) setDismissed(false)
  }, [])

  const allDone = hasBooks && hasKdpData && hasMailerLite
  if (allDone || dismissed) return null

  const steps: Step[] = [
    {
      label: 'Add your books',
      linkLabel: 'Go to My Books →',
      href: '/dashboard/settings#my-books',
      done: hasBooks,
    },
    {
      label: 'Upload your KDP report',
      linkLabel: 'Upload now →',
      onClick: onUploadClick,
      href: onUploadClick ? undefined : '/dashboard?upload=1',
      done: hasKdpData,
    },
    {
      label: 'Connect MailerLite',
      linkLabel: 'Go to Connections →',
      href: '/dashboard/settings#connections',
      done: hasMailerLite,
    },
  ]

  // Current step = first incomplete
  const currentIdx = steps.findIndex(s => !s.done)

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, '1')
  }

  return (
    <div
      className="mb-5 rounded-xl overflow-hidden"
      style={{
        background: '#FFF8F0',
        border: '0.5px solid #E9D8C0',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Amber top accent */}
      <div style={{ height: 3, background: '#E9A020' }} />

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
            ✦ Get started with AuthorDash
          </span>
          <button
            onClick={dismiss}
            className="text-[12px] bg-transparent border-none cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: '#9CA3AF', padding: '2px 4px' }}
          >
            Got it
          </button>
        </div>

        {/* Steps strip */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          {steps.map((step, i) => {
            const isCurrent = i === currentIdx
            const isUpcoming = !step.done && i > currentIdx

            let dotColor = '#6EBF8B'   // sage — done
            let labelColor = '#6EBF8B'
            let borderColor = 'rgba(110,191,139,0.3)'
            let bg = 'rgba(110,191,139,0.08)'

            if (isCurrent) {
              dotColor = '#E9A020'
              labelColor = '#1E2D3D'
              borderColor = 'rgba(233,160,32,0.4)'
              bg = 'rgba(233,160,32,0.06)'
            } else if (isUpcoming) {
              dotColor = '#D1D5DB'
              labelColor = '#9CA3AF'
              borderColor = '#E5E7EB'
              bg = 'transparent'
            }

            function handleClick(e: React.MouseEvent) {
              if (step.onClick) {
                e.preventDefault()
                step.onClick()
              }
            }

            const Wrapper = ({ children }: { children: React.ReactNode }) =>
              step.done || isUpcoming ? (
                <div className="flex-1">{children}</div>
              ) : (
                <a
                  href={step.href}
                  onClick={handleClick}
                  className="flex-1 no-underline block"
                  style={{ textDecoration: 'none' }}
                >
                  {children}
                </a>
              )

            return (
              <div key={step.label} className="flex-1 flex items-stretch sm:contents">
                <Wrapper>
                  <div
                    className="flex items-center gap-3 rounded-lg px-4 py-3 h-full transition-all"
                    style={{
                      border: `0.5px solid ${borderColor}`,
                      background: bg,
                      margin: '0 2px',
                      cursor: step.done || isUpcoming ? 'default' : 'pointer',
                    }}
                  >
                    {/* Step indicator */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: step.done ? '#6EBF8B' : isCurrent ? '#E9A020' : '#E5E7EB',
                        color: step.done || isCurrent ? 'white' : '#9CA3AF',
                      }}
                    >
                      {step.done ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>

                    {/* Labels */}
                    <div className="min-w-0">
                      <div
                        className="text-[12px] font-semibold leading-tight"
                        style={{
                          color: labelColor,
                          textDecoration: step.done ? 'line-through' : 'none',
                        }}
                      >
                        {step.label}
                      </div>
                      {isCurrent && (
                        <div className="text-[11px] font-medium mt-0.5" style={{ color: '#E9A020' }}>
                          {step.linkLabel}
                        </div>
                      )}
                    </div>
                  </div>
                </Wrapper>

                {/* Connector between steps */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden sm:flex items-center flex-shrink-0"
                    style={{ color: '#D1D5DB', fontSize: 16, padding: '0 2px' }}
                  >
                    →
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
