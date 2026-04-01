'use client'
// app/(auth)/login/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const [callbackUrl, setCallbackUrl] = useState('/dashboard')
  const [promoCode, setPromoCode] = useState('')
  const [promoStatus, setPromoStatus] = useState<null | { valid: boolean; description?: string; error?: string }>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCallbackUrl(params.get('callbackUrl') || '/dashboard')
  }, [])

  async function validatePromo() {
    if (!promoCode.trim()) return
    setChecking(true)
    setPromoStatus(null)
    try {
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      })
      const data = await res.json()
      setPromoStatus(data)
    } catch {
      setPromoStatus({ valid: false, error: 'Could not validate code' })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center px-16"
        style={{ background: '#FFF8F0' }}>
        <div className="max-w-md">
          <div className="font-serif text-[42px] leading-tight mb-4" style={{ color: '#1E2D3D' }}>
            Author<span style={{ color: '#e9a020' }}>Dash</span>
          </div>
          <p className="text-[17px] leading-relaxed mb-6" style={{ color: '#374151' }}>
            Your marketing data, your coaching insights, your decisions.
          </p>
          <div className="space-y-3">
            {[
              'Real-time KDP sales and KENP tracking',
              'Meta Ads performance with coach recommendations',
              'MailerLite email analytics and benchmarks',
              'Newsletter swap calendar and tracking',
              'Pinterest growth monitoring',
            ].map(feature => (
              <div key={feature} className="flex items-start gap-2.5">
                <span className="text-[14px] mt-0.5" style={{ color: '#e9a020' }}>&#10003;</span>
                <span className="text-[14px]" style={{ color: '#6B7280' }}>{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2">
            <span className="inline-block text-[9px] font-bold tracking-[1.5px] uppercase px-2 py-0.5 rounded"
              style={{ background: 'rgba(233,160,32,0.15)', color: '#e9a020' }}>
              BETA
            </span>
            <span className="text-[12px]" style={{ color: '#6B7280' }}>
              Free during beta period
            </span>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center px-6"
        style={{ background: 'white' }}>
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="md:hidden text-center mb-8">
            <div className="font-serif text-[28px]" style={{ color: '#1E2D3D' }}>
              Author<span style={{ color: '#e9a020' }}>Dash</span>
            </div>
            <p className="text-[13px] mt-1" style={{ color: '#6B7280' }}>
              Your indie author marketing coach
            </p>
          </div>

          <h2 className="font-serif text-[22px] mb-1" style={{ color: '#1E2D3D' }}>
            Welcome back
          </h2>
          <p className="text-[13px] mb-8" style={{ color: '#6B7280' }}>
            Sign in with Google to access your dashboard.
          </p>

          {/* Google SSO */}
          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl
                       font-semibold text-[14px] transition-all duration-150 cursor-pointer"
            style={{
              background: 'white',
              border: '1.5px solid #E7E5E4',
              color: '#1E2D3D',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F4')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: '#E7E5E4' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#6B7280' }}>HAVE A PROMO CODE?</span>
            <div className="flex-1 h-px" style={{ background: '#E7E5E4' }} />
          </div>

          {/* Promo code */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter code"
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && validatePromo()}
              className="flex-1 rounded-lg px-3 py-2.5 text-[13px] font-mono uppercase tracking-wider outline-none"
              style={{ border: '1.5px solid #E7E5E4', color: '#1E2D3D' }}
            />
            <button
              onClick={validatePromo}
              disabled={checking || !promoCode.trim()}
              className="px-4 py-2.5 rounded-lg text-[12.5px] font-semibold transition-all disabled:opacity-40 border-none cursor-pointer"
              style={{ background: '#e9a020', color: '#0d1f35' }}
            >
              {checking ? '...' : 'Apply'}
            </button>
          </div>
          {promoStatus && (
            <div className="mt-2 text-[12px] font-semibold"
              style={{ color: promoStatus.valid ? '#34d399' : '#fb7185' }}>
              {promoStatus.valid
                ? `✓ ${promoStatus.description}`
                : promoStatus.error}
            </div>
          )}

          {/* Footer */}
          <p className="text-[11px] text-center mt-8 leading-relaxed" style={{ color: '#6B7280' }}>
            By signing in, you agree to keep your API keys secure.
            We never share your data.
          </p>

          <div className="flex items-center justify-center gap-5 mt-6">
            <Link href="/privacy"
              className="text-[11px] no-underline hover:underline"
              style={{ color: '#6B7280' }}>
              Privacy Policy
            </Link>
            <span style={{ color: '#E7E5E4' }}>·</span>
            <Link href="/terms"
              className="text-[11px] no-underline hover:underline"
              style={{ color: '#6B7280' }}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
