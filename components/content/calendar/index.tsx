'use client'

import { useState, useEffect, useCallback } from 'react'
import CalendarHeader from './CalendarHeader'
import TodaySummary from './TodaySummary'
import InsightsPanel from './InsightsPanel'
import LaunchArcBar from './LaunchArcBar'
import PhaseLegend from './PhaseLegend'
import WeekGroup from './WeekGroup'
import PostModal from './PostModal'
import type { ModalPost } from './PostModal'

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

interface Project {
  id: string
  hasLaunch: boolean
  launchDate?: string | null
  frequency: number
  beaconsUrl?: string | null
  bookPageUrl?: string | null
  authorCentral?: string | null
  website?: string | null
}

interface PerformanceStats {
  loggedCount: number
  totalCount: number
  avgReach: number
  avgSaves: number
  clickRate: number
}

interface Props {
  project: Project
  initialPosts: Post[]
  performanceStats: PerformanceStats
  initialInsights: string[] | null
}

const LOADING_MESSAGES = [
  'Reading your books...',
  'Finding the emotional beats...',
  'Writing your Instagram hooks...',
  'Applying the launch arc...',
  'Assigning your images...',
  'Almost there...',
]

function chunkByWeek(posts: Post[], frequency: number): Post[][] {
  if (!posts || !Array.isArray(posts) || posts.length === 0) return []
  const weeks: Post[][] = []
  const postsPerWeek = Math.max(1, frequency)
  for (let i = 0; i < posts.length; i += postsPerWeek) {
    weeks.push(posts.slice(i, i + postsPerWeek))
  }
  return weeks
}

export default function CalendarView({ project, initialPosts, performanceStats, initialInsights }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [progress, setProgress] = useState(0)
  const [modalPostId, setModalPostId] = useState<string | null>(null)
  const [insights, setInsights] = useState<string[] | null>(initialInsights)

  useEffect(() => {
    if (!generating) return
    let idx = 0
    const interval = setInterval(() => {
      idx++
      setLoadingMsg(LOADING_MESSAGES[idx % LOADING_MESSAGES.length])
      setProgress(Math.min(95, idx * 16))
    }, 3500)
    return () => clearInterval(interval)
  }, [generating])

  const generate = useCallback(async (performanceContext?: string) => {
    setGenerating(true)
    setError(null)
    setProgress(5)
    setLoadingMsg(LOADING_MESSAGES[0])
    try {
      const body = performanceContext ? JSON.stringify({ performanceContext }) : undefined
      const res = await fetch(`/api/content/projects/${project.id}/generate`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Generation failed')
      }
      const data = await res.json()
      setProgress(100)
      setPosts(data.posts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
      setProgress(0)
    }
  }, [project.id])

  const handlePostUpdated = useCallback((postId: string, patch: Partial<Post>) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...patch } : p))
  }, [])

  const weeks = chunkByWeek(posts, project.frequency || 5)
  const hasLaunch = project.hasLaunch && !!project.launchDate
  const totalPosts = Math.round(30 * project.frequency / 7)

  const modalPost = modalPostId ? posts.find(p => p.id === modalPostId) ?? null : null

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>
      <CalendarHeader
        projectId={project.id}
        postCount={posts.length}
        onRegenerate={() => generate()}
        generating={generating}
      />

      {/* Loading bar */}
      {generating && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            height: 3,
            background: 'var(--rule)',
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            <div style={{
              height: '100%',
              background: 'var(--amber)',
              width: `${progress}%`,
              transition: 'width 0.8s ease',
              borderRadius: 2,
            }} />
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {loadingMsg}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !generating && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 4,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: '#DC2626',
          }}>
            {error}
          </span>
          <button
            onClick={() => generate()}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: '#DC2626',
              background: 'none',
              border: '1px solid #FECACA',
              borderRadius: 4,
              padding: '5px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 && !generating && !error && (
        <div style={{
          border: '1.5px dashed var(--rule)',
          borderRadius: 6,
          padding: '64px 40px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 12,
          }}>
            Ready when you are.
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-4)',
            lineHeight: 1.65,
            margin: '0 0 24px',
          }}>
            Hit Generate to build your 30-day calendar. It uses your books, quotes,
            reviews, and images to write platform-native copy for every single post.
          </p>
          <button
            onClick={() => generate()}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: 'var(--ink)',
              border: 'none',
              borderRadius: 4,
              padding: '11px 24px',
              cursor: 'pointer',
            }}
          >
            Generate my calendar →
          </button>
        </div>
      )}

      {/* Calendar content */}
      {posts.length > 0 && !generating && (
        <>
          <TodaySummary posts={posts} />

          {performanceStats.loggedCount >= 3 && (
            <InsightsPanel
              projectId={project.id}
              stats={performanceStats}
              initialInsights={insights}
              onInsightsUpdated={setInsights}
              onRegenerateWithInsights={generate}
            />
          )}

          {hasLaunch && project.launchDate && (
            <>
              <LaunchArcBar
                launchDate={project.launchDate}
                frequency={project.frequency}
                totalPosts={totalPosts}
              />
              <PhaseLegend />
            </>
          )}

          {(weeks ?? []).map((weekPosts, i) => (
            <WeekGroup
              key={i}
              posts={weekPosts ?? []}
              weekIndex={i}
              onOpenModal={setModalPostId}
            />
          ))}
        </>
      )}

      {/* Loading skeleton */}
      {posts.length === 0 && generating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 88,
                background: 'var(--paper-2)',
                borderRadius: 4,
                border: '0.5px solid var(--rule)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Post modal */}
      {modalPost && (
        <PostModal
          post={modalPost as ModalPost}
          allPosts={posts as ModalPost[]}
          project={project}
          onClose={() => setModalPostId(null)}
          onNavigate={setModalPostId}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  )
}
