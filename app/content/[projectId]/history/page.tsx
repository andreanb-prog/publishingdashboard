import type { CSSProperties } from 'react'
import { redirect, notFound } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'
import ExportMenu from '@/components/content/calendar/ExportMenu'

export const metadata = {
  title: 'StoryPost · Project History',
}

export default async function HistoryPage({ params }: { params: { projectId: string } }) {
  const session = await getAugmentedSession()
  if (!session) redirect('/login')

  const project = await db.storyPostProject.findFirst({
    where: { id: params.projectId, userId: session.user.id },
  })
  if (!project) notFound()

  const posts = await db.storyPostPost.findMany({
    where: { projectId: params.projectId },
    orderBy: { dayNumber: 'asc' },
  })

  const scheduledCount = posts.filter(p => p.scheduledAt).length
  const loggedCount = posts.filter(p => p.reach != null).length
  const generatedAt = posts.length > 0
    ? new Date(Math.min(...posts.map(p => new Date(p.createdAt).getTime())))
    : null

  const monoLabel: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: 'rgba(20,33,61,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  }

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 760 }}>
      {/* Page header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ ...monoLabel, marginBottom: 8 }}>Project History</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 26,
          fontWeight: 700,
          color: '#14213D',
          lineHeight: 1.2,
          marginBottom: 8,
        }}>
          {project.name}
        </div>
        <a
          href={`/content/${params.projectId}/calendar`}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            color: 'rgba(20,33,61,0.55)',
            textDecoration: 'none',
          }}
        >
          ← Back to calendar
        </a>
      </div>

      {/* Current calendar card */}
      {posts.length > 0 ? (
        <div style={{
          background: '#F7F0DC',
          border: '1px solid rgba(20,33,61,0.14)',
          borderRadius: 6,
          padding: '24px 28px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...monoLabel, marginBottom: 10 }}>Current Calendar</div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: '#14213D',
                marginBottom: 16,
              }}>
                {generatedAt
                  ? generatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Unknown date'}
              </div>

              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <Stat label="Posts" value={String(posts.length)} />
                <Stat label="Scheduled" value={String(scheduledCount)} />
                <Stat label="Performance logged" value={String(loggedCount)} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <ExportMenu projectId={params.projectId} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          border: '1.5px dashed rgba(20,33,61,0.14)',
          borderRadius: 6,
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'rgba(20,33,61,0.55)',
            marginBottom: 16,
          }}>
            No calendar generated yet.
          </div>
          <a
            href={`/content/${params.projectId}/calendar`}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#B07A2A',
              textDecoration: 'none',
            }}
          >
            Generate your first calendar →
          </a>
        </div>
      )}

      {/* Future calendars note */}
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        color: 'rgba(20,33,61,0.4)',
        marginTop: 16,
        fontStyle: 'italic',
      }}>
        Multi-calendar history coming in a future update. Each calendar you generate will appear here.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        color: '#14213D',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        color: 'rgba(20,33,61,0.55)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
    </div>
  )
}
