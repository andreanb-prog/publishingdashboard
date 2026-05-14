'use client'

interface Post {
  type: string
  imageUrl?: string | null
}

interface Props {
  posts: Post[]
}

export default function TodaySummary({ posts }: Props) {
  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const safePosts = posts ?? []
  const imagesNeeded = safePosts.filter(p =>
    ['Single Image', 'Carousel', 'Video Script'].includes(p.type ?? '') && !p.imageUrl
  ).length

  const captionsToWrite = safePosts.filter(p => p.type !== 'Review').length
  const readyToSchedule = safePosts.filter(p => p.imageUrl).length

  const isDayForImages = imagesNeeded > 0
  const summaryLine = isDayForImages
    ? `An image day. ${imagesNeeded} image${imagesNeeded !== 1 ? 's' : ''} needed this week.`
    : `A caption day. You have ${captionsToWrite} captions in this calendar.`

  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: '20px 24px',
      marginBottom: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}>
          {dateLabel}
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1.4,
        }}>
          {summaryLine}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        <Chip label="Images needed" value={imagesNeeded} />
        <Chip label="Captions" value={captionsToWrite} />
        <Chip label="Ready to schedule" value={readyToSchedule} accent />
      </div>
    </div>
  )
}

function Chip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: accent ? 'var(--amber)' : 'var(--ink)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textAlign: 'center',
      }}>
        {label}
      </div>
    </div>
  )
}
