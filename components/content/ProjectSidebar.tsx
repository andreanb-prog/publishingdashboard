'use client'

import { usePathname } from 'next/navigation'

const STEPS = [
  { num: '01', label: 'Setup', slug: 'setup' },
  { num: '02', label: 'Manuscript', slug: 'manuscript' },
  { num: '03', label: 'Reviews', slug: 'reviews' },
  { num: '04', label: 'Images', slug: 'images' },
  { num: '05', label: 'Calendar', slug: 'calendar' },
]

interface Props {
  projectId: string
  projectName: string
  completedSteps: string[]
  postCount: number
  quoteCount: number
  reviewCount: number
  imageCount: number
}

export default function ProjectSidebar({
  projectId,
  projectName,
  completedSteps,
  postCount,
  quoteCount,
  reviewCount,
  imageCount,
}: Props) {
  const pathname = usePathname()

  const stepBadge = (slug: string): string | null => {
    const isActive = pathname.includes(`/${slug}`)
    if (isActive) return 'IN PROGRESS'
    if (completedSteps.includes(slug)) return 'COMPLETE'
    if (slug === 'manuscript' && quoteCount > 0) return `${quoteCount} QUOTES`
    if (slug === 'reviews' && reviewCount > 0) return `${reviewCount} ON FILE`
    if (slug === 'images' && imageCount > 0) return `${imageCount} IMAGES`
    if (slug === 'calendar' && postCount > 0) return `${postCount} POSTS`
    return null
  }

  return (
    <aside className="sp-sidebar">
      {/* Logo */}
      <div style={{ padding: '28px 20px 16px' }}>
        <a href="/content" style={{ textDecoration: 'none' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            StoryPost
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--ink-4)',
            marginTop: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Content Calendar
          </div>
        </a>
      </div>

      <div style={{ borderTop: '1px solid var(--rule)', margin: '0 20px 16px' }} />

      {/* Project name */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}>
          Project
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1.35,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {projectName}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--rule)', margin: '0 20px 16px' }} />

      {/* Steps */}
      <nav style={{ padding: '0 12px', flex: 1 }}>
        {STEPS.map(step => {
          const isActive = pathname.includes(`/${step.slug}`)
          const badge = stepBadge(step.slug)
          const isComplete = completedSteps.includes(step.slug)

          return (
            <a
              key={step.slug}
              href={`/content/${projectId}/${step.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 8px',
                borderRadius: 4,
                textDecoration: 'none',
                marginBottom: 2,
                background: isActive ? 'rgba(20,33,61,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                transition: 'background 0.12s',
              }}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: isActive ? 'var(--amber)' : 'var(--ink-4)',
                fontWeight: 500,
                minWidth: 20,
              }}>
                {step.num}
              </span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--ink)' : isComplete ? 'var(--ink-2)' : 'var(--ink-3)',
                flex: 1,
              }}>
                {step.label}
              </span>
              {badge && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  fontWeight: 500,
                  color: badge === 'IN PROGRESS' ? 'var(--amber)' : badge === 'COMPLETE' ? 'var(--sage)' : 'var(--ink-4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  {badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--rule)', marginTop: 'auto' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          The Engine
        </div>
        <a
          href="/content"
          style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', padding: '3px 0' }}
        >
          All projects
        </a>
        <a
          href="/dashboard"
          style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none', padding: '3px 0' }}
        >
          Back to AuthorDash
        </a>
      </div>
    </aside>
  )
}
