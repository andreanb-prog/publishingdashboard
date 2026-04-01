'use client'
// components/DarkPage.tsx — deep dive page components (light theme)
import Link from 'next/link'
import { getCoachTitle } from '@/lib/coachTitle'

interface DarkPageProps {
  title: string
  subtitle?: string
  backHref?: string
  children: React.ReactNode
}

export function DarkPage({ title, subtitle, backHref = '/dashboard', children }: DarkPageProps) {
  return (
    <div
      className="min-h-full px-4 py-6 md:px-9 md:py-8"
      style={{ background: '#F5F0E8', color: '#1E2D3D' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-7 pb-5"
        style={{ borderBottom: '1px solid #F0E0C8' }}>
        <div>
          <h1 className="font-serif text-[26px] tracking-tight" style={{ color: '#1E2D3D' }}>
            {title}
          </h1>
          {subtitle && <p className="text-[12px] mt-1" style={{ color: '#6B7280' }}>{subtitle}</p>}
        </div>
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-lg
                     no-underline transition-all duration-150"
          style={{
            background: 'white',
            border: '1px solid #D6D3D1',
            color: '#1E2D3D',
          }}
        >
          ← Back to Overview
        </Link>
      </div>

      {children}
    </div>
  )
}

// Skeleton loader for deep-dive pages (eliminates empty-state flash)
export function PageSkeleton({ cols = 4, rows = 2 }: { cols?: 3 | 4 | 5; rows?: number }) {
  const colsClass = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }[cols]
  return (
    <div className="animate-pulse">
      <div className={`grid ${colsClass} gap-3.5 mb-7`}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="rounded-xl h-24" style={{ background: '#F0E0C8' }} />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl" style={{ background: '#F0E0C8', height: i === 0 ? 200 : 120 }} />
        ))}
      </div>
    </div>
  )
}

// KPI strip for deep-dive pages
interface DarkKPIProps {
  items: { label: string; value: string | number; sub?: string; color?: string }[]
  cols?: 3 | 4 | 5
}

export function DarkKPIStrip({ items, cols = 4 }: DarkKPIProps) {
  const colsClass = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' }[cols]
  return (
    <div className={`grid grid-cols-2 ${colsClass} gap-3 md:gap-3.5 mb-7`}>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4.5 relative overflow-hidden"
          style={{ background: 'white', border: '1px solid #F0E0C8' }}>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${item.color || '#e9a020'}40, ${item.color || '#e9a020'})` }} />
          <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2"
            style={{ color: '#6B7280' }}>
            {item.label}
          </div>
          <div className="font-mono text-[26px] font-medium leading-none mb-1.5"
            style={{ color: item.color || '#E9A020' }}>
            {item.value}
          </div>
          {item.sub && (
            <div className="text-[11px]" style={{ color: '#6B7280' }}>{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// Section header for deep-dive pages
export function DarkSectionHeader({ title, badge, badgeColor }: { title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-serif text-[19px]" style={{ color: '#1E2D3D' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: '#F0E0C8' }} />
      {badge && (
        <span className="text-[10px] font-bold tracking-[1px] uppercase px-2.5 py-1 rounded-full font-mono"
          style={{ background: `${badgeColor || '#e9a020'}20`, color: badgeColor || '#e9a020' }}>
          {badge}
        </span>
      )}
    </div>
  )
}

const EMPOWERMENT_PROMPTS = [
  '…but what does your gut say?',
  '…does this match what you\'ve been feeling?',
  '…you\'ve seen your readers — do you agree?',
  '…trust the data, but you\'re driving this car.',
  '…what would YOU do with this information?',
  '…your instincts built this far — what do they tell you?',
  '…before you act on this, sit with it for 10 seconds.',
]

// Coach callout for deep-dive pages
export function DarkCoachBox({ children, color = '#E9A020', title }: { children: React.ReactNode; color?: string; title?: string }) {
  const resolvedTitle = title ?? getCoachTitle()
  const showPrompt = Math.random() < 0.1
  const prompt = EMPOWERMENT_PROMPTS[Math.floor(Math.random() * EMPOWERMENT_PROMPTS.length)]

  return (
    <div className="rounded-xl p-5 mb-5"
      style={{
        background: 'white',
        border: `1px solid #F0E0C8`,
        borderLeft: `3px solid ${color}`,
      }}>
      <div className="text-[10.5px] font-bold tracking-[1px] uppercase mb-2"
        style={{ color }}>
        {resolvedTitle}
      </div>
      <div className="text-[13px] leading-[1.75]" style={{ color: '#374151' }}>
        {children}
      </div>
      {showPrompt && (
        <div className="mt-2 text-[12px] italic" style={{ color: '#6B7280' }}>
          {prompt}
        </div>
      )}
      <div className="mt-3 pt-2.5 text-[10px]" style={{ color: '#9CA3AF', borderTop: '1px solid #F0E0C8' }}>
        AI-generated insight · Test everything · You&apos;re the expert on your readers
      </div>
    </div>
  )
}
