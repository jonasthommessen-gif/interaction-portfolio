import { describe, expect, it } from 'vitest'
import { buildArchiveGalleryEntries, getArchiveLoopWidth } from './archiveGallery'
import type { ArchiveProject } from '../types/cms'

function mockProject(overrides: Partial<ArchiveProject> = {}): ArchiveProject {
  return {
    id: 'post-1',
    title: 'Main Title',
    description: '',
    tags: ['Tag A', 'Tag B', 'Tag C'],
    categories: [],
    duration: '',
    cover: '/cover.jpg',
    visible: true,
    order: 0,
    images: [],
    media: [
      { type: 'image', src: '/cover.jpg', alt: 'Cover alt' },
      { type: 'video', src: '/clip.mp4', alt: 'Motion clip' },
      { type: 'image', src: '/still.jpg', alt: 'Still frame' },
      { type: 'image', src: '/extra.jpg' },
    ],
    ...overrides,
  }
}

describe('buildArchiveGalleryEntries', () => {
  it('spawns up to three cards per post with unique covers and titles', () => {
    const entries = buildArchiveGalleryEntries([mockProject()])
    expect(entries).toHaveLength(3)
    expect(new Set(entries.map((e) => e.cover)).size).toBe(3)
    expect(new Set(entries.map((e) => e.displayTitle)).size).toBe(3)
    expect(entries.every((e) => e.projectId === 'post-1')).toBe(true)
  })

  it('skips hidden posts', () => {
    const entries = buildArchiveGalleryEntries([mockProject({ visible: false })])
    expect(entries).toHaveLength(0)
  })

  it('spawns fewer cards when media is limited', () => {
    const entries = buildArchiveGalleryEntries([
      mockProject({ media: [{ type: 'image', src: '/only.jpg' }] }),
    ])
    expect(entries).toHaveLength(1)
  })
})

describe('getArchiveLoopWidth', () => {
  it('grows with card count', () => {
    expect(getArchiveLoopWidth(10)).toBeGreaterThan(4000)
    expect(getArchiveLoopWidth(50)).toBeGreaterThan(getArchiveLoopWidth(10))
  })
})
