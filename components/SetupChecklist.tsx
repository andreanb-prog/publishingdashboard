'use client'
// components/SetupChecklist.tsx — Collapsible 3-step onboarding checklist.
// Shows after the welcome modal (welcome-seen in sessionStorage) while
// onboardingDismissed is false in DB. Marks complete when all required
// steps done, or on manual dismiss.

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Circle, ChevronDown } from 'lucide-react'
import type { Analysis } from '@/types'

interface StepDef {
  id:       string
  label:    string
  actionLabel: string
  href:     string
  optional: boolean
  complete: boolean
}

function StepRow({ step }: { step: StepDef }) {
  function go() { window.location.href = step.href }

  return (
    <div className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: '0.5px solid #EEEBE6' }}>
      {/* Circle / check */}
      <div style={{
        flexShrink: 0,
        transition: 'transform 0.25s ease',
        transform: step.complete ? 'scale(1.1)' : 'scale(1)',
      }}>
        {step.complete
          ? <CheckCircle size={17} color="#6EBF8B" strokeWidth={2} />
          : <Circle      size={17} color="#1E2D3D" strokeWidth={1.5} />
        }
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[13px] font-medium"
          style={{
            color: step.complete ? '#9CA3AF' : '#1E2D3D',
            textDecoration: step.complete ? 'line-through' : 'none',
          }}>
          {step.label}
        </span>
        {step.optional && !step.complete && (
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
            optional
          </span>
        )}
      </div>

      {/* Action button */}
      {!step.complete && (
        <button
          onClick={go}
          className="flex-shrink-0 text-[11.5px] font-semibold px-3 py-1 rounded-lg cursor-pointer transition-all hover:opacity-80"
          style={{ background: 'rgba(233,160,32,0.1)', color: '#E9A020', border: '1px solid rgba(233,160,32,0.25)', whiteSpace: 'nowrap' }}
        >
          {step.actionLabel}
        </button>
      )}
    </div>
  )
}

export function SetupChecklist({ analysis }: { analysis: Analysis | null }) {
  const [show,       setShow]       = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [toast,      setToast]      = useState(false)
  const [mlConnected,  setMlConnected]  = useState(false)
  const [metaConnected, setMetaConnected] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('welcome-seen')) return
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => {
        if (!d.onboardingDismissed) {
          setMlConnected(!!d.mailerLiteConnected)
          setMetaConnected(!!d.metaConnected)
          setShow(true)
        }
      })
      .catch(() => {})
  }, [])

  const steps: StepDef[] = [
    {
      id: 'kdp', label: 'Upload your KDP report',
      actionLabel: 'Upload →', href: '/dashboard?upload=1',
      optional: false, complete: !!(analysis?.kdp),
    },
    {
      id: 'mailerlite', label: 'Connect MailerLite',
      actionLabel: 'Connect →', href: '/dashboard/settings#mailerlite',
      optional: false, complete: mlConnected,
    },
    {
      id: 'meta', label: 'Connect Meta Ads',
      actionLabel: 'Connect →', href: '/dashboard/settings#meta',
      optional: true, complete: metaConnected,
    },
  ]

  // Required steps (non-optional) all done
  const requiredDone = steps.filter(s => !s.optional).every(s => s.complete)

  // Auto-complete when required steps finish
  useEffect(() => {
    if (!show || completedRef.current || !requiredDone) return
    completedRef.current = true
    markDone(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredDone, show])

  function markDone(auto = false) {
    setDismissing(true)
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss-onboarding' }),
    }).catch(() => {})
    setTimeout(() => {
      setShow(false)
      if (auto) setToast(true)
    }, 400)
  }

  const remaining = steps.filter(s => !s.optional && !s.complete).length

  if (toast && !show) {
    return (
      <div
        className="mb-5 rounded-xl px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'rgba(110,191,139,0.1)', border: '1px solid rgba(110,191,139,0.3)' }}
      >
        <CheckCircle size={16} color="#6EBF8B" strokeWidth={2} />
        <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
          You&apos;re all set. Your coach is ready.
        </span>
      </div>
    )
  }

  if (!show) return null

  return (
    <div
      className="mb-5 rounded-xl overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #EEEBE6',
        borderLeft: '3px solid #E9A020',
        opacity: dismissing ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-none cursor-pointer"
        style={{ borderBottom: collapsed ? 'none' : '0.5px solid #EEEBE6' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold" style={{ color: '#1E2D3D' }}>
            ✦ Finish setting up AuthorDash
          </span>
          {remaining > 0 && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(233,160,32,0.12)', color: '#E9A020' }}>
              {remaining} step{remaining !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); markDone(false) }}
            className="text-[11px] bg-transparent border-none cursor-pointer"
            style={{ color: '#9CA3AF' }}
          >
            Dismiss
          </button>
          <ChevronDown
            size={15} color="#6B7280"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </div>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="px-4 pb-1">
          {steps.map(step => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  )
}
