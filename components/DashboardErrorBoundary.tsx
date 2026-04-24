'use client'
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DashboardErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          border: '1px solid rgba(30,45,61,0.1)',
          borderLeft: '4px solid #D97706',
          padding: '1.25rem 1.5rem',
          margin: '1rem 0',
        }}>
          <div style={{ color: '#1E2D3D', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Something went wrong
          </div>
          <div style={{ color: 'rgba(30,45,61,0.6)', fontSize: 14 }}>
            Try refreshing the page. If the problem continues, use the feedback button.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
