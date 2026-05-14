'use client'

import { useState, useEffect, useCallback } from 'react'
import ImageDirection from './ImageDirection'
import WhyThisPost from './WhyThisPost'
import TaskStatus from './TaskStatus'
import PlatformTabs from './PlatformTabs'

interface ImageDirectionData {
  framing?: string | null
  light?: string | null
  mood?: string | null
}

export interface ModalPost {
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
  imageDirection?: ImageDirectionData | null
  whyThisPost?: string | null
  scheduledAt?: string | null
  postedAt?: string | null
}

interface Project {
  id: string
  beaconsUrl?: string | null
  bookPageUrl?: string | null
  authorCentral?: string | null
  website?: string | null
}

interface Props {
  post: ModalPost
  allPosts: ModalPost[]
  project: Project
  onClose: () => void
  onNavigate: (postId: string) => void
  onPostUpdated: (postId: string, patch: Partial<ModalPost>) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

export default function PostModal({ post, allPosts, project, onClose, onNavigate, onPostUpdated }: Props) {
  const [localScheduledAt, setLocalScheduledAt] = useState(post.scheduledAt ?? null)

  // sync when post changes (navigation)
  useEffect(() => {
    setLocalScheduledAt(post.scheduledAt ?? null)
  }, [post.id, post.scheduledAt])

  // keyboard close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const currentIdx = allPosts.findIndex(p => p.id === post.id)
  const prevPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null
  const nextPost = currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null

  const dayInWeek = (post.dayNumber - 1) % 7
  const weekIndex = Math.floor((post.dayNumber - 1) / 7)
  const dayLabel = `${WEEKDAYS[dayInWeek]} · Week ${weekIndex + 1} · Day ${post.dayNumber}`

  function resolveLink(type: 'ig' | 'fb' | 'pin'): string {
    if (type === 'ig') return project.beaconsUrl ?? '—'
    if (type === 'fb') return post.bookMention ? (project.bookPageUrl ?? project.beaconsUrl ?? '—') : (project.beaconsUrl ?? '—')
    if (type === 'pin') return post.pinterestLink ?? '—'
    return '—'
  }

  const handleScheduled = useCallback(() => {
    const now = new Date().toISOString()
    setLocalScheduledAt(now)
    onPostUpdated(post.id, { scheduledAt: now })
  }, [post.id, onPostUpdated])

  const isNonImageType = post.type === 'Video Script'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(20,33,61,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      {/* Modal panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 8,
          boxShadow: '0 8px 40px rgba(20,33,61,0.18)',
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '0.5px solid var(--rule)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{TYPE_ICONS[post.type] ?? '⬜'}</span>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {dayLabel}
              </div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
              }}>
                {post.type} · {post.pillar}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 20,
              color: 'var(--ink-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Two-column body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,560px) 280px',
          gap: 0,
        }}
          className="modal-body-grid"
        >
          {/* ── LEFT COLUMN ── */}
          <div style={{
            padding: '24px 24px 28px',
            borderRight: '0.5px solid var(--rule)',
          }}>
            {/* Image section */}
            <div style={{ marginBottom: 20 }}>
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt={post.imageLabel ?? 'post image'}
                  style={{
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'cover',
                    borderRadius: 6,
                    display: 'block',
                    marginBottom: 14,
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  maxHeight: 320,
                  borderRadius: 6,
                  border: '1.5px dashed #E9A02060',
                  background: '#FFF8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}>
                  <span style={{ fontSize: 28, opacity: 0.4 }}>{TYPE_ICONS[post.type] ?? '⬜'}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: 'var(--ink-4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}>
                    From Library · Or Generate
                  </span>
                </div>
              )}

              {!isNonImageType && (
                <ImageDirection data={post.imageDirection ?? null} />
              )}
            </div>

            {/* Platform copy */}
            <div style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 18 }}>
              <PlatformTabs post={post} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ padding: '24px 22px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Why this post */}
            <WhyThisPost whyThisPost={post.whyThisPost} phase={post.phase} />

            {/* Divider */}
            <div style={{ height: 0, borderTop: '0.5px solid var(--rule)' }} />

            {/* Links section */}
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 10,
              }}>
                Links · Baked In
              </div>
              {[
                { icon: 'IG', platform: 'Instagram', url: resolveLink('ig') },
                { icon: 'FB', platform: 'Facebook', url: resolveLink('fb') },
                { icon: '✦', platform: 'Pinterest', url: resolveLink('pin') },
              ].map(row => (
                <div key={row.platform} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--ink-3)',
                    minWidth: 24,
                    paddingTop: 1,
                  }}>
                    {row.icon}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: row.url === '—' ? 'var(--ink-4)' : 'var(--ink-3)',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}>
                    {row.url}
                  </span>
                </div>
              ))}
              {post.pinterestLinkType && (
                <div style={{
                  display: 'inline-block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: '#E9A020',
                  background: '#E9A02015',
                  border: '1px solid #E9A02030',
                  borderRadius: 2,
                  padding: '2px 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}>
                  {post.pinterestLinkType}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 0, borderTop: '0.5px solid var(--rule)' }} />

            {/* Task status */}
            <TaskStatus
              scheduledAt={localScheduledAt}
              imageUrl={post.imageUrl}
              projectId={project.id}
              postId={post.id}
              onScheduled={handleScheduled}
            />
          </div>
        </div>

        {/* Navigation footer */}
        <div style={{
          borderTop: '0.5px solid var(--rule)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {prevPost ? (
            <button
              onClick={() => onNavigate(prevPost.id)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--amber)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              ← Day {prevPost.dayNumber}
            </button>
          ) : (
            <span />
          )}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {currentIdx + 1} / {allPosts.length}
          </span>
          {nextPost ? (
            <button
              onClick={() => onNavigate(nextPost.id)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--amber)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Day {nextPost.dayNumber} →
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>

      {/* responsive stacking */}
      <style>{`
        @media (max-width: 640px) {
          .modal-body-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
