import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '36rem',
            margin: '3rem auto',
            padding: '1.5rem',
            lineHeight: 1.5,
          }}
        >
          <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.75rem' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 1rem', color: '#444' }}>
            The app hit an error after loading. You can reload the page. If this happened right after sign-in,
            try clearing site data for this origin or signing in again.
          </p>
          <pre
            style={{
              fontSize: '0.8rem',
              overflow: 'auto',
              padding: '0.75rem',
              background: '#f4f4f5',
              borderRadius: '8px',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
