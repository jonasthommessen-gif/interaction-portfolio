import { describe, it, expect } from 'vitest'
import {
  expandBBox,
  getVisibleRectAndTransform,
  getSatDescription,
  ISS_EXACT_NAME,
} from './satelliteOverlayUtils'
import type { BBox } from './satelliteMath'

describe('expandBBox', () => {
  it('expands bbox by fraction on all sides', () => {
    const bbox: BBox = { latMin: 50, latMax: 70, lonMin: 0, lonMax: 30 }
    const expanded = expandBBox(bbox, 0.1)
    const latRange = 20
    const lonRange = 30
    expect(expanded.latMin).toBe(50 - latRange * 0.1)
    expect(expanded.latMax).toBe(70 + latRange * 0.1)
    expect(expanded.lonMin).toBe(0 - lonRange * 0.1)
    expect(expanded.lonMax).toBe(30 + lonRange * 0.1)
  })

  it('returns same-size bbox when frac is 0', () => {
    const bbox: BBox = { latMin: 0, latMax: 10, lonMin: -5, lonMax: 5 }
    expect(expandBBox(bbox, 0)).toEqual(bbox)
  })
})

describe('getVisibleRectAndTransform', () => {
  it('maps visible rect and transform for bbox inside expanded', () => {
    const bbox: BBox = { latMin: 50, latMax: 60, lonMin: 10, lonMax: 20 }
    const expanded: BBox = { latMin: 45, latMax: 65, lonMin: 5, lonMax: 25 }
    const result = getVisibleRectAndTransform(bbox, expanded, 200, 100)

    expect(result.visibleLeft).toBeGreaterThan(0)
    expect(result.visibleTop).toBeGreaterThan(0)
    expect(result.visibleRight).toBeLessThanOrEqual(200)
    expect(result.visibleBottom).toBeLessThanOrEqual(100)
    expect(result.scaleX).toBeGreaterThan(1)
    expect(result.scaleY).toBeGreaterThan(1)
    expect(result.tx).toBeLessThan(0)
    expect(result.ty).toBeLessThan(0)
  })

  it('when bbox equals expanded, visible rect fills canvas', () => {
    const bbox: BBox = { latMin: 0, latMax: 100, lonMin: 0, lonMax: 100 }
    const result = getVisibleRectAndTransform(bbox, bbox, 300, 200)
    expect(result.visibleLeft).toBe(0)
    expect(result.visibleTop).toBe(0)
    expect(result.visibleRight).toBe(300)
    expect(result.visibleBottom).toBe(200)
    expect(result.scaleX).toBe(1)
    expect(result.scaleY).toBe(1)
    expect(Math.abs(result.tx)).toBe(0)
    expect(Math.abs(result.ty)).toBe(0)
  })
})

describe('getSatDescription', () => {
  it('returns description for ISS (ZARYA)', () => {
    expect(getSatDescription(ISS_EXACT_NAME)).toBe('INTERNATIONAL SPACE STATION')
  })

  it('returns description for ISS debris', () => {
    expect(getSatDescription('ISS DEB (OBJECT A)')).toBe('DEBRIS / RELEASED FROM ISS')
  })

  it('returns description for Starlink', () => {
    expect(getSatDescription('STARLINK-1007')).toBe('SPACEX STARLINK CONSTELLATION')
  })

  it('returns description for Chinese Space Station', () => {
    expect(getSatDescription('CSS (TIANHE-1)')).toBe('CHINESE SPACE STATION')
  })

  it('returns null for unknown satellite', () => {
    expect(getSatDescription('UNKNOWN SAT')).toBeNull()
    expect(getSatDescription('NOAA 19')).toBeNull()
  })
})
