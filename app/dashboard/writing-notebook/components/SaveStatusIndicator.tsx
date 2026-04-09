'use client'
import { useState, useEffect, useRef } from 'react'

type SaveState = 'idle' | 'saving' | 'saved'

interface Props {
  saveState: SaveState
  lastSavedAt: number | null // Date.now() timestamp
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${Math.floor(diff / 5) * 5}s ago`
  const mins = Math.floor(diff / 60)
  if (mins === 1) return '1 min ago'
  return `${mins} mins ago`
}

export function SaveStatusIndicator({ saveState, lastSavedAt }: Props) {
  const [label, setLabel] = useState('Saved just now')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (saveState === 'saving') {
      setLabel('Saving...')
      return
    }
    if (saveState === 'saved' && lastSavedAt) {
      setLabel(`Saved ${formatTimeAgo(lastSavedAt)}`)
      intervalRef.current = setInterval(() => {
        setLabel(`Saved ${formatTimeAgo(lastSavedAt)}`)
      }, 5000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [saveState, lastSavedAt])

  if (saveState === 'idle' && !lastSavedAt) return null

  const dotColor = saveState === 'saving' ? '#E9A020' : '#6EBF8B'
  const textColor = saveState === 'saving' ? '#E9A020' : '#9CA3AF'

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
      <span className="text-[12px]" style={{ color: textColor, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {label}
      </span>
    </div>
  )
}
