'use client'
// app/pricing/page.tsx — Public pricing page with two plans
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PLANS = [
  {
    key: 'regular',
    name: 'AuthorDash Pro',
    price: '$29',
    period: '/month',
    description: 'Everything you need to make smarter marketing decisions.',
    features: [
      'AI-powered coaching on every page',
      'KDP, Meta, MailerLite, Pinterest analytics',
      'Cross-channel action plans',
      'Advanced metrics & funnel analysis',
      'Rank tracker & ROAS log',
      'Weekly email digest',
      'Unlimited file uploads',
    ],
    cta: 'Start 14-Day Free Trial',
    popular: true,
  },
  {
    key: 'fpa',
    name: 'FPA Circle Member',
    price: '$19',
    period: '/month',
    description: 'Exclusive rate for Fiction Publishing Academy members.',
    features: [
      'Everything in Pro',
      'FPA-exclusive pricing (save 34%)',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Claim FPA Price',
    badge: 'FPA EXCLUSIVE',
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const expired = searchParams.get('expired')

  async function handleCheckout(plan: string) {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, coupon: plan === 'fpa' ? 'FPA2026' : undefined }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-16">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <Link href="/login" className="text-[12px] font-semibold no-underline hover:underline mb-8 inline-block"
          style={{ color: '#6B7280' }}>
          ← Back
        </Link>

        {/* Expired banner */}
        {expired && (
          <div className="rounded-xl p-4 mb-6" style={{ background: '#FFF5F4', border: '1px solid rgba(249,123,107,0.2)' }}>
            <div className="text-[13px] font-medium" style={{ color: '#F97B6B' }}>
              Your free trial has ended. Choose a plan to continue using AuthorDash.
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[16px] font-medium mb-3" style={{ color: '#4A7290', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            Author<span style={{ color: '#E9A020' }}>Dash</span>
          </div>
          <h1 className="text-[32px] font-bold tracking-tight mb-3" style={{ color: '#1E2D3D' }}>
            Your indie author marketing coach
          </h1>
          <p className="text-[15px] max-w-lg mx-auto" style={{ color: '#6B7280' }}>
            Stop guessing. Start growing. Every plan includes a 14-day free trial — no credit card required to start.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {PLANS.map(plan => (
            <div key={plan.key} className="rounded-xl p-6 relative"
              style={{
                background: 'white',
                border: plan.popular ? '2px solid #E9A020' : '1px solid #EEEBE6',
                boxShadow: plan.popular ? '0 4px 16px rgba(233,160,32,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: '#E9A020', color: 'white' }}>
                  MOST POPULAR
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold"
                  style={{ background: '#4A7290', color: 'white' }}>
                  {plan.badge}
                </div>
              )}

              <div className="text-[14px] font-semibold mb-1" style={{ color: '#1E2D3D' }}>{plan.name}</div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-[36px] font-bold tracking-tight" style={{ color: '#1E2D3D' }}>{plan.price}</span>
                <span className="text-[14px]" style={{ color: '#6B7280' }}>{plan.period}</span>
              </div>
              <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>{plan.description}</p>

              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: '#374151' }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: '#6EBF8B' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={loading !== null}
                className="w-full py-3 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
                style={{
                  background: plan.popular ? '#E9A020' : '#1E2D3D',
                  color: plan.popular ? '#0d1f35' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {loading === plan.key ? 'Redirecting to checkout...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="text-center text-[13px] mb-8" style={{ color: '#6B7280' }}>
          <p>Cancel anytime. No lock-ins. Questions? <a href="mailto:support@authordash.io" style={{ color: '#E9A020' }}>support@authordash.io</a></p>
        </div>
        <div className="flex justify-center gap-6 text-[12px]" style={{ color: '#6B7280' }}>
          <a href="/privacy" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Privacy</a>
          <a href="/terms" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Terms</a>
          <a href="/data" className="no-underline hover:underline" style={{ color: '#6B7280' }}>Your Data</a>
        </div>
      </div>
    </div>
  )
}
