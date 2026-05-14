'use client'

import { useState, useCallback } from 'react'
import ImageUploadZone from './ImageUploadZone'
import ImageGrid from './ImageGrid'
import LibraryStats from './LibraryStats'

interface Image {
  id: string
  url: string
  label: string | null
  pillarTag: string | null
}

interface Props {
  projectId: string
  initialImages: Image[]
  pillars: { name: string }[]
}

const PILLAR_COLORS = ['#7B8466', '#14213D', '#B07A2A', '#A86E5E']

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9,
  color: 'var(--ink-4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

const ghostBtn: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-3)',
  background: 'none',
  border: '1px solid var(--rule)',
  borderRadius: 4,
  padding: '8px 16px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const primaryBtn: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 4,
  padding: '8px 18px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

export default function ImageLibrary({ projectId, initialImages, pillars }: Props) {
  const [images, setImages] = useState<Image[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [labelingCount, setLabelingCount] = useState(0)

  const coloredPillars = pillars.map((p, i) => ({
    name: p.name,
    color: PILLAR_COLORS[i % PILLAR_COLORS.length],
  }))

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const capped = files.slice(0, 50)
    setUploading(true)

    const uploaded: Image[] = []
    for (const file of capped) {
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`/api/content/projects/${projectId}/images/upload`, {
          method: 'POST',
          body: form,
        })
        if (!res.ok) continue
        const { image } = await res.json()
        uploaded.push(image)
        setImages(prev => [...prev, image])
      } catch {
        // skip failed uploads silently
      }
    }

    setUploading(false)

    // Label unlabeled images sequentially
    const unlabeled = uploaded.filter(img => !img.label)
    if (unlabeled.length === 0) return

    setLabelingCount(unlabeled.length)
    for (const img of unlabeled) {
      try {
        const res = await fetch(`/api/content/projects/${projectId}/images/label`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: img.id }),
        })
        if (!res.ok) continue
        const { imageId, label } = await res.json()
        setImages(prev => prev.map(i => i.id === imageId ? { ...i, label } : i))
        setLabelingCount(c => Math.max(0, c - 1))
        // Short delay between label calls to avoid rate limits
        await new Promise(r => setTimeout(r, 400))
      } catch {
        setLabelingCount(c => Math.max(0, c - 1))
      }
    }
  }, [projectId])

  const handleTagChange = useCallback(async (imageId: string, pillarName: string | null) => {
    setImages(prev => prev.map(i => i.id === imageId ? { ...i, pillarTag: pillarName } : i))
    try {
      await fetch(`/api/content/projects/${projectId}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pillarTag: pillarName }),
      })
    } catch {
      // revert optimistic update on error
      setImages(prev => prev.map(i => i.id === imageId ? { ...i, pillarTag: i.pillarTag } : i))
    }
  }, [projectId])

  const isComplete = images.length >= 5

  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 900 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ ...monoLabel, marginBottom: 12 }}>STEP 04 · IMAGE LIBRARY</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
          }}>
            Your images, <em style={{ fontStyle: 'italic', fontWeight: 400 }}>organized.</em>
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            color: 'var(--ink-4)',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 520,
          }}>
            Upload your batched images once. Claude reads each one and writes a label — no renaming needed. Tag by pillar in two minutes or let the calendar assign automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24, paddingTop: 8 }}>
          <a href={`/content/${projectId}/reviews`} style={ghostBtn}>
            Back to Reviews
          </a>
          <a href={`/content/${projectId}/calendar`} style={primaryBtn}>
            Generate My Calendar →
          </a>
        </div>
      </div>

      {/* Status badge */}
      {images.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 3,
          background: isComplete ? 'rgba(123,132,102,0.12)' : 'rgba(20,33,61,0.06)',
          marginBottom: 28,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: isComplete ? 'var(--sage)' : 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}>
            {isComplete
              ? `${images.length} IMAGES · COMPLETE`
              : `${images.length} IMAGES · ${5 - images.length} more to complete`}
          </span>
        </div>
      )}

      {/* Upload section */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 16px',
        }}>
          Upload images
        </h2>
        <ImageUploadZone onFilesSelected={handleFilesSelected} uploading={uploading} />
        {images.length > 0 && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-4)',
            marginTop: 10,
            letterSpacing: '0.06em',
          }}>
            {images.length} image{images.length !== 1 ? 's' : ''} in library
          </div>
        )}
      </section>

      {/* Labeling progress */}
      {labelingCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(176,122,42,0.08)',
          borderRadius: 4,
          marginBottom: 24,
          border: '1px solid rgba(176,122,42,0.2)',
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: '2px solid var(--amber)',
            borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--amber)',
            letterSpacing: '0.06em',
          }}>
            LABELING {labelingCount} IMAGE{labelingCount !== 1 ? 'S' : ''}…
          </span>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--ink)',
            margin: '0 0 16px',
          }}>
            Library
          </h2>
          <ImageGrid
            images={images}
            pillars={coloredPillars}
            onTagChange={handleTagChange}
          />
          <LibraryStats images={images} />
        </section>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
