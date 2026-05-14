'use client'

import PostCard from './PostCard'

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
}

interface Props {
  posts: Post[]
  weekIndex: number
}

export default function WeekGroup({ posts, weekIndex }: Props) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontWeight: 600,
        }}>
          WEEK {weekIndex + 1}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            weekIndex={weekIndex}
            dayInWeek={i}
          />
        ))}
      </div>
    </div>
  )
}
