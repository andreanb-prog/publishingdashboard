'use client'

import { useState } from 'react'

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
  image: Image
  pillars: Pillar[]
  onTagChange: (imageId: string, pillarName: string | null) => void
}

const PILLAR_COLORS = ['#7B8466', '#14213D', '#B07A2A', '#A86E5E']

export default function ImageThumb({ image, pillars, onTagChange }: Props) {
  const [hovered, setHovered] = useState(false)
  const [saving, setSaving] = useState(false)

  const activePillar = pillars.find(p => p.name === image.pillarTag)
  const borderColor = activePillar ? activePillar.color : 'transparent'

  const handleTag = async (pillarName: string) => {
    const newTag = image.pillarTag === pillarName ? null : pillarName
    setSaving(true)
    try {
      onTagChange(image.id, newTag)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 6,
        overflow: 'hidden',
        border: activePillar
          ? `2px solid ${borderColor}`
          : '2px dashed rgba(20,33,61,0.14)',
        transition: 'border 0.15s',
      }}>
        <img
          src={image.url}
          alt={image.label ?? 'image'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Hover overlay */}
        {hovered && pillars.length > 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(20,33,61,0.72)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: 8,
          }}>
            {pillars.map((p, i) => (
              <button
                key={p.name}
                onClick={() => handleTag(p.name)}
                disabled={saving}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#fff',
                  background: image.pillarTag === p.name ? p.color : 'rgba(255,255,255,0.15)',
                  border: `1px solid ${p.color}`,
                  borderRadius: 3,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  width: '100%',
                  transition: 'background 0.12s',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        letterSpacing: '0.04em',
        lineHeight: 1.3,
        minHeight: 14,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {image.label ?? '—'}
      </div>

      {/* Pillar badge */}
      {activePillar && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: activePillar.color,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            color: activePillar.color,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}>
            {activePillar.name}
          </span>
        </div>
      )}
    </div>
  )
}
