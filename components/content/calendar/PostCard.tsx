'use client'

import QuoteCardPreview from './QuoteCardPreview'

interface Post {
  id: string
  dayNumber: number
  phase: string
  type: string
  pillar: string
  instagram?: string | null
  instagramTags?: string | null
  facebook?: string | null
  pinterest?: string | null
  pinterestLink?: string | null
  pinterestLinkType?: string | null
  bookMention?: string | null
  quoteUsed?: string | null
  reviewUsed?: string | null
  carouselSlides?: unknown
  videoBeats?: unknown
  imageId?: string | null
  imageUrl?: string | null
  imageLabel?: string | null
  imageDirection?: { framing?: string | null; light?: string | null; mood?: string | null } | null
  whyThisPost?: string | null
  scheduledAt?: string | null
  postedAt?: string | null
}

interface Props {
  post: Post
  weekIndex: number
  dayInWeek: number
  onOpenModal: (postId: string) => void
}

const PHASE_BORDER: Record<string, string> = {
  anticipation: '3px solid #8B5CF6',
  prelaunch: '3px solid #8B5CF6',
  launch: '3px solid var(--amber)',
  postlaunch: '3px solid var(--sage)',
}

const PILLAR_COLORS: Record<number, string> = {
  0: 'var(--ink)',
  1: 'var(--rose)',
  2: 'var(--sage)',
  3: 'var(--amber)',
  4: '#8B5CF6',
}

const TYPE_ICONS: Record<string, string> = {
  'Single Image': '⬜',
  'Carousel': '⧉',
  'Quote Card': '❝',
  'Video Script': '▶',
  'Review': '★',
  'Launch Day': '◆',
  'ARC Review': '◇',
  'Origin Story': '○',
  'Social Proof': '◉',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PostCard({ post, weekIndex, dayInWeek, onOpenModal }: Props) {
  const dayLabel = `${WEEKDAYS[dayInWeek % 7]} · Week ${weekIndex + 1}`
  const borderLeft = PHASE_BORDER[post.phase ?? ''] ?? 'none'
  const pillarColor = PILLAR_COLORS[(post.dayNumber ?? 0) % 5] ?? 'var(--ink)'

  const captionPreview = post.instagram
    ? post.instagram.split('\n').slice(0, 2).join(' ').slice(0, 140)
    : null

  const isQuoteCard = (post.type ?? '') === 'Quote Card'

  const statusDot = post.scheduledAt
    ? { color: '#6EBF8B', title: 'Scheduled' }
    : !post.imageUrl
    ? { color: '#F472B6', title: 'Needs image' }
    : null

  return (
    <div
      onClick={() => onOpenModal(post.id)}
      style={{
        background: 'white',
        border: '0.5px solid var(--rule)',
        borderLeft,
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'box-shadow 0.12s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(20,33,61,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Image thumb or placeholder */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 4,
            background: 'var(--paper-3)',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            position: 'relative',
          }}>
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt={post.imageLabel ?? 'post image'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 18, opacity: 0.4 }}>
                {TYPE_ICONS[post.type ?? ''] ?? '⬜'}
              </span>
            )}
            {statusDot && (
              <div style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusDot.color,
                border: '1.5px solid white',
              }} title={statusDot.title} />
            )}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top row: day label + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {dayLabel}
              </span>

              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: pillarColor,
                background: `${pillarColor}18`,
                border: `1px solid ${pillarColor}30`,
                borderRadius: 2,
                padding: '2px 6px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}>
                {post.pillar ?? ''}
              </span>

              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 10,
                color: 'var(--ink-3)',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule)',
                borderRadius: 2,
                padding: '2px 6px',
                fontWeight: 500,
              }}>
                {post.type ?? ''}
              </span>

              {(post.phase ?? 'normal') !== 'normal' && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: post.phase === 'launch' ? 'var(--amber)' : post.phase === 'postlaunch' ? 'var(--sage)' : '#8B5CF6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}>
                  {post.phase ?? ''}
                </span>
              )}
            </div>

            {/* Caption preview */}
            {isQuoteCard && post.quoteUsed ? (
              <QuoteCardPreview quote={post.quoteUsed} />
            ) : captionPreview ? (
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                color: 'var(--ink-2)',
                lineHeight: 1.55,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {captionPreview}
              </p>
            ) : (
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                color: 'var(--ink-4)',
                fontStyle: 'italic',
                margin: 0,
              }}>
                No caption generated
              </p>
            )}
          </div>

          {/* Arrow hint */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-4)',
            flexShrink: 0,
            paddingTop: 2,
          }}>
            →
          </span>
        </div>
      </div>
    </div>
  )
}
