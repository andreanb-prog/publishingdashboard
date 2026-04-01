'use client'
// components/DarkPage.tsx
import Link from 'next/link'

interface DarkPageProps {
  title: string
  subtitle?: string
  backHref?: string
  children: React.ReactNode
}

export function DarkPage({ title, subtitle, backHref = '/dashboard', children }: DarkPageProps) {
  return (
    <div
      className="min-h-full px-9 py-8"
      style={{ background: '#0c0a09', color: '#fafaf9' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-7 pb-5"
        style={{ borderBottom: '1px solid #292524' }}>
        <div>
          <h1 className="font-serif text-[26px] tracking-tight" style={{ color: '#fafaf9' }}>
            {title}
          </h1>
          {subtitle && <p className="text-[12px] mt-1" style={{ color: '#a8a29e' }}>{subtitle}</p>}
        </div>
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-lg
                     no-underline transition-all duration-150"
          style={{
            background: '#1c1917',
            border: '1px solid #292524',
            color: '#d6d3d1',
          }}
        >
          ← Back to Overview
        </Link>
      </div>

      {children}
    </div>
  )
}

// KPI strip for dark pages
interface DarkKPIProps {
  items: { label: string; value: string | number; sub?: string; color?: string }[]
  cols?: 3 | 4 | 5
}

export function DarkKPIStrip({ items, cols = 4 }: DarkKPIProps) {
  const colsClass = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }[cols]
  return (
    <div className={`grid ${colsClass} gap-3.5 mb-7`}>
      {items.map((item, i) => (
        <div key={i} className="rounded-xl p-4.5 relative overflow-hidden"
          style={{ background: '#1c1917', border: '1px solid #292524' }}>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${item.color || '#e9a020'}40, ${item.color || '#e9a020'})` }} />
          <div className="text-[10px] font-bold tracking-[1.2px] uppercase mb-2"
            style={{ color: '#a8a29e' }}>
            {item.label}
          </div>
          <div className="font-mono text-[26px] font-medium leading-none mb-1.5"
            style={{ color: item.color || '#fbbf24' }}>
            {item.value}
          </div>
          {item.sub && (
            <div className="text-[11px]" style={{ color: '#a8a29e' }}>{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// Section header for dark pages
export function DarkSectionHeader({ title, badge, badgeColor }: { title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-serif text-[19px]" style={{ color: '#fafaf9' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: '#292524' }} />
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

// Coach callout for dark pages
export function DarkCoachBox({ children, color = '#fbbf24', title = 'Your coach says' }: { children: React.ReactNode; color?: string; title?: string }) {
  const showPrompt = Math.random() < 0.1
  const prompt = EMPOWERMENT_PROMPTS[Math.floor(Math.random() * EMPOWERMENT_PROMPTS.length)]

  return (
    <div className="rounded-xl p-5 mb-5"
      style={{
        background: `linear-gradient(135deg, #1c1917, ${color}10)`,
        border: `1px solid #292524`,
        borderLeft: `3px solid ${color}`,
      }}>
      <div className="text-[10.5px] font-bold tracking-[1px] uppercase mb-2"
        style={{ color }}>
        {title}
      </div>
      <div className="text-[13px] leading-[1.75]" style={{ color: '#d6d3d1' }}>
        {children}
      </div>
      {showPrompt && (
        <div className="mt-2 text-[12px] italic" style={{ color: '#a8a29e' }}>
          {prompt}
        </div>
      )}
      <div className="mt-3 pt-2.5 text-[10px]" style={{ color: '#44403c', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        AI-generated insight · Test everything · You&apos;re the expert on your readers
      </div>
    </div>
  )
}
