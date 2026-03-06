import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils'
import { ErrorBoundary } from './ErrorBoundary'

function Thrower(): null {
  throw new Error('Test error')
  return null
}

describe('ErrorBoundary', () => {
  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })
})
