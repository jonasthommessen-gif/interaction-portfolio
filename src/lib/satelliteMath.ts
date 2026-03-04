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
  /** When set, point is inside the strict (visible) bbox; used for dot and "in frame" only. */
  inStrictBBox?: boolean
}

/**
 * Compute a trail of canvas positions for a satellite.
 *
 * @param satrec       The satellite record
 * @param nowMs        Current time in milliseconds (Date.now())
 * @param trailMinutes How many minutes of history to show
 * @param stepSeconds  Sampling interval in seconds
 * @param bbox         Bounding box for inclusion and projection (e.g. expanded)
 * @param canvasW      Canvas width in pixels
 * @param canvasH      Canvas height in pixels
 * @param bboxStrict   Optional strict (visible) bbox; when set, each point gets inStrictBBox for "in frame" / dot
 * @returns Array of {x,y,inStrictBBox?} from oldest → newest (head = current position)
 */
/**
 * A segment of the trail — a contiguous run of in-bbox points.
 * The trail may be broken into multiple segments if the satellite
 * exits and re-enters the bbox during the trail window.
 */
export type TrailSegment = TrailPoint[]

function catmullRomInterpolate(
  p0: TrailPoint,
  p1: TrailPoint,
  p2: TrailPoint,
  p3: TrailPoint,
  t: number,
  tension: number,
): TrailPoint {
  // Standard Catmull–Rom, with an optional tension factor to slightly relax the curve.
  // When tension = 0, this is the classic Catmull–Rom spline. Higher tension flattens the curve.
  const t2 = t * t
  const t3 = t2 * t

  const a0 = -tension * t3 + 2 * tension * t2 - tension * t
  const a1 = (2 - tension) * t3 + (tension - 3) * t2 + 1
  const a2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t
  const a3 = tension * t3 - tension * t2

  return {
    x: a0 * p0.x + a1 * p1.x + a2 * p2.x + a3 * p3.x,
    y: a0 * p0.y + a1 * p1.y + a2 * p2.y + a3 * p3.y,
  }
}

/**
 * Smooth a raw trail using Catmull–Rom splines.
 *
 * The input may contain NaN sentinels to denote breaks between segments.
 * Those breaks are preserved in the output so the renderer can draw
 * contiguous segments without connecting across gaps.
 *
 * @param rawTrail           Original trail points (oldest → newest)
 * @param samplesPerSegment  How many samples to generate between each pair
 *                           of points within a segment (e.g. 6–10 for smoothness)
 * @param tension            Spline tension (0 = standard Catmull–Rom, ~0.5 = slightly tighter)
 */
export function smoothTrailWithSpline(
  rawTrail: TrailPoint[],
  samplesPerSegment: number,
  tension = 0.5,
): TrailPoint[] {
  if (rawTrail.length === 0 || samplesPerSegment <= 1) return rawTrail

  const result: TrailPoint[] = []

  let segment: TrailPoint[] = []

  const flushSegment = () => {
    const n = segment.length
    if (n === 0) return
    if (n === 1) {
      result.push(segment[0]!)
      return
    }
    if (n === 2) {
      result.push(segment[0]!, segment[1]!)
      return
    }

    // For n >= 3, run Catmull–Rom across the contiguous segment.
    for (let i = 0; i < n - 1; i++) {
      const p0 = i === 0 ? segment[0]! : segment[i - 1]!
      const p1 = segment[i]!
      const p2 = segment[i + 1]!
      const p3 = i + 2 < n ? segment[i + 2]! : segment[n - 1]!

      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment
        const pt = catmullRomInterpolate(p0, p1, p2, p3, t, tension)
        result.push(pt)
      }
    }

    // Ensure we include the final point of the segment exactly.
    result.push(segment[n - 1]!)
  }

  for (const p of rawTrail) {
    if (isNaN(p.x) || isNaN(p.y)) {
      // Break: flush current segment and propagate the sentinel.
      flushSegment()
      segment = []
      result.push({ x: NaN, y: NaN })
    } else {
      segment.push(p)
    }
  }

  flushSegment()

  return result
}

export function computeTrail(
  satrec: SatRec,
  nowMs: number,
  trailMinutes: number,
  stepSeconds: number,
  bbox: BBox,
  canvasW: number,
  canvasH: number,
  bboxStrict?: BBox,
): TrailPoint[] {
  const points: TrailPoint[] = []
  const totalSeconds = trailMinutes * 60
  const steps = Math.ceil(totalSeconds / stepSeconds)

  for (let i = steps; i >= 0; i--) {
    const offsetMs = i * stepSeconds * 1000
    const date = new Date(nowMs - offsetMs)
    const ll = propagateToLatLon(satrec, date)
    if (!ll) continue

    if (isInBBox(ll, bbox)) {
      const { x, y } = latLonToCanvas(ll, bbox, canvasW, canvasH)
      const inStrictBBox = bboxStrict ? isInBBox(ll, bboxStrict) : true
      points.push({ x, y, inStrictBBox })
    } else {
      points.push({ x: NaN, y: NaN })
    }
  }

  return points
}
