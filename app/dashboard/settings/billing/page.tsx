'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { SHOW_PRICING } from '@/lib/flags'
import { BoutiqueButton, BoutiqueCard, BoutiqueStatusChip } from '@/components/boutique'

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

  if (!SHOW_PRICING) return null

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

  const planLabel = isActive
    ? (plan === 'fpa' ? 'FPA Circle Member' : 'AuthorDash Pro')
    : isTrialing ? 'Free Trial'
    : isCanceled ? 'Canceled'
    : 'No Plan'

  const statusTone: 'green' | 'amber' | 'coral' | 'navy' =
    isActive ? 'green' : isTrialing ? 'amber' : 'coral'

  const statusLabel = isActive ? 'Active' : isTrialing ? 'Trial' : isPastDue ? 'Past Due' : isCanceled ? 'Canceled' : 'Free'

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/settings" className="text-[12px] font-semibold no-underline hover:underline mb-6 inline-block"
        style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
        ← Back to Settings
      </Link>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: '#1E2D3D', marginBottom: 4 }}>
        Billing & Subscription
      </h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6B7280', marginBottom: 32 }}>
        Manage your plan, payment method, and invoices.
      </p>

      {/* Current plan card */}
      <BoutiqueCard accentLeft style={{ padding: 24, marginBottom: 24 }}>
        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D97706', marginBottom: 8 }}>
              Current Plan
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: '#1E2D3D', marginBottom: 4 }}>
              {planLabel}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6B7280' }}>
              {isTrialing && daysLeft != null && `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in your trial`}
              {isActive && (plan === 'fpa' ? '$19/month · FPA2026 coupon applied' : '$29/month')}
              {isCanceled && 'Your subscription has been canceled'}
              {isPastDue && 'Payment failed — please update your payment method'}
            </div>
          </div>
          <BoutiqueStatusChip tone={statusTone} label={statusLabel} />
        </div>
      </BoutiqueCard>

      {/* Actions */}
      <div className="space-y-3">
        {(isTrialing || !isActive) && (
          <BoutiqueButton
            variant="amber"
            onClick={() => handleUpgrade('regular')}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
          >
            {loading ? 'Redirecting...' : isTrialing ? 'Upgrade to Pro — $29/month' : 'Subscribe to Pro'}
          </BoutiqueButton>
        )}

        {isActive && (
          <BoutiqueButton
            variant="ghost"
            onClick={openPortal}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
          >
            {loading ? 'Opening...' : 'Manage Subscription & Invoices'}
          </BoutiqueButton>
        )}

        {isPastDue && (
          <BoutiqueButton
            variant="amber"
            onClick={openPortal}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
          >
            {loading ? 'Opening...' : 'Update Payment Method'}
          </BoutiqueButton>
        )}
      </div>

      <div className="mt-8 text-[12px]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
        Questions about billing? Email{' '}
        <a href="mailto:support@authordash.com" style={{ color: '#D97706' }}>support@authordash.com</a>
      </div>
    </div>
  )
}
