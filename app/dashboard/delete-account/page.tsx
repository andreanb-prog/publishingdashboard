'use client'
// app/dashboard/delete-account/page.tsx — Account deletion with feedback
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

const REASONS = [
  "I don't use it enough",
  "It's missing features I need",
  "It's too expensive",
  "I'm switching to another tool",
  "I had a technical problem",
  "Other",
]

type Step = 'feedback' | 'confirm' | 'deleting'

export default function DeleteAccountPage() {
  const [step, setStep] = useState<Step>('feedback')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState('')

  async function handleDelete() {
    setStep('deleting')
    setError('')
    try {
      const res = await fetch('/api/user/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      })
      if (res.ok) {
        await signOut({ callbackUrl: '/?deleted=true' })
      } else {
        setError('Deletion failed — please try again or contact support@authordash.io')
        setStep('confirm')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('confirm')
    }
  }

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#FFF8F0' }}>
      <div className="max-w-lg mx-auto">

        <Link href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium no-underline hover:underline mb-10"
          style={{ color: '#6B7280', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ← Back to Settings
        </Link>

        {/* Step 1: Feedback */}
        {step === 'feedback' && (
          <div>
            <h1 className="text-[28px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Before you go…
            </h1>
            <p className="text-[14px] mb-8" style={{ color: '#6B7280' }}>
              Your feedback helps us improve AuthorDash for other authors. What's the main reason you're leaving?
            </p>

            <div className="space-y-2.5 mb-6">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="w-full text-left px-4 py-3.5 rounded-xl text-[14px] font-medium transition-all"
                  style={{
                    background: reason === r ? 'rgba(233,160,32,0.08)' : 'white',
                    border: `1.5px solid ${reason === r ? '#E9A020' : '#EEEBE6'}`,
                    color: reason === r ? '#1E2D3D' : '#374151',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: reason === r ? '#E9A020' : '#D1D5DB' }}>
                      {reason === r && (
                        <span className="w-2 h-2 rounded-full" style={{ background: '#E9A020' }} />
                      )}
                    </span>
                    {r}
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="block text-[12px] font-semibold uppercase tracking-[0.7px] mb-2"
                style={{ color: '#6B7280' }}>
                Anything else? <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Tell us what we could have done better…"
                className="w-full px-4 py-3 rounded-xl text-[14px] outline-none resize-none transition-all"
                style={{
                  border: '1.5px solid #EEEBE6',
                  color: '#1E2D3D',
                  background: 'white',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => reason ? setStep('confirm') : setStep('confirm')}
                className="px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90"
                style={{ background: '#1E2D3D', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {reason ? 'Continue →' : 'Skip & Continue →'}
              </button>
              <Link href="/dashboard"
                className="px-6 py-3 rounded-xl text-[14px] font-semibold no-underline transition-all"
                style={{ background: 'white', border: '1px solid #EEEBE6', color: '#1E2D3D' }}>
                Never mind
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {(step === 'confirm' || step === 'deleting') && (
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6"
              style={{ background: 'rgba(249,123,107,0.1)' }}>
              ⚠️
            </div>

            <h1 className="text-[28px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D' }}>
              Delete your account?
            </h1>
            <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
              This will permanently delete your AuthorDash account and all associated data. This cannot be undone.
            </p>

            <div className="rounded-xl p-5 mb-8" style={{ background: 'white', border: '1px solid #EEEBE6' }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: '#1E2D3D' }}>
                What gets deleted:
              </div>
              <ul className="space-y-2 text-[13px]" style={{ color: '#6B7280' }}>
                {[
                  'Your account & login credentials',
                  'All uploaded KDP sales data',
                  'Email marketing stats & analysis history',
                  'Meta Ads connection & token',
                  'Subscription & billing records',
                  'All saved settings and preferences',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span style={{ color: '#F97B6B' }}>✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 mb-5 text-[13px] font-semibold"
                style={{ background: 'rgba(249,123,107,0.1)', color: '#F97B6B', border: '1px solid rgba(249,123,107,0.2)' }}>
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={step === 'deleting'}
                className="px-6 py-3 rounded-xl text-[14px] font-bold transition-all disabled:opacity-60"
                style={{ background: '#F97B6B', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {step === 'deleting' ? 'Deleting everything…' : 'Yes, delete my account'}
              </button>
              <Link href="/dashboard"
                className="px-6 py-3 rounded-xl text-[14px] font-semibold no-underline transition-all"
                style={{ background: 'white', border: '1px solid #EEEBE6', color: '#1E2D3D' }}>
                Cancel
              </Link>
            </div>

            <button
              onClick={() => setStep('feedback')}
              className="mt-4 text-[12px] bg-transparent border-none cursor-pointer hover:underline"
              style={{ color: '#6B7280' }}
            >
              ← Back to feedback
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
