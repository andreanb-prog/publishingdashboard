'use client'
// components/ErrorBoundary.tsx — Catches React render crashes with branded fallback
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error.message)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)

    // Send to Sentry if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[300px] p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="font-sans text-[20px] mb-2" style={{ color: '#1E2D3D' }}>
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h2>
            <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
              We hit an unexpected error loading this section. Try refreshing the page.
              If it keeps happening, let us know using the feedback button.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold border-none cursor-pointer"
              style={{ background: '#E9A020', color: '#0d1f35' }}
            >
              Refresh page
            </button>
            {this.state.error && (
              <div className="mt-4 text-[11px] font-mono px-3 py-2 rounded-lg text-left"
                style={{ background: '#F5F5F4', color: '#6B7280' }}>
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
