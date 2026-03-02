/**
 * satelliteMath.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrappers around satellite.js for:
 *   1. Parsing TLE text into SatRec objects
 *   2. Propagating a SatRec to a lat/lon at a given Date
 *   3. Equirectangular projection of lat/lon into canvas pixel coordinates
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js'
import type { SatRec } from 'satellite.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedSat {
  name: string
  satrec: SatRec
}

export interface LatLon {
  lat: number // degrees
  lon: number // degrees
  altKm: number
}

export interface BBox {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

/** Scandinavia / N. Europe (desktop default) */
export const SCANDINAVIA_BBOX: BBox = {
  latMin: 50.0,
  latMax: 80.0,
  lonMin: -15.0,
  lonMax: 45.0,
}

/** Norway only (mobile home frame) */
export const NORWAY_BBOX: BBox = {
  latMin: 57.9,
  latMax: 71.2,
  lonMin: 4.6,
  lonMax: 31.1,
}

// ─── TLE Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a raw TLE text block (3-line or 2-line format) into an array of
 * ParsedSat objects. Lines that fail to parse are silently skipped.
 */
export function parseTLEText(raw: string): ParsedSat[] {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const results: ParsedSat[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // 3-line format: name, TLE1, TLE2
    if (!line.startsWith('1 ') && !line.startsWith('2 ')) {
      const name = line
      const tle1 = lines[i + 1] ?? ''
      const tle2 = lines[i + 2] ?? ''
      if (tle1.startsWith('1 ') && tle2.startsWith('2 ')) {
        try {
          const satrec = twoline2satrec(tle1, tle2)
          results.push({ name, satrec })
        } catch {
          // skip malformed
        }
        i += 3
        continue
      }
    }

    // 2-line format: TLE1, TLE2 (no name line)
    if (line.startsWith('1 ')) {
      const tle1 = line
      const tle2 = lines[i + 1] ?? ''
      if (tle2.startsWith('2 ')) {
        try {
          const satrec = twoline2satrec(tle1, tle2)
          results.push({ name: `NORAD-${satrec.satnum}`, satrec })
        } catch {
          // skip malformed
        }
        i += 2
        continue
      }
    }

    i++
  }

  return results
}

// ─── Propagation ─────────────────────────────────────────────────────────────

/**
 * Propagate a satellite to a given Date and return its geodetic position.
 * Returns null if propagation fails (e.g. decayed orbit).
 */
export function propagateToLatLon(satrec: SatRec, date: Date): LatLon | null {
  const result = propagate(satrec, date)

  if (!result || !result.position || typeof result.position === 'boolean') {
    return null
  }

  const posEci = result.position
  const gmst = gstime(date)
  const geo = eciToGeodetic(posEci, gmst)

  return {
    lat: degreesLat(geo.latitude),
    lon: degreesLong(geo.longitude),
    altKm: geo.height,
  }
}

// ─── Bounding Box Filter ──────────────────────────────────────────────────────

export function isInBBox(ll: LatLon, bbox: BBox): boolean {
  return (
    ll.lat >= bbox.latMin &&
    ll.lat <= bbox.latMax &&
    ll.lon >= bbox.lonMin &&
    ll.lon <= bbox.lonMax
  )
}

// ─── Equirectangular Projection ───────────────────────────────────────────────

/**
 * Map a lat/lon within a bounding box to canvas pixel coordinates.
 *
 * The bbox is mapped to the full canvas (0,0) → (canvasW, canvasH).
 * Latitude increases upward on the globe, so we invert the y axis.
 */
export function latLonToCanvas(
  ll: LatLon,
  bbox: BBox,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const lonRange = bbox.lonMax - bbox.lonMin
  const latRange = bbox.latMax - bbox.latMin

  const x = ((ll.lon - bbox.lonMin) / lonRange) * canvasW
  // Invert y: higher lat → lower pixel y
  const y = ((bbox.latMax - ll.lat) / latRange) * canvasH

  return { x, y }
}

// ─── Trail Computation ────────────────────────────────────────────────────────

export interface TrailPoint {
  x: number
  y: number
}

/**
 * Compute a trail of canvas positions for a satellite.
 *
 * @param satrec       The satellite record
 * @param nowMs        Current time in milliseconds (Date.now())
 * @param trailMinutes How many minutes of history to show
 * @param stepSeconds  Sampling interval in seconds
 * @param bbox         Scandinavia bounding box
 * @param canvasW      Canvas width in pixels
 * @param canvasH      Canvas height in pixels
 * @returns Array of {x,y} points from oldest → newest (head = current position)
 */
/**
 * A segment of the trail — a contiguous run of in-bbox points.
 * The trail may be broken into multiple segments if the satellite
 * exits and re-enters the bbox during the trail window.
 */
export type TrailSegment = TrailPoint[]

export function computeTrail(
  satrec: SatRec,
  nowMs: number,
  trailMinutes: number,
  stepSeconds: number,
  bbox: BBox,
  canvasW: number,
  canvasH: number,
): TrailPoint[] {
  const points: TrailPoint[] = []
  const totalSeconds = trailMinutes * 60
  const steps = Math.ceil(totalSeconds / stepSeconds)

  for (let i = steps; i >= 0; i--) {
    const offsetMs = i * stepSeconds * 1000
    const date = new Date(nowMs - offsetMs)
    const ll = propagateToLatLon(satrec, date)
    if (!ll) continue

    // Only include trail points that are inside the bbox.
    // Points outside are represented as null sentinels so the draw
    // loop can break the polyline rather than drawing across the gap.
    if (isInBBox(ll, bbox)) {
      const { x, y } = latLonToCanvas(ll, bbox, canvasW, canvasH)
      points.push({ x, y })
    } else {
      // Sentinel: NaN coordinates signal a break in the trail
      points.push({ x: NaN, y: NaN })
    }
  }

  return points
}
