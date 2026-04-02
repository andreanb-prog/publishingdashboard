'use client'
// app/dashboard/settings/billing/page.tsx — Billing management
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function BillingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const status = session?.user?.subscriptionStatus
  const plan = session?.user?.subscriptionPlan
  const trialEndsAt = session?.user?.trialEndsAt

  const isTrialing = status === 'trialing'
  const isActive = status === 'active'
  const isCanceled = status === 'canceled'
  const isPastDue = status === 'past_due'

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  async function handleUpgrade(planKey: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/settings" className="text-[12px] font-semibold no-underline hover:underline mb-6 inline-block"
        style={{ color: '#6B7280' }}>
        ← Back to Settings
      </Link>

      <h1 className="text-[24px] font-bold tracking-tight mb-1" style={{ color: '#1E2D3D' }}>
        Billing & Subscription
      </h1>
      <p className="text-[13px] mb-8" style={{ color: '#6B7280' }}>
        Manage your plan, payment method, and invoices.
      </p>

      {/* Current plan card */}
      <div className="rounded-xl p-6 mb-6" style={{ background: '#FFF8F0', border: '1px solid #EEEBE6' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase mb-2" style={{ color: '#E9A020' }}>
              Current Plan
            </div>
            <div className="text-[20px] font-bold mb-1" style={{ color: '#1E2D3D' }}>
              {isActive ? (plan === 'fpa' ? 'FPA Circle Member' : 'AuthorDash Pro') : isTrialing ? 'Free Trial' : isCanceled ? 'Canceled' : 'No Plan'}
            </div>
            <div className="text-[13px]" style={{ color: '#6B7280' }}>
              {isTrialing && daysLeft != null && `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in your trial`}
              {isActive && (plan === 'fpa' ? '$19/month · FPA2026 coupon applied' : '$29/month')}
              {isCanceled && 'Your subscription has been canceled'}
              {isPastDue && 'Payment failed — please update your payment method'}
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: isActive ? 'rgba(110,191,139,0.12)' : isTrialing ? 'rgba(233,160,32,0.12)' : 'rgba(249,123,107,0.12)',
                color: isActive ? '#6EBF8B' : isTrialing ? '#E9A020' : '#F97B6B',
              }}>
              {isActive ? 'Active' : isTrialing ? 'Trial' : isPastDue ? 'Past Due' : isCanceled ? 'Canceled' : 'Free'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {(isTrialing || !isActive) && (
          <button
            onClick={() => handleUpgrade('regular')}
            disabled={loading}
            className="w-full py-3 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
            style={{ background: '#E9A020', color: '#0d1f35', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Redirecting...' : isTrialing ? 'Upgrade to Pro — $29/month' : 'Subscribe to Pro'}
          </button>
        )}

        {isActive && (
          <button
            onClick={openPortal}
            disabled={loading}
            className="w-full py-3 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'white', border: '1px solid #EEEBE6', color: '#1E2D3D', cursor: 'pointer' }}
          >
            {loading ? 'Opening...' : 'Manage Subscription & Invoices'}
          </button>
        )}

        {isPastDue && (
          <button
            onClick={openPortal}
            disabled={loading}
            className="w-full py-3 rounded-lg text-[14px] font-bold transition-all disabled:opacity-50"
            style={{ background: '#F97B6B', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Opening...' : 'Update Payment Method'}
          </button>
        )}
      </div>

      {/* Help */}
      <div className="mt-8 text-[12px]" style={{ color: '#6B7280' }}>
        Questions about billing? Email <a href="mailto:support@authordash.com" style={{ color: '#E9A020' }}>support@authordash.com</a>
      </div>
    </div>
  )
}
