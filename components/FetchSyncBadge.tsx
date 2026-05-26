'use client'
import { useEffect, useState } from 'react'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 90) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

const PLATFORM_LABELS: Record<string, string> = {
  kdp: 'KDP',
  meta: 'Meta Ads',
  bookclicker: 'BookClicker',
}

export function FetchSyncBadge({ channel }: { channel: 'kdp' | 'meta' | 'bookclicker' }) {
  const [lastSync, setLastSync] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/extension/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.hasExtension) { setLastSync(null); return }
        setLastSync(data[channel]?.lastSync ?? null)
      })
      .catch(() => setLastSync(null))
  }, [channel])

  // Loading or no extension — show nothing
  if (lastSync === undefined || lastSync === null) return null

  const isRecent = Date.now() - new Date(lastSync).getTime() < SEVEN_DAYS_MS
  const label = PLATFORM_LABELS[channel] ?? channel

  if (isRecent) {
    return (
      <p
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11.5,
          color: 'rgba(30, 45, 61, 0.55)',
          fontFamily: 'var(--font-sans)',
          marginBottom: 12,
          marginTop: -8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#6EBF8B',
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        🐕 Last synced by Fetch: {relativeTime(lastSync)}
      </p>
    )
  }

  return (
    <p
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        color: '#E9A020',
        fontFamily: 'var(--font-sans)',
        marginBottom: 12,
        marginTop: -8,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#E9A020',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      🐕 Fetch hasn&apos;t synced recently — visit {label} to update
    </p>
  )
}
