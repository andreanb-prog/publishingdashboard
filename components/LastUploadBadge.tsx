'use client'
// components/LastUploadBadge.tsx
import { useEffect, useState } from 'react'

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatUploadDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatRangeDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateRange(start: string, end: string): string {
  if (start === end) return formatRangeDate(start)
  return `${formatRangeDate(start)} \u2013 ${formatRangeDate(end)}`
}

export function LastUploadBadge({
  channel,
  dateRange,
}: {
  channel: 'kdp' | 'meta'
  dateRange?: { start: string; end: string }
}) {
  const [uploadedAt, setUploadedAt] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/upload-timestamp?channel=${channel}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setUploadedAt(d?.uploadedAt ?? null))
      .catch(() => setUploadedAt(null))
  }, [channel])

  const muted: React.CSSProperties = {
    color: 'rgba(30, 45, 61, 0.55)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontSize: 11.5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  }

  // Loading skeleton
  if (uploadedAt === undefined) {
    return (
      <div
        className="animate-pulse rounded"
        style={{ width: 80, height: 14, background: 'rgba(30,45,61,0.08)', marginBottom: 12 }}
      />
    )
  }

  return (
    <p style={{ ...muted, marginBottom: 12, marginTop: 2 }}>
      <ClockIcon />
      {uploadedAt
        ? <>Last upload: {formatUploadDate(uploadedAt)}</>
        : 'No data uploaded yet'}
      {dateRange?.start && dateRange?.end && (
        <span style={{ marginLeft: 6, paddingLeft: 6, borderLeft: '1px solid rgba(30,45,61,0.15)' }}>
          {formatDateRange(dateRange.start, dateRange.end)}
        </span>
      )}
    </p>
  )
}
