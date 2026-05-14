'use client'

import { useState } from 'react'

interface Stats {
  loggedCount: number
  totalCount: number
  avgReach: number
  avgSaves: number
  clickRate: number
}

interface Props {
  projectId: string
  stats: Stats
  initialInsights: string[] | null
  onInsightsUpdated: (insights: string[]) => void
  onRegenerateWithInsights: (context: string) => void
}

function insightBorder(text: string): string {
  if (text.startsWith('MOMENTUM:')) return 'var(--sage)'
  if (text.startsWith('OPPORTUNITY:')) return 'var(--amber)'
  return 'var(--ink-2)'
}

export default function InsightsPanel({
  projectId,
  stats,
  initialInsights,
  onInsightsUpdated,
  onRegenerateWithInsights,
}: Props) {
  const [insights, setInsights] = useState<string[] | null>(initialInsights)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { loggedCount, totalCount, avgReach, avgSaves, clickRate } = stats

  if (loggedCount < 3) return null

  const needMore = loggedCount < 5
  const remaining = 5 - loggedCount

  async function handleFetch() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/content/projects/${projectId}/insights`)
      if (!res.ok) throw new Error('Failed to load insights')
      const data = await res.json()
      const fresh = data.insights as string[]
      setInsights(fresh)
      onInsightsUpdated(fresh)
    } catch {
      setError('Could not load insights. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleRegenerate() {
    if (!insights?.length) return
    const context = `PERFORMANCE DATA FROM PREVIOUS CALENDAR:\n${insights.join('\n')}\n\nStats: avg reach ${avgReach}, avg saves ${avgSaves}, click rate ${clickRate}%`
    onRegenerateWithInsights(context)
  }

  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 6,
      padding: '20px 24px',
      marginBottom: 28,
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: 16,
      }}>
        What the data says
      </div>

      {/* Stats row — always show */}
      <div style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        <StatChip label="Avg Reach" value={avgReach.toLocaleString()} />
        <StatChip label="Avg Saves" value={avgSaves.toLocaleString()} />
        <StatChip label="Click Rate" value={`${clickRate}%`} />
        <StatChip label="Posts Logged" value={`${loggedCount} / ${totalCount}`} />
      </div>

      {/* Progress state */}
      {needMore && (
        <div style={{ marginTop: 4 }}>
          <div style={{
            height: 3,
            background: 'var(--rule)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <div style={{
              height: '100%',
              background: 'var(--amber)',
              width: `${(loggedCount / 5) * 100}%`,
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            color: 'var(--ink-4)',
          }}>
            Log {remaining} more post{remaining !== 1 ? 's' : ''} to unlock your first performance report.
          </div>
        </div>
      )}

      {/* Insights state */}
      {!needMore && (
        <>
          {error && (
            <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>
          )}

          {!insights?.length && !loading && (
            <button
              onClick={handleFetch}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--amber)',
                background: 'none',
                border: '1px solid var(--amber)',
                borderRadius: 4,
                padding: '6px 14px',
                cursor: 'pointer',
                marginBottom: 4,
              }}
            >
              Generate your first report →
            </button>
          )}

          {loading && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-4)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Analyzing your data...
            </div>
          )}

          {insights && insights.length > 0 && !loading && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: `2px solid ${insightBorder(insight)}`,
                      paddingLeft: 12,
                    }}
                  >
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: 'var(--ink-2)',
                      lineHeight: 1.55,
                    }}>
                      {insight}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleRegenerate}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--paper)',
                    background: 'var(--ink)',
                    border: 'none',
                    borderRadius: 4,
                    padding: '7px 14px',
                    cursor: 'pointer',
                  }}
                >
                  Regenerate with these insights →
                </button>
                <button
                  onClick={handleFetch}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--ink-4)',
                    background: 'none',
                    border: '1px solid var(--rule)',
                    borderRadius: 4,
                    padding: '7px 14px',
                    cursor: 'pointer',
                  }}
                >
                  Refresh insights
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ink)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
    </div>
  )
}
