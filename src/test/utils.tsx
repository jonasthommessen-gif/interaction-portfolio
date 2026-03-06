import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'

/**
 * Wrapper that provides MemoryRouter for route-dependent components.
 */
function AllThemes({ children, ...routerProps }: { children: ReactNode } & MemoryRouterProps) {
  return <MemoryRouter {...routerProps}>{children}</MemoryRouter>
}

/**
 * Custom render that wraps the UI in MemoryRouter. Use for testing components
 * that use useParams, useNavigate, or Link.
 */
function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { routerProps?: MemoryRouterProps },
) {
  const { routerProps = {}, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => (
      <AllThemes {...routerProps}>{children}</AllThemes>
    ),
    ...renderOptions,
  })
}

export { render, renderWithRouter }
export * from '@testing-library/react'
