'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { BoutiqueButton, BoutiqueInput, BoutiqueCard } from '@/components/boutique'

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
    <div className="min-h-screen px-6 py-16" style={{ background: '#F7F1E6' }}>
      <div className="max-w-lg mx-auto">

        <Link href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium no-underline hover:underline mb-10"
          style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          ← Back to Settings
        </Link>

        {step === 'feedback' && (
          <div>
            <h1 className="text-[28px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D', fontFamily: 'var(--font-serif)' }}>
              Before you go…
            </h1>
            <p className="text-[14px] mb-8" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Your feedback helps us improve AuthorDash for other authors. What's the main reason you're leaving?
            </p>

            <div className="space-y-2.5 mb-6">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="w-full text-left px-4 py-3.5 text-[14px] font-medium transition-all"
                  style={{
                    background: reason === r ? 'rgba(217,119,6,0.06)' : 'white',
                    border: `1.5px solid ${reason === r ? '#D97706' : '#E8E1D3'}`,
                    borderRadius: 0,
                    color: reason === r ? '#1E2D3D' : '#374151',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: reason === r ? '#D97706' : '#D1D5DB' }}>
                      {reason === r && (
                        <span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} />
                      )}
                    </span>
                    {r}
                  </span>
                </button>
              ))}
            </div>

            <BoutiqueInput
              multiline
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Tell us what we could have done better…"
              label="Anything else? (optional)"
              style={{ marginBottom: 32 }}
            />

            <div className="flex items-center gap-3">
              <BoutiqueButton variant="primary" onClick={() => setStep('confirm')}>
                {reason ? 'Continue →' : 'Skip & Continue →'}
              </BoutiqueButton>
              <Link href="/dashboard">
                <BoutiqueButton variant="ghost">Never mind</BoutiqueButton>
              </Link>
            </div>
          </div>
        )}

        {(step === 'confirm' || step === 'deleting') && (
          <div>
            <div className="w-14 h-14 flex items-center justify-center mb-6" style={{
              border: '1px solid #E8E1D3',
              borderRadius: 0,
              background: 'rgba(249,123,107,0.06)',
            }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: '#F97B6B', fontWeight: 300 }}>!</span>
            </div>

            <h1 className="text-[28px] font-bold tracking-tight mb-2" style={{ color: '#1E2D3D', fontFamily: 'var(--font-serif)' }}>
              Delete your account?
            </h1>
            <p className="text-[14px] mb-6" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              This will permanently delete your AuthorDash account and all associated data. This cannot be undone.
            </p>

            <BoutiqueCard style={{ padding: 20, marginBottom: 32 }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: '#1E2D3D', fontFamily: 'var(--font-sans)' }}>
                What gets deleted:
              </div>
              <ul className="space-y-2 text-[13px]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
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
            </BoutiqueCard>

            {error && (
              <div className="px-4 py-3 mb-5 text-[13px] font-semibold"
                style={{ background: 'rgba(249,123,107,0.08)', color: '#F97B6B', border: '1px solid rgba(249,123,107,0.2)', borderRadius: 0 }}>
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <BoutiqueButton variant="danger" onClick={handleDelete} disabled={step === 'deleting'}>
                {step === 'deleting' ? 'Deleting everything…' : 'Yes, delete my account'}
              </BoutiqueButton>
              <Link href="/dashboard">
                <BoutiqueButton variant="ghost">Cancel</BoutiqueButton>
              </Link>
            </div>

            <button
              onClick={() => setStep('feedback')}
              className="mt-4 bg-transparent border-none cursor-pointer hover:underline"
              style={{ color: '#6B7280', fontSize: 12, fontFamily: 'var(--font-sans)' }}
            >
              ← Back to feedback
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
