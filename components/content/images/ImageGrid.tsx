'use client'

import ImageThumb from './ImageThumb'

interface Pillar {
  name: string
  color: string
}

interface Image {
  id: string
  url: string
  label: string | null
  pillarTag: string | null
}

interface Props {
  images: Image[]
  pillars: Pillar[]
  onTagChange: (imageId: string, pillarName: string | null) => void
}

export default function ImageGrid({ images, pillars, onTagChange }: Props) {
  if (images.length === 0) {
    return (
      <div style={{
        padding: '40px 16px',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--ink-4)',
      }}>
        No images yet — upload your first batch above.
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 12,
    }}>
      {images.map(image => (
        <ImageThumb
          key={image.id}
          image={image}
          pillars={pillars}
          onTagChange={onTagChange}
        />
      ))}
    </div>
  )
}
