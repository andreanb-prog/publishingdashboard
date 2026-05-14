'use client'

import { useRef, useState, DragEvent } from 'react'

interface Props {
  onFilesSelected: (files: File[]) => void
  uploading: boolean
}

export default function ImageUploadZone({ onFilesSelected, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (valid.length > 0) onFilesSelected(valid)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--amber)' : 'var(--rule)'}`,
        borderRadius: 8,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: uploading ? 'wait' : 'pointer',
        background: dragging ? 'rgba(176,122,42,0.04)' : 'var(--paper-2)',
        transition: 'border-color 0.15s, background 0.15s',
        userSelect: 'none',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={e => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 28,
        color: 'var(--rule)',
        marginBottom: 12,
        lineHeight: 1,
      }}>
        ↑
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink-2)',
        marginBottom: 6,
      }}>
        {uploading ? 'Uploading…' : 'Drag and drop images here'}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        color: 'var(--ink-4)',
      }}>
        {uploading ? 'Please wait' : 'JPG, PNG, WEBP · up to 50 images'}
      </div>
    </div>
  )
}
