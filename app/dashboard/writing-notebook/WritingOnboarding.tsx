'use client'
import { useState, useEffect } from 'react'
import {
  BookOpen, Pencil, Save, CreditCard, User, Info,
  AlertTriangle, XCircle, CheckCircle, Lock, ArrowRight, ChevronLeft,
} from 'lucide-react'

interface Props {
  onComplete: () => void
}

export function WritingOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('wn_onboarding_step') || '1', 10)
    }
    return 1
  })
  const [billingPath, setBillingPath] = useState<'new' | 'existing' | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [keyError, setKeyError] = useState('')

  useEffect(() => {
    localStorage.setItem('wn_onboarding_step', String(step))
  }, [step])

  const handleSaveKey = async () => {
    if (!apiKey.startsWith('sk-ant-')) {
      setKeyStatus('error')
      setKeyError("That key doesn't seem right. Make sure you copied the whole thing — starts with sk-ant-.")
      return
    }
    setKeyStatus('saving')
    try {
      const res = await fetch('/api/writing-notebook/setup-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey }),
      })
      if (res.ok) {
        setKeyStatus('success')
        setTimeout(() => setStep(5), 1400)
      } else {
        setKeyStatus('error')
        setKeyError("That key doesn't seem right. Make sure you copied the whole thing — starts with sk-ant-.")
      }
    } catch {
      setKeyStatus('error')
      setKeyError('Something went wrong. Please try again.')
    }
  }

  const handleComplete = async () => {
    await fetch('/api/writing-notebook/complete-onboarding', { method: 'POST' })
    localStorage.removeItem('wn_onboarding_step')
    onComplete()
  }

  const dots = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{
            background: i < step ? '#6EBF8B' : i === step ? '#E9A020' : '#D1D5DB',
          }}
        />
      ))}
    </div>
  )

  const skipLink = (targetStep: number) => (
    <button
      onClick={() => setStep(targetStep)}
      className="block mx-auto mt-4 text-xs bg-transparent border-none cursor-pointer"
      style={{ color: '#9CA3AF' }}
    >
      Skip for now — I'll add this later
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,45,61,0.5)' }}>
      <div
        className="w-full max-w-lg mx-4 rounded-xl shadow-xl overflow-y-auto"
        style={{ background: '#FFFFFF', maxHeight: '90vh' }}
      >
        <div className="p-6 sm:p-8">
          {dots}

          {/* SCREEN 1 — Welcome */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
                Welcome to your Writing Notebook
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                This is where you write your book with AI help — one chapter at a time.
                We'll walk you through setup. It takes about 5 minutes.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { Icon: BookOpen, title: 'Your book, all in one place', desc: 'Outline, characters, and style guide saved here. The AI reads all of it before helping you write.' },
                  { Icon: Pencil, title: 'Write chapters with AI', desc: 'Ask the AI to write a chapter, continue a scene, or fix the pacing. It knows your story and your style.' },
                  { Icon: Save, title: 'Everything saves automatically', desc: 'Every word you type is saved as you go. Come back any time and pick up exactly where you left off.' },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} className="flex gap-3 p-4 rounded-lg" style={{ background: '#FFF8F0' }}>
                    <Icon size={20} style={{ color: '#E9A020', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>{title}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: '#E9A020', color: '#FFFFFF' }}
              >
                Let's get started
              </button>
            </div>
          )}

          {/* SCREEN 2 — Choose billing path */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
                One quick setup step
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                The writing assistant uses Anthropic's AI. To connect it you'll need an API key.
                Choose how you want to set that up:
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setBillingPath('new')}
                  className="w-full text-left p-4 rounded-lg border-2 cursor-pointer transition-all bg-transparent"
                  style={{
                    borderColor: billingPath === 'new' ? '#E9A020' : '#E5E7EB',
                    background: billingPath === 'new' ? '#FFF8F0' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard size={16} style={{ color: '#E9A020' }} />
                    <span className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>Pay only for what you use</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFF4E0', color: '#E9A020' }}>New account</span>
                  </div>
                  <p className="text-xs ml-6" style={{ color: '#6B7280' }}>
                    Create a free Anthropic account and add a small amount of credits.
                    About $0.01–0.02 per chapter — a full novel costs less than $1.
                    $5 in credits is more than enough.
                  </p>
                </button>

                <button
                  onClick={() => setBillingPath('existing')}
                  className="w-full text-left p-4 rounded-lg border-2 cursor-pointer transition-all bg-transparent"
                  style={{
                    borderColor: billingPath === 'existing' ? '#E9A020' : '#E5E7EB',
                    background: billingPath === 'existing' ? '#FFF8F0' : '#FFFFFF',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} style={{ color: '#6EBF8B' }} />
                    <span className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>I already have a Claude subscription</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E8F5E9', color: '#6EBF8B' }}>Existing account</span>
                  </div>
                  <p className="text-xs ml-6" style={{ color: '#6B7280' }}>
                    If you use Claude.ai (Pro or Team), you already have an Anthropic account.
                    You can get an API key from there — no extra charges.
                  </p>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border-none cursor-pointer bg-transparent"
                  style={{ color: '#6B7280' }}
                >
                  <ChevronLeft size={14} className="inline mr-1" /> Back
                </button>
                <button
                  onClick={() => setStep(billingPath === 'new' ? 3 : billingPath === 'existing' ? 3 : 2)}
                  disabled={!billingPath}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity"
                  style={{
                    background: billingPath ? '#E9A020' : '#D1D5DB',
                    color: '#FFFFFF',
                    opacity: billingPath ? 1 : 0.5,
                  }}
                >
                  Next — show me how
                </button>
              </div>

              {skipLink(5)}
            </div>
          )}

          {/* SCREEN 3 — Instructions (both paths) */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
                {billingPath === 'new' ? 'Setting up a new account' : 'Getting your key from Claude.ai'}
              </h2>

              <div className="p-4 rounded-lg space-y-3 mb-6" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <Step n={1}>
                  Open Anthropic's website —{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener" className="font-medium" style={{ color: '#E9A020' }}>
                    console.anthropic.com
                  </a>
                </Step>
                {billingPath === 'new' ? (
                  <>
                    <Step n={2}>Create an account — Click Sign Up. Free to create.</Step>
                    <Step n={3}>
                      Add credits — Find Billing in left menu. Add $5.
                      <div className="flex gap-2 mt-2 p-2.5 rounded-lg text-xs" style={{ background: '#F3F4F6' }}>
                        <Info size={14} style={{ color: '#6B7280', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: '#6B7280' }}>Each chapter costs $0.01–0.02. A full novel costs under $1.</span>
                      </div>
                    </Step>
                  </>
                ) : (
                  <Step n={2}>
                    Sign in with your existing account — same email as Claude.ai.
                    Don't create a new account.
                  </Step>
                )}
                <Step n={billingPath === 'new' ? 4 : 3}>Go to API Keys — Look for API Keys in left menu.</Step>
                <Step n={billingPath === 'new' ? 5 : 4}>
                  Create and copy your key — Click Create Key, name it anything, click Copy.
                  Code starts with sk-ant-.
                  <div className="flex gap-2 mt-2 p-2.5 rounded-lg text-xs" style={{ background: '#FFF8F0', borderLeft: '3px solid #E9A020' }}>
                    <AlertTriangle size={14} style={{ color: '#E9A020', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: '#1E2D3D' }}>Save this somewhere safe. You can only see it once.</span>
                  </div>
                </Step>
                {billingPath === 'existing' && (
                  <div className="flex gap-2 mt-2 p-2.5 rounded-lg text-xs" style={{ background: '#F3F4F6' }}>
                    <Info size={14} style={{ color: '#6B7280', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: '#6B7280' }}>API usage billed separately from Claude.ai subscription but at $0.01–0.02 per chapter it's minimal.</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border-none cursor-pointer bg-transparent"
                  style={{ color: '#6B7280' }}
                >
                  <ChevronLeft size={14} className="inline mr-1" /> Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: '#E9A020', color: '#FFFFFF' }}
                >
                  I've copied my key <ArrowRight size={14} className="inline ml-1" />
                </button>
              </div>
              {skipLink(5)}
            </div>
          )}

          {/* SCREEN 4 — Paste key */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
                Paste your key here
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                Starts with sk-ant- and is quite long.
              </p>

              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2" style={{ color: '#1E2D3D' }}>
                  <Lock size={14} style={{ color: '#E9A020' }} /> Your Anthropic key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setKeyStatus('idle') }}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB', fontFamily: 'monospace' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>
                  Encrypted and stored securely. Only used to power your writing assistant — nothing else, ever.
                </p>
              </div>

              {keyStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: '#E8F5E9' }}>
                  <CheckCircle size={16} style={{ color: '#6EBF8B' }} />
                  <span className="text-sm font-medium" style={{ color: '#1E2D3D' }}>Key verified — you're all set.</span>
                </div>
              )}
              {keyStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: '#FEE2E2' }}>
                  <XCircle size={16} style={{ color: '#F97B6B' }} />
                  <span className="text-sm" style={{ color: '#1E2D3D' }}>{keyError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border-none cursor-pointer bg-transparent"
                  style={{ color: '#6B7280' }}
                >
                  <ChevronLeft size={14} className="inline mr-1" /> Back
                </button>
                <button
                  onClick={handleSaveKey}
                  disabled={keyStatus === 'saving' || keyStatus === 'success'}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    background: '#E9A020',
                    color: '#FFFFFF',
                    opacity: keyStatus === 'saving' ? 0.7 : 1,
                  }}
                >
                  <Lock size={14} />
                  {keyStatus === 'saving' ? 'Verifying...' : 'Save my key and continue'}
                </button>
              </div>
              {skipLink(5)}
            </div>
          )}

          {/* SCREEN 5 — You're in */}
          {step === 5 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#E8F5E9' }}>
                <CheckCircle size={28} style={{ color: '#6EBF8B' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1E2D3D' }}>You're all set!</h2>
              <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Here's what to do first:</p>

              <div className="text-left space-y-3 mb-6">
                {[
                  'Choose which book — or add one from the dropdown at the top',
                  'Fill in your Story Outline in Setup so the AI knows your story',
                  'Switch to Writing and ask the AI to write your first chapter',
                ].map((text, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#E8F5E9' }}>
                      <CheckCircle size={12} style={{ color: '#6EBF8B' }} />
                    </div>
                    <span className="text-sm" style={{ color: '#1E2D3D' }}>{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: '#E9A020', color: '#FFFFFF' }}
              >
                <BookOpen size={16} /> Open my Writing Notebook
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{ background: '#FFF4E0', color: '#E9A020' }}
      >
        {n}
      </div>
      <div className="text-sm flex-1" style={{ color: '#1E2D3D' }}>{children}</div>
    </div>
  )
}
