'use client'

import { useState } from 'react'
import CarouselSlides from './CarouselSlides'
import VideoStoryboard from './VideoStoryboard'

interface Post {
  instagram?: string | null
  instagramTags?: string | null
  facebook?: string | null
  pinterest?: string | null
  pinterestLink?: string | null
  pinterestLinkType?: string | null
  type: string
  carouselSlides?: unknown
  videoBeats?: unknown
}

interface Props {
  post: Post
}

type Tab = 'instagram' | 'facebook' | 'pinterest' | 'slides' | 'storyboard'

export default function PlatformTabs({ post }: Props) {
  const isCarousel = post.type === 'Carousel'
  const isVideo = post.type === 'Video Script'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'pinterest', label: 'Pinterest' },
    ...(isCarousel ? [{ key: 'slides' as Tab, label: 'Slides' }] : []),
    ...(isVideo ? [{ key: 'storyboard' as Tab, label: 'Storyboard' }] : []),
  ]

  const [activeTab, setActiveTab] = useState<Tab>('instagram')
  const [copied, setCopied] = useState(false)

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function getCopyText(): string {
    if (activeTab === 'instagram') return [post.instagram, post.instagramTags].filter(Boolean).join('\n\n')
    if (activeTab === 'facebook') return post.facebook ?? ''
    if (activeTab === 'pinterest') return post.pinterest ?? ''
    return ''
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Tab row */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12, borderBottom: '1px solid var(--rule)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? 'var(--amber)' : 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--amber)' : '2px solid transparent',
              padding: '6px 12px 8px',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'slides' && isCarousel && Array.isArray(post.carouselSlides) && (
        <CarouselSlides slides={post.carouselSlides as { slide: number; imageDirection: string; overlayText: string }[]} />
      )}

      {activeTab === 'storyboard' && isVideo && Array.isArray(post.videoBeats) && (
        <VideoStoryboard beats={post.videoBeats as { time: string; action: string }[]} />
      )}

      {(activeTab === 'instagram' || activeTab === 'facebook' || activeTab === 'pinterest') && (
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: 'var(--ink)',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            marginBottom: activeTab === 'instagram' && post.instagramTags ? 10 : 0,
          }}>
            {activeTab === 'instagram' && (post.instagram ?? '—')}
            {activeTab === 'facebook' && (post.facebook ?? '—')}
            {activeTab === 'pinterest' && (post.pinterest ?? '—')}
          </div>

          {activeTab === 'instagram' && post.instagramTags && (
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              color: '#60A5FA',
              lineHeight: 1.6,
              marginBottom: 10,
            }}>
              {post.instagramTags}
            </div>
          )}

          {activeTab === 'pinterest' && post.pinterestLink && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              padding: '7px 10px',
              background: 'var(--paper-2)',
              borderRadius: 4,
              border: '1px solid var(--rule)',
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: 'var(--ink-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {post.pinterestLinkType?.toUpperCase() ?? 'LINK'}
              </span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11,
                color: 'var(--ink-3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {post.pinterestLink}
              </span>
            </div>
          )}

          {(activeTab === 'instagram' || activeTab === 'facebook' || activeTab === 'pinterest') && (
            <button
              onClick={() => copy(getCopyText())}
              style={{
                marginTop: 10,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: copied ? 'var(--sage)' : 'var(--amber)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
