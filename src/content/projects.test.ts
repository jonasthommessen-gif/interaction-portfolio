import { describe, it, expect } from 'vitest'
import { getProjectBySlug, projects } from './projects'

describe('getProjectBySlug', () => {
  it('returns project when slug exists', () => {
    const project = getProjectBySlug('kinetic-cards')
    expect(project).toBeDefined()
    expect(project?.title).toBe('Kinetic Cards')
    expect(project?.slug).toBe('kinetic-cards')
    expect(project?.categories).toContain('Motion')
  })

  it('returns undefined for unknown slug', () => {
    expect(getProjectBySlug('nonexistent-project')).toBeUndefined()
    expect(getProjectBySlug('')).toBeUndefined()
  })

  it('returns correct project for every slug in projects list', () => {
    for (const p of projects) {
      const found = getProjectBySlug(p.slug)
      expect(found).toBe(p)
    }
  })

  it('is case-sensitive', () => {
    const lower = getProjectBySlug('kinetic-cards')
    const upper = getProjectBySlug('Kinetic-Cards')
    expect(lower).toBeDefined()
    expect(upper).toBeUndefined()
  })
})
