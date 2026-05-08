'use client'
// app/dashboard/pinterest/page.tsx
import { Suspense, useEffect, useState } from 'react'
import {
  BoutiqueChannelPageLayout,
  BoutiquePageHeader,
  BoutiqueSectionLabel,
  BoutiqueDataGrid,
  BoutiqueMetricCard,
  BoutiquePageSkeleton,
} from '@/components/boutique'
import { FreshBanner } from '@/components/FreshBanner'

interface PinData {
  dateRange?: string
  totalImpressions?: number
  topBoards?: {
    url: string
    impressions: number
    engagement: number
    pinClicks: number
    outboundClicks: number
    saves: number
  }[]
  topPins?: {
    url: string
    impressions: number
  }[]
  uploadedAt?: string
}

function boardNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.replace(/\/$/, '').split('/')
    const slug = parts[parts.length - 1] || parts[parts.length - 2] || ''
    return slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  } catch {
    return url
  }
}

function pinIdFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.replace(/\/$/, '').split('/')
    const id = parts[parts.length - 1] || parts[parts.length - 2] || ''
    return id.length > 12 ? id.slice(0, 12) + '…' : id
  } catch {
    return url
  }
}

function fmt(n: number | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

export default function PinterestPage() {
  const [pin, setPin] = useState<PinData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analyze')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        const p = d?.analysis?.pinterest
        if (p) setPin(p as PinData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasData = !!(pin?.totalImpressions != null || pin?.topBoards?.length)

  const totalPinClicks    = pin?.topBoards?.reduce((s, b) => s + b.pinClicks, 0) ?? 0
  const totalOutbound     = pin?.topBoards?.reduce((s, b) => s + b.outboundClicks, 0) ?? 0
  const totalSaves        = pin?.topBoards?.reduce((s, b) => s + b.saves, 0) ?? 0
  const topBoard          = pin?.topBoards?.[0] ?? null
  const topBoardName      = topBoard ? boardNameFromUrl(topBoard.url) : ''
  const displayPins       = (pin?.topPins ?? []).slice(0, 10)
  const extraPins         = (pin?.topPins?.length ?? 0) - displayPins.length

  if (loading) {
    return (
      <BoutiqueChannelPageLayout>
        <BoutiquePageHeader title="Pinterest" subtitle="Impressions & discovery" badge="PINTEREST" badgeColor="#E60023" />
        <BoutiquePageSkeleton cols={4} rows={2} />
      </BoutiqueChannelPageLayout>
    )
  }

  if (!hasData) {
    return (
      <BoutiqueChannelPageLayout>
        <BoutiquePageHeader title="Pinterest" subtitle="Impressions & discovery" badge="PINTEREST" badgeColor="#E60023" />
        <Suspense fallback={null}><FreshBanner /></Suspense>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          gap: 14,
          background: '#FFF8F0',
          borderRadius: 12,
          border: '1.5px dashed #D4D0CB',
          marginTop: 24,
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <circle cx="18" cy="18" r="15" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="5 3" />
          </svg>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, color: '#1E2D3D', margin: 0, fontWeight: 600 }}>
            No Pinterest data yet
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#E9A020', margin: 0, textAlign: 'center', fontWeight: 700 }}>
            Upload your Pinterest Analytics CSV to unlock →
          </p>
        </div>
      </BoutiqueChannelPageLayout>
    )
  }

  return (
    <BoutiqueChannelPageLayout>
      <BoutiquePageHeader
        title="Pinterest"
        subtitle={pin?.dateRange ?? 'Impressions & discovery'}
        badge="PINTEREST"
        badgeColor="#E60023"
      />
      <Suspense fallback={null}><FreshBanner /></Suspense>

      {/* ── Metric tiles ── */}
      <BoutiqueSectionLabel label="Performance" />
      <div style={{ marginBottom: 32 }}>
        <BoutiqueDataGrid cols={4}>
          <BoutiqueMetricCard
            label="Total Impressions"
            value={fmt(pin?.totalImpressions)}
            tooltipContent="Total number of times your pins were seen across Pinterest during this period."
          />
          <BoutiqueMetricCard
            label="Pin Clicks"
            value={fmt(totalPinClicks)}
            tooltipContent="Total clicks on your pins (opens the pin detail page). Summed across all top boards."
          />
          <BoutiqueMetricCard
            label="Outbound Clicks"
            value={fmt(totalOutbound)}
            tooltipContent="Clicks that sent people to your website from Pinterest. These are your most valuable traffic signals."
          />
          <BoutiqueMetricCard
            label="Saves"
            value={fmt(totalSaves)}
            tooltipContent="Times readers saved your pins to their own boards. Saves amplify your reach to new audiences."
          />
        </BoutiqueDataGrid>
      </div>

      {/* ── Top Board ── */}
      {topBoard && (
        <>
          <BoutiqueSectionLabel label="Top Board" />
          <div style={{ marginBottom: 32 }}>
            <a
              href={topBoard.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: 'white',
                border: '1.5px solid #6EBF8B',
                borderRadius: 12,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6EBF8B', marginBottom: 4 }}>
                      Top Board
                    </div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#1E2D3D' }}>
                      {topBoardName}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 13L13 3M13 3H7M13 3V9" stroke="#6EBF8B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Impressions',    value: fmt(topBoard.impressions) },
                    { label: 'Engagement',     value: fmt(topBoard.engagement) },
                    { label: 'Pin Clicks',     value: fmt(topBoard.pinClicks) },
                    { label: 'Outbound Clicks', value: fmt(topBoard.outboundClicks) },
                    { label: 'Saves',          value: fmt(topBoard.saves) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9CA3AF', marginBottom: 4 }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#1E2D3D' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </a>
          </div>
        </>
      )}

      {/* ── Top Pins ── */}
      {displayPins.length > 0 && (
        <>
          <BoutiqueSectionLabel label="Top Pins" />
          <div style={{
            background: 'white',
            border: '0.5px solid #EEEBE6',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 32,
          }}>
            {displayPins.map((pin, i) => (
              <div
                key={pin.url}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 20px',
                  borderBottom: i < displayPins.length - 1 ? '0.5px solid #EEEBE6' : 'none',
                }}
              >
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#9CA3AF', minWidth: 20, textAlign: 'right' }}>
                  {i + 1}
                </span>
                <a
                  href={pin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 500, color: '#1E2D3D', textDecoration: 'none', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  Pin {pinIdFromUrl(pin.url)}
                </a>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#6B7280', flexShrink: 0 }}>
                  {fmt(pin.impressions)} impressions
                </span>
              </div>
            ))}

            {extraPins > 0 && (
              <div style={{ padding: '12px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#9CA3AF' }}>
                and {extraPins} more pin{extraPins !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}
    </BoutiqueChannelPageLayout>
  )
}
