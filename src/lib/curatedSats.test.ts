import { describe, it, expect } from 'vitest'
import { getCategoryForName } from './curatedSats'

describe('getCategoryForName', () => {
  it('returns Space Station for ISS / ZARYA', () => {
    expect(getCategoryForName('ISS (ZARYA)')).toBe('Space Station')
    expect(getCategoryForName('ISS')).toBe('Space Station')
    expect(getCategoryForName('ZARYA')).toBe('Space Station')
  })

  it('returns Starlink satellite for Starlink names', () => {
    expect(getCategoryForName('STARLINK-1007')).toBe('Starlink satellite')
    expect(getCategoryForName('STARLINK-1234')).toBe('Starlink satellite')
  })

  it('returns Weather satellite for NOAA / METOP / NPP', () => {
    expect(getCategoryForName('NOAA 19')).toBe('Weather satellite')
    expect(getCategoryForName('METOP-B')).toBe('Weather satellite')
    expect(getCategoryForName('Suomi NPP')).toBe('Weather satellite')
  })

  it('returns Earth observation satellite for Sentinel / Landsat', () => {
    expect(getCategoryForName('SENTINEL-2A')).toBe('Earth observation satellite')
    expect(getCategoryForName('LANDSAT 9')).toBe('Earth observation satellite')
  })

  it('returns Navigation satellite for GPS / Galileo', () => {
    expect(getCategoryForName('GPS IIR-14')).toBe('Navigation satellite')
    expect(getCategoryForName('GALILEO-5')).toBe('Navigation satellite')
  })

  it('matches by NORAD ID when present in name', () => {
    expect(getCategoryForName('25544')).toBe('Space Station') // ISS
    expect(getCategoryForName('SAT 40697')).toBe('Earth observation satellite') // Sentinel-2A
  })

  it('returns Satellite for unknown names', () => {
    expect(getCategoryForName('UNKNOWN SAT')).toBe('Satellite')
    expect(getCategoryForName('')).toBe('Satellite')
  })

  it('is case-insensitive for keyword fallbacks', () => {
    expect(getCategoryForName('noaa 19')).toBe('Weather satellite')
    expect(getCategoryForName('starlink-1')).toBe('Starlink satellite')
  })
})
