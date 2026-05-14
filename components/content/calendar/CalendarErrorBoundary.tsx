'use client'

import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

interface Props {
  children: React.ReactNode
  onReset?: () => void
}

export default class CalendarErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Calendar render error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '48px',
          maxWidth: 560,
          margin: '0 auto',
        }}>
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '32px 36px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#1E2D3D',
              marginBottom: 10,
            }}>
              Something went wrong rendering your calendar.
            </div>
            {this.state.error && (
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: '#DC2626',
                background: '#FEE2E2',
                borderRadius: 4,
                padding: '8px 12px',
                marginBottom: 20,
                textAlign: 'left',
                wordBreak: 'break-all',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                background: '#1E2D3D',
                border: 'none',
                borderRadius: 4,
                padding: '10px 22px',
                cursor: 'pointer',
              }}
            >
              Regenerate Calendar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
