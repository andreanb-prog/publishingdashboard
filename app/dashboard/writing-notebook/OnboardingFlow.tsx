'use client'
import { useState, useEffect } from 'react'
import {
  BookOpen, Pencil, Save, CreditCard, User, Lock,
  AlertTriangle, Info, CheckCircle, XCircle, Check,
} from 'lucide-react'

type BillingPath = 'new' | 'existing' | null

interface OnboardingFlowProps {
  onComplete: () => void
  /** Start at a specific step (e.g. when re-entering from settings key prompt) */
  startStep?: number
}

const LS_KEY = 'wn_onboarding_step'

export function OnboardingFlow({ onComplete, startStep }: OnboardingFlowProps) {
  const [step, setStep] = useState(() => {
    if (startStep !== undefined) return startStep
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_KEY)
      return saved ? parseInt(saved, 10) : 1
    }
    return 1
  })
  const [billingPath, setBillingPath] = useState<BillingPath>(null)
  const [apiKey, setApiKey] = useState('')
  const [keyState, setKeyState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(step))
  }, [step])

  const goNext = () => setStep(s => s + 1)
  const goBack = () => setStep(s => s - 1)

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return
    setKeyState('saving')
    try {
      const res = await fetch('/api/writing-notebook/setup-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setKeyState('success')
        setTimeout(() => setStep(5), 1400)
      } else {
        setKeyState('error')
      }
    } catch {
      setKeyState('error')
    }
  }

  const handleFinish = async () => {
    await fetch('/api/writing-notebook/complete-onboarding', { method: 'POST' })
    localStorage.removeItem(LS_KEY)
    onComplete()
  }

  const handleSkipKey = () => {
    setStep(5)
  }

  // Progress dots
  const ProgressDots = () => {
    const totalSteps = 5
    const displayStep = step > 5 ? 5 : step
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => {
          const s = i + 1
          const isActive = s === displayStep
          const isComplete = s < displayStep
          return (
            <div
              key={s}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: isComplete ? '#6EBF8B' : isActive ? '#E9A020' : 'transparent',
                border: isComplete || isActive ? 'none' : '1.5px solid #D1D5DB',
              }}
            />
          )
        })}
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AmberBtn = ({
    children,
    onClick,
    disabled,
    fullWidth,
    icon: Icon,
  }: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    fullWidth?: boolean
    icon?: any
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[14px] font-semibold transition-all
        ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
      style={{ background: '#E9A020', color: 'white', border: 'none' }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )

  const GhostBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-6 py-3 rounded-lg text-[14px] font-semibold cursor-pointer transition-all hover:opacity-70"
      style={{ background: 'transparent', color: '#1E2D3D', border: '1px solid #E5E7EB' }}
    >
      {children}
    </button>
  )

  const SkipLink = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="block mx-auto mt-4 text-[12px] cursor-pointer bg-transparent border-none"
      style={{ color: '#9CA3AF' }}
    >
      Skip for now — I&apos;ll add this later
    </button>
  )

  // ── SCREEN 1 ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ProgressDots />
        <h1 className="text-[24px] font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
          Welcome to your Writing Notebook
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: '#6B7280' }}>
          This is where you write your book with AI help — one chapter at a time. We&apos;ll walk you through setup. It takes about 5 minutes.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {[
            { Icon: BookOpen, title: 'Your book, all in one place', body: 'Outline, characters, and style guide saved here. The AI reads all of it before helping you write.' },
            { Icon: Pencil, title: 'Write chapters with AI', body: 'Ask the AI to write a chapter, continue a scene, or fix the pacing. It knows your story and your style.' },
            { Icon: Save, title: 'Everything saves automatically', body: 'Every word you type is saved as you go. Come back any time and pick up exactly where you left off.' },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-4 rounded-lg"
              style={{ background: '#FFF8F0' }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon size={20} style={{ color: '#E9A020' }} />
              </div>
              <div>
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{title}</div>
                <div className="text-[13px]" style={{ color: '#6B7280' }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        <AmberBtn onClick={goNext} fullWidth>Let&apos;s get started →</AmberBtn>
      </div>
    )
  }

  // ── SCREEN 2 ─────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ProgressDots />
        <h1 className="text-[24px] font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
          One quick setup step
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: '#6B7280' }}>
          The writing assistant uses Anthropic&apos;s AI. To connect it you&apos;ll need an API key — a code that links your account. Choose how you want to set that up:
        </p>

        <div className="flex flex-col gap-3 mb-6">
          {/* Card A */}
          <button
            onClick={() => setBillingPath('new')}
            className="text-left p-5 rounded-lg cursor-pointer transition-all w-full"
            style={{
              background: billingPath === 'new' ? 'rgba(233,160,32,0.06)' : 'white',
              border: billingPath === 'new' ? '2px solid #E9A020' : '0.5px solid #E5E7EB',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <CreditCard size={20} style={{ color: '#E9A020' }} />
              <span className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>Pay only for what you use</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FFF4E0', color: '#E9A020' }}>New account</span>
            </div>
            <p className="text-[13px] m-0" style={{ color: '#6B7280' }}>
              Create a free Anthropic account and add a small amount of credits. About $0.01–0.02 per chapter — a full novel costs less than $1. $5 in credits is more than enough.
            </p>
          </button>

          {/* Card B */}
          <button
            onClick={() => setBillingPath('existing')}
            className="text-left p-5 rounded-lg cursor-pointer transition-all w-full"
            style={{
              background: billingPath === 'existing' ? 'rgba(233,160,32,0.06)' : 'white',
              border: billingPath === 'existing' ? '2px solid #E9A020' : '0.5px solid #E5E7EB',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <User size={20} style={{ color: '#6EBF8B' }} />
              <span className="text-[15px] font-semibold" style={{ color: '#1E2D3D' }}>I already have a Claude subscription</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(110,191,139,0.12)', color: '#6EBF8B' }}>Existing account</span>
            </div>
            <p className="text-[13px] m-0" style={{ color: '#6B7280' }}>
              If you use Claude.ai (Pro or Team), you already have an Anthropic account. You can get an API key from there — no extra charges, just log in and copy your key.
            </p>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <GhostBtn onClick={goBack}>← Back</GhostBtn>
          <AmberBtn onClick={goNext} disabled={!billingPath}>
            Next — show me how →
          </AmberBtn>
        </div>
        <SkipLink onClick={handleSkipKey} />
      </div>
    )
  }

  // ── SCREEN 3A — New account ──────────────────────────
  if (step === 3 && billingPath === 'new') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ProgressDots />
        <h1 className="text-[24px] font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
          Setting up a new account
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: '#6B7280' }}>
          Follow these steps — it takes about 3 minutes. Click the link in Step 1 to open Anthropic&apos;s site in a new tab, then come back here.
        </p>

        <div className="rounded-lg p-6 mb-6" style={{ background: 'white', border: '0.5px solid #E5E7EB' }}>
          {[
            {
              num: 1,
              title: 'Open Anthropic\'s website',
              body: (
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                  className="text-[13px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>
                  Click to open in a new tab: console.anthropic.com →
                </a>
              ),
            },
            {
              num: 2,
              title: 'Create an account',
              body: <span className="text-[13px]" style={{ color: '#6B7280' }}>Click Sign Up and use your email address. It&apos;s free to create an account.</span>,
            },
            {
              num: 3,
              title: 'Add credits',
              body: (
                <div>
                  <span className="text-[13px]" style={{ color: '#6B7280' }}>Once logged in, find Billing in the left menu and add credits. $5 is more than enough to write a full novel.</span>
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                    <Info size={14} style={{ color: '#9CA3AF', flexShrink: 0, marginTop: 2 }} />
                    <span className="text-[12px]" style={{ color: '#6B7280' }}>Each chapter costs about $0.01–0.02. A full 40-chapter novel costs under $1 total.</span>
                  </div>
                </div>
              ),
            },
            {
              num: 4,
              title: 'Go to API Keys',
              body: <span className="text-[13px]" style={{ color: '#6B7280' }}>Look for API Keys in the left menu. Click it.</span>,
            },
            {
              num: 5,
              title: 'Create and copy your key',
              body: (
                <div>
                  <span className="text-[13px]" style={{ color: '#6B7280' }}>Click Create Key, name it anything (like &quot;My Writing Notebook&quot;), then click Copy. You&apos;ll see a long code starting with sk-ant-.</span>
                  <div className="flex items-start gap-2 mt-3 p-3" style={{ borderLeft: '3px solid #E9A020', background: '#FFFBF0' }}>
                    <AlertTriangle size={14} style={{ color: '#E9A020', flexShrink: 0, marginTop: 2 }} />
                    <span className="text-[12px]" style={{ color: '#6B7280' }}>Save this somewhere safe — like a notes app. You can only see it once on Anthropic&apos;s site.</span>
                  </div>
                </div>
              ),
            },
          ].map(({ num, title, body }) => (
            <div key={num} className="flex items-start gap-4 mb-5 last:mb-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                style={{ background: '#E9A020', color: 'white' }}
              >
                {num}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{title}</div>
                {body}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <GhostBtn onClick={goBack}>← Back</GhostBtn>
          <AmberBtn onClick={() => setStep(4)}>I&apos;ve copied my key →</AmberBtn>
        </div>
        <SkipLink onClick={handleSkipKey} />
      </div>
    )
  }

  // ── SCREEN 3B — Existing subscription ────────────────
  if (step === 3 && billingPath === 'existing') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ProgressDots />
        <h1 className="text-[24px] font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
          Getting your key from Claude.ai
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: '#6B7280' }}>
          Since you already have a Claude subscription, you have an Anthropic account. Here&apos;s how to get your API key.
        </p>

        <div className="rounded-lg p-6 mb-6" style={{ background: 'white', border: '0.5px solid #E5E7EB' }}>
          {[
            {
              num: 1,
              title: 'Open the Anthropic console',
              body: (
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                  className="text-[13px] font-semibold no-underline hover:underline" style={{ color: '#E9A020' }}>
                  console.anthropic.com → — open in a new tab.
                </a>
              ),
            },
            {
              num: 2,
              title: 'Sign in with your existing account',
              body: <span className="text-[13px]" style={{ color: '#6B7280' }}>Use the same email you use for Claude.ai. Click Sign In — don&apos;t create a new account.</span>,
            },
            {
              num: 3,
              title: 'Go to API Keys',
              body: <span className="text-[13px]" style={{ color: '#6B7280' }}>Look for API Keys in the left menu. Click it.</span>,
            },
            {
              num: 4,
              title: 'Create and copy your key',
              body: (
                <div>
                  <span className="text-[13px]" style={{ color: '#6B7280' }}>Click Create Key, name it anything (like &quot;My Writing Notebook&quot;), then click Copy. You&apos;ll see a long code starting with sk-ant-.</span>
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                    <Info size={14} style={{ color: '#9CA3AF', flexShrink: 0, marginTop: 2 }} />
                    <span className="text-[12px]" style={{ color: '#6B7280' }}>API usage is billed separately from your Claude.ai subscription — but at $0.01–0.02 per chapter it&apos;s minimal. $5 in credits goes a very long way.</span>
                  </div>
                </div>
              ),
            },
          ].map(({ num, title, body }) => (
            <div key={num} className="flex items-start gap-4 mb-5 last:mb-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                style={{ background: '#E9A020', color: 'white' }}
              >
                {num}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{title}</div>
                {body}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <GhostBtn onClick={goBack}>← Back</GhostBtn>
          <AmberBtn onClick={() => setStep(4)}>I&apos;ve copied my key →</AmberBtn>
        </div>
        <SkipLink onClick={handleSkipKey} />
      </div>
    )
  }

  // ── SCREEN 4 — Paste key ─────────────────────────────
  if (step === 4) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <ProgressDots />
        <h1 className="text-[24px] font-bold text-center mb-2" style={{ color: '#1E2D3D' }}>
          Paste your key here
        </h1>
        <p className="text-[14px] text-center mb-8" style={{ color: '#6B7280' }}>
          This is the code you just copied. It starts with sk-ant- and is quite long.
        </p>

        <div className="mb-6">
          <label className="flex items-center gap-2 text-[13px] font-semibold mb-2" style={{ color: '#1E2D3D' }}>
            <Lock size={14} style={{ color: '#6B7280' }} />
            Your Anthropic key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setKeyState('idle') }}
            placeholder="sk-ant-..."
            className="w-full h-12 px-4 rounded-lg text-[14px] outline-none transition-all"
            style={{
              border: keyState === 'success' ? '1.5px solid #6EBF8B' :
                keyState === 'error' ? '1.5px solid #F97B6B' : '1px solid #E5E7EB',
              background: keyState === 'success' ? 'rgba(110,191,139,0.06)' :
                keyState === 'error' ? 'rgba(249,123,107,0.06)' : 'white',
              color: '#1E2D3D',
            }}
          />
          {keyState === 'idle' && (
            <p className="text-[12px] mt-2 m-0" style={{ color: '#9CA3AF' }}>
              Encrypted and stored securely. Only used to power your writing assistant — nothing else, ever.
            </p>
          )}
          {keyState === 'success' && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle size={14} style={{ color: '#6EBF8B' }} />
              <span className="text-[12px] font-semibold" style={{ color: '#6EBF8B' }}>Key verified — you&apos;re all set.</span>
            </div>
          )}
          {keyState === 'error' && (
            <div className="flex items-center gap-2 mt-2">
              <XCircle size={14} style={{ color: '#F97B6B' }} />
              <span className="text-[12px] font-semibold" style={{ color: '#F97B6B' }}>That key doesn&apos;t seem right. Make sure you copied the whole thing — it starts with sk-ant- and is quite long.</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <GhostBtn onClick={() => setStep(3)}>← Back</GhostBtn>
          <AmberBtn
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || keyState === 'saving' || keyState === 'success'}
            icon={Lock}
          >
            {keyState === 'saving' ? 'Verifying...' : 'Save my key and continue'}
          </AmberBtn>
        </div>
        <SkipLink onClick={handleSkipKey} />
      </div>
    )
  }

  // ── SCREEN 5 — Done ──────────────────────────────────
  if (step === 5) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <ProgressDots />
        <div
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(110,191,139,0.12)' }}
        >
          <CheckCircle size={28} style={{ color: '#6EBF8B' }} />
        </div>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: '#1E2D3D' }}>
          You&apos;re all set!
        </h1>
        <p className="text-[14px] mb-8" style={{ color: '#6B7280' }}>
          Here&apos;s what to do first:
        </p>

        <div className="flex flex-col gap-3 mb-8 text-left max-w-md mx-auto">
          {[
            'Choose which book you\'re working on — or add a new one from the dropdown at the top',
            'Fill in your Story Outline in the Setup tab so the AI knows your story',
            'Switch to the Writing tab and ask the AI to write your first chapter',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#6EBF8B' }}
              >
                <Check size={12} style={{ color: 'white' }} />
              </div>
              <span className="text-[13px]" style={{ color: '#1E2D3D' }}>{text}</span>
            </div>
          ))}
        </div>

        <AmberBtn onClick={handleFinish} fullWidth icon={BookOpen}>
          Open my Writing Notebook →
        </AmberBtn>
      </div>
    )
  }

  // Fallback — should not reach
  return null
}
