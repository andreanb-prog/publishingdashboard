'use client'

interface Slide {
  slide: number
  imageDirection: string
  overlayText: string
}

interface Props {
  slides: Slide[]
}

export default function CarouselSlides({ slides }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {slides.map(slide => (
        <div
          key={slide.slide}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '10px 12px',
            background: 'var(--paper-2)',
            borderRadius: 4,
            border: '1px solid var(--rule)',
          }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--amber)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            marginTop: 2,
            flexShrink: 0,
          }}>
            {String(slide.slide).padStart(2, '0')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              color: 'var(--ink)',
              lineHeight: 1.5,
              marginBottom: 4,
            }}>
              {slide.overlayText}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {slide.imageDirection}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
