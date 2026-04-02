'use client'
// components/DarkPage.tsx — deep dive page components (light theme)
import { useState } from 'react'
import Link from 'next/link'
import { getCoachTitle } from '@/lib/coachTitle'

interface DarkPageProps {
  title: string
  subtitle?: string
  backHref?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}

export function DarkPage({ title, subtitle, backHref = '/dashboard', headerRight, children }: DarkPageProps) {
  return (
    <div
      className="min-h-full px-4 py-6 md:px-9 md:py-8"
      style={{ background: '#FFFFFF', color: '#1E2D3D' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-7 pb-5 flex-wrap gap-3"
        style={{ borderBottom: '1px solid #EEEBE6' }}>
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight" style={{ color: '#1E2D3D' }}>
            {title}
          </h1>
          {subtitle && <p className="text-[12px] mt-1" style={{ color: '#6B7280' }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {headerRight}
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
          <div key={i} className="rounded-xl h-24" style={{ background: '#EEEBE6' }} />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl" style={{ background: '#EEEBE6', height: i === 0 ? 200 : 120 }} />
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
    <div className={`grid grid-cols-2 ${colsClass} gap-3 md:gap-4 mb-8`}>
      {items.map((item, i) => {
        const accent = item.color || '#e9a020'
        const val = String(item.value)
        const isEmpty = val === '—' || val === '0' || val === '$0' || val === '0%' || val === '$0.00'
        return (
          <div key={i} className="rounded-xl p-5 relative overflow-hidden transition-colors"
            style={{
              background: `linear-gradient(135deg, ${accent}06, white 60%)`,
              border: '1px solid #EEEBE6',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={e => { if (isEmpty) e.currentTarget.style.background = '#FFF8F0' }}
            onMouseLeave={e => { if (isEmpty) e.currentTarget.style.background = `linear-gradient(135deg, ${accent}06, white 60%)` }}>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ background: isEmpty ? '#EEEBE6' : `linear-gradient(90deg, ${accent}40, ${accent})` }} />
            <div className="text-[12px] font-medium uppercase mb-2"
              style={{ color: '#374151', letterSpacing: '0.5px' }}>
              {item.label}
            </div>
            {isEmpty ? (
              <div className="flex flex-col items-start justify-center" style={{ minHeight: 60 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2" style={{ opacity: 0.2 }}>
                  <rect x="3" y="14" width="4" height="7" rx="1" fill="#1E2D3D" />
                  <rect x="10" y="9" width="4" height="12" rx="1" fill="#1E2D3D" />
                  <rect x="17" y="4" width="4" height="17" rx="1" fill="#1E2D3D" />
                </svg>
                <div className="text-[12px] mb-1" style={{ color: '#6B7280' }}>No data yet</div>
                <Link href="/dashboard?upload=1" className="text-[11px] font-semibold no-underline hover:underline"
                  style={{ color: '#E9A020' }}>
                  Upload to unlock →
                </Link>
              </div>
            ) : (
              <>
                <div className="text-[28px] font-semibold leading-none tracking-tight mb-1.5"
                  style={{ color: accent }}>
                  {item.value}
                </div>
                {item.sub && (
                  <div className="text-[12px] mt-1" style={{ color: '#4B5563' }}>{item.sub}</div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Section header for deep-dive pages
export function DarkSectionHeader({ title, badge, badgeColor }: { title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-serif text-[19px]" style={{ color: '#1E2D3D' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ background: '#EEEBE6' }} />
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

// Coach callout for deep-dive pages — collapsed by default, structured insight
export function DarkCoachBox({ children, color = '#E9A020', title }: { children: React.ReactNode; color?: string; title?: string }) {
  const [collapsed, setCollapsed] = useState(true)

  // Parse the children text into structured sections if it's a string
  const content = typeof children === 'string' ? children : null
  const sections = content ? parseInsightSections(content) : null

  return (
    <div className="rounded-xl overflow-hidden mb-8 transition-all duration-200"
      style={{
        background: collapsed ? 'white' : '#FFF8F0',
        border: '1px solid #EEEBE6',
        borderLeft: `3px solid ${color}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-transparent border-none cursor-pointer"
      >
        <span className="text-[13px] font-medium"
          style={{ color: '#1E2D3D' }}>
          What This Means For You
        </span>
        <span className="text-[11px] flex-shrink-0 ml-2 transition-transform duration-200"
          style={{ color: '#6B7280', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
          ▾
        </span>
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: collapsed ? '0px' : '800px', opacity: collapsed ? 0 : 1 }}>
        <div className="px-5 pb-5">
          {sections ? (
            <div className="space-y-4">
              {sections.map((s, i) => (
                <div key={i}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.8px] mb-1"
                    style={{ color: '#E9A020' }}>
                    {s.label}
                  </div>
                  <div className="text-[14px] leading-[1.6]" style={{ color: '#1E2D3D' }}
                    dangerouslySetInnerHTML={{
                      __html: boldNumbers(s.text),
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[14px] leading-[1.6]" style={{ color: '#1E2D3D' }}
              dangerouslySetInnerHTML={{
                __html: typeof children === 'string' ? boldNumbers(children) : '',
              }}
            />
          )}
          {typeof children !== 'string' && (
            <div className="text-[14px] leading-[1.6]" style={{ color: '#1E2D3D' }}>
              {children}
            </div>
          )}
          <div className="mt-4 pt-3 text-[12px]" style={{ color: '#6B7280', borderTop: '1px solid #EEEBE6' }}>
            This is a suggestion based on your data — you know your readers best.
          </div>
        </div>
      </div>
    </div>
  )
}

// Bold any numbers in text (dollars, percentages, plain numbers)
function boldNumbers(text: string): string {
  return text.replace(/(\$[\d,.]+|\d[\d,.]*%|\d[\d,.]+)/g, '<strong>$1</strong>')
}

// Try to split AI text into 3 structured sections by sentence
function parseInsightSections(text: string): { label: string; text: string }[] | null {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim())
  if (sentences.length < 2) return null

  if (sentences.length === 2) {
    return [
      { label: "What's happening", text: sentences[0] },
      { label: 'What to do next', text: sentences[1] },
    ]
  }

  // 3+ sentences: first = what's happening, middle = why it matters, last = what to do
  const mid = sentences.slice(1, -1).join(' ')
  return [
    { label: "What's happening", text: sentences[0] },
    { label: 'Why it matters', text: mid },
    { label: 'What to do next', text: sentences[sentences.length - 1] },
  ]
}
