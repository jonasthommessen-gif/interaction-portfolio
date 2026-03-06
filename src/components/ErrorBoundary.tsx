import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className={styles.wrapper} role="alert">
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            The app encountered an error. Please try again.
          </p>
          <button
            type="button"
            className={styles.reloadButton}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
