import { describe, it, expect } from 'vitest'
import {
  parseTLEText,
  propagateToLatLon,
  isInBBox,
  latLonToCanvas,
  computeTrail,
  smoothTrailWithSpline,
  type BBox,
  type LatLon,
  SCANDINAVIA_BBOX,
} from './satelliteMath'

const ISS_TLE_3LINE = `ISS (ZARYA)
1 25544U 98067A   25057.54791667  .00020351  00000+0  36234-3 0  9993
2 25544  51.6393 108.4583 0003456  47.2345 312.9012 15.50419762494123`

const TLE_2LINE = `1 25544U 98067A   25057.54791667  .00020351  00000+0  36234-3 0  9993
2 25544  51.6393 108.4583 0003456  47.2345 312.9012 15.50419762494123`

describe('parseTLEText', () => {
  it('parses 3-line format and returns one ParsedSat with correct name', () => {
    const result = parseTLEText(ISS_TLE_3LINE)
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('ISS (ZARYA)')
    expect(result[0]?.satrec).toBeDefined()
    expect(result[0]?.satrec.satnum).toBe('25544')
  })

  it('parses 2-line format and assigns NORAD-xxx name', () => {
    const result = parseTLEText(TLE_2LINE)
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('NORAD-25544')
    expect(result[0]?.satrec.satnum).toBe('25544')
  })

  it('returns empty array for empty or whitespace-only input', () => {
    expect(parseTLEText('')).toEqual([])
    expect(parseTLEText('   \n  \n  ')).toEqual([])
  })

  it('skips malformed TLE lines', () => {
    const bad = `BAD NAME
1 25544U 98067A   25057.54791667  .00020351  00000+0  36234-3 0  9993
2 25544  51.6393 108.4583 0003456  47.2345 312.9012 15.50419762494123
GOOD
1 33591U 09005A   25057.50000000  .00000065  00000+0  57234-4 0  9991
2 33591  99.1234 123.4567 0013456 234.5678  45.6789 14.12345678901234`
    const result = parseTLEText(bad)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((s) => s.name === 'GOOD')).toBe(true)
  })
})

describe('isInBBox', () => {
  const bbox: BBox = { latMin: 50, latMax: 70, lonMin: 0, lonMax: 30 }

  it('returns true for point inside bbox', () => {
    expect(isInBBox({ lat: 60, lon: 15, altKm: 400 }, bbox)).toBe(true)
  })

  it('returns true for point on boundary', () => {
    expect(isInBBox({ lat: 50, lon: 0, altKm: 0 }, bbox)).toBe(true)
  })

  it('returns false for point outside lat', () => {
    expect(isInBBox({ lat: 80, lon: 15, altKm: 0 }, bbox)).toBe(false)
  })

  it('returns false for point outside lon', () => {
    expect(isInBBox({ lat: 60, lon: 50, altKm: 0 }, bbox)).toBe(false)
  })
})

describe('latLonToCanvas', () => {
  const bbox: BBox = { latMin: 0, latMax: 100, lonMin: 0, lonMax: 100 }
  const w = 200
  const h = 100

  it('maps bbox corners to canvas corners', () => {
    const bl = latLonToCanvas({ lat: 0, lon: 0, altKm: 0 }, bbox, w, h)
    expect(bl.x).toBe(0)
    expect(bl.y).toBe(h) // lat 0 is bottom (y inverted)

    const tr = latLonToCanvas({ lat: 100, lon: 100, altKm: 0 }, bbox, w, h)
    expect(tr.x).toBe(w)
    expect(tr.y).toBe(0)
  })

  it('inverts y so higher lat gives lower pixel y', () => {
    const low = latLonToCanvas({ lat: 25, lon: 50, altKm: 0 }, bbox, w, h)
    const high = latLonToCanvas({ lat: 75, lon: 50, altKm: 0 }, bbox, w, h)
    expect(high.y).toBeLessThan(low.y)
  })
})

describe('propagateToLatLon', () => {
  it('returns LatLon for valid TLE and date', () => {
    const parsed = parseTLEText(ISS_TLE_3LINE)
    expect(parsed).toHaveLength(1)
    const date = new Date('2025-02-27T12:00:00Z')
    const ll = propagateToLatLon(parsed[0]!.satrec, date)
    expect(ll).not.toBeNull()
    expect(ll).toHaveProperty('lat')
    expect(ll).toHaveProperty('lon')
    expect(ll).toHaveProperty('altKm')
    expect(typeof (ll as LatLon).lat).toBe('number')
    expect(typeof (ll as LatLon).lon).toBe('number')
  })
})

describe('computeTrail', () => {
  it('returns array of TrailPoints for valid satrec and bbox', () => {
    const parsed = parseTLEText(ISS_TLE_3LINE)
    expect(parsed).toHaveLength(1)
    const now = Date.now()
    const trail = computeTrail(
      parsed[0]!.satrec,
      now,
      5,
      30,
      SCANDINAVIA_BBOX,
      800,
      400,
    )
    expect(Array.isArray(trail)).toBe(true)
    trail.forEach((p) => {
      expect(p).toHaveProperty('x')
      expect(p).toHaveProperty('y')
      if (!isNaN(p.x)) expect(typeof p.x).toBe('number')
      if (!isNaN(p.y)) expect(typeof p.y).toBe('number')
    })
  })
})

describe('smoothTrailWithSpline', () => {
  it('returns empty array for empty input', () => {
    expect(smoothTrailWithSpline([], 5)).toEqual([])
  })

  it('returns same array when samplesPerSegment <= 1', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    expect(smoothTrailWithSpline(pts, 1)).toEqual(pts)
  })

  it('preserves NaN sentinels as segment breaks', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: NaN, y: NaN },
      { x: 20, y: 20 },
    ]
    const out = smoothTrailWithSpline(pts, 3)
    const nanIdx = out.findIndex((p) => isNaN(p.x))
    expect(nanIdx).toBeGreaterThanOrEqual(0)
  })
})
