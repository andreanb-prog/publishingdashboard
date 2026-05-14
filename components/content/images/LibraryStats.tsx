'use client'

interface Image {
  id: string
  pillarTag: string | null
}

interface Props {
  images: Image[]
}

export default function LibraryStats({ images }: Props) {
  const total = images.length
  const tagged = images.filter(i => i.pillarTag).length
  const untagged = total - tagged

  if (total === 0) return null

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      color: 'var(--ink-4)',
      letterSpacing: '0.06em',
      paddingTop: 16,
      borderTop: '1px solid var(--rule)',
      marginTop: 16,
    }}>
      {total} images · {tagged} tagged · {untagged} untagged · ready for calendar
    </div>
  )
}
