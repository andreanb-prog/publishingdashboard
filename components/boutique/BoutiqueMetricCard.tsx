'use client'
import React from 'react'

interface BoutiqueMetricCardProps {
  label: string
  value?: string | number
  delta?: number | null
  deltaDirection?: 'up' | 'down' | 'flat'
  subtext?: string
  isEmpty?: boolean
  tooltipContent?: string
  isProjection?: boolean
  colorDot?: string
}

export function BoutiqueMetricCard({
  label,
  value,
  delta,
  deltaDirection,
  subtext,
  isEmpty,
  tooltipContent,
  isProjection,
  colorDot,
}: BoutiqueMetricCardProps) {
  const direction: 'up' | 'down' | 'flat' | undefined =
    deltaDirection ??
    (typeof delta === 'number'
      ? delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
      : undefined)

  const deltaColor =
    direction === 'up' ? '#245c3f' :
    direction === 'down' ? 'var(--coral)' :
    'var(--ink4)'

  const deltaArrow =
    direction === 'up' ? '↑' :
    direction === 'down' ? '↓' : '→'

  const deltaDisplay =
    typeof delta === 'number'
      ? `${delta > 0 ? '+' : ''}${Math.abs(delta).toLocaleString()}`
      : null

  return (
    <div style={{
      background: 'var(--card-boutique)',
      border: '1px solid var(--line)',
      padding: '20px 22px',
      borderRadius: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--ink3)',
      }}>
        {colorDot && (
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            background: colorDot,
            flexShrink: 0,
          }} />
        )}
        {label}
        {tooltipContent && (
          <span
            title={tooltipContent}
            style={{ cursor: 'help', color: 'var(--ink4)', fontSize: 11 }}
          >
            ⓘ
          </span>
        )}
      </div>

      {isEmpty ? (
        <>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 32,
            color: 'var(--ink4)',
            lineHeight: 1,
          }}>
            —
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink4)',
          }}>
            <span style={{
              border: '1px solid var(--line2)',
              padding: '2px 7px',
              borderRadius: 2,
            }}>
              Connect to unlock
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Value */}
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            fontSize: 32,
            color: 'var(--ink)',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'baseline',
            gap: 2,
          }}>
            {isProjection && (
              <span
                title="This is an estimate based on available data"
                style={{ color: 'var(--amber-boutique)', fontSize: 26, lineHeight: 1 }}
              >
                ~
              </span>
            )}
            {value}
          </div>

          {/* Delta chip */}
          {direction && deltaDisplay && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: deltaColor,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <span>{deltaArrow} {deltaDisplay}</span>
              <span style={{ color: 'var(--ink4)' }}>vs prev</span>
            </div>
          )}

          {/* Subtext */}
          {subtext && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink4)',
            }}>
              {subtext}
            </div>
          )}
        </>
      )}
    </div>
  )
}
