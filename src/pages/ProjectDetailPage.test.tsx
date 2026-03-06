import { describe, it, expect } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { renderWithRouter, screen } from '../test/utils'
import { ProjectDetailPage } from './ProjectDetailPage'

describe('ProjectDetailPage', () => {
  it('shows Not found when slug is invalid', () => {
    renderWithRouter(
      <Routes>
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>,
      { routerProps: { initialEntries: ['/projects/invalid-slug'] } },
    )

    expect(screen.getByText(/not found/i)).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("exist"))).toBeInTheDocument()
  })
})
