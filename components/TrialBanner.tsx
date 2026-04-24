'use client'
// components/TrialBanner.tsx — Shows remaining trial days
import Link from 'next/link'
import { SHOW_PRICING } from '@/lib/flags'

export function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  if (!SHOW_PRICING) return null

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  if (daysLeft > 7) return null // Only show when 7 days or fewer remain

  return (
    <div className="px-6 py-2 flex items-center justify-between text-[12px]"
      style={{ background: daysLeft <= 3 ? '#FFF5F4' : '#FFFBF0', borderBottom: '1px solid #EEEBE6' }}>
      <span style={{ color: daysLeft <= 3 ? '#F97B6B' : '#D97706' }}>
        {daysLeft === 0
          ? 'Your free trial ends today'
          : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`}
      </span>
      <Link href="/pricing" className="font-semibold no-underline hover:underline"
        style={{ color: '#D97706' }}>
        Choose a plan →
      </Link>
    </div>
  )
}
