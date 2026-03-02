/**
 * SatelliteOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A fixed, full-screen canvas overlay that renders:
 *   1. A subtle lat/lon grid (equirectangular, matching the satellite projection)
 *   2. Real-time satellite tracks (dot + fading trail)
 *   3. Hover tooltip (IBM Plex Sans)
 *
 * Exposes via onFeaturedSat callback:
 *   - Featured satellite info (lat/lon/alt/vel)
 *   - Object count (satellites currently in frame)
 *   - ISS next pass countdown (minutes until ISS enters bbox)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react'
import { useTLEData } from '../hooks/useTLEData'
import type { ParsedSatWithMeta } from '../hooks/useTLEData'
import {
  propagateToLatLon,
  isInBBox,
  computeTrail,
} from '../lib/satelliteMath'
import type { BBox, TrailPoint } from '../lib/satelliteMath'
import { SCANDINAVIA_BBOX } from '../lib/satelliteMath'
import styles from './SatelliteOverlay.module.css'

// ─── Config ───────────────────────────────────────────────────────────────────

const ENTRY_PAD = 8
const TARGET_FPS = 30
const TRAIL_RECOMPUTE_MS = 500
const DOT_RADIUS = 2
const TRAIL_MAX_ALPHA = 0.72
const TRAIL_LINE_WIDTH = 0.85
const HIT_RADIUS = 14
const LERP_FACTOR = 0.12

// Grid config
const GRID_LAT_STEP = 10   // degrees between horizontal lines
const GRID_LON_STEP = 15   // degrees between vertical lines
const GRID_LINE_ALPHA = 0.045
const GRID_LABEL_ALPHA = 0.18
const GRID_LABEL_FONT = '8px "IBM Plex Sans", system-ui, sans-serif'
// Minimum pixel distance from canvas edge before we skip a label
const GRID_LABEL_EDGE_MARGIN = 28

// ISS exact name (ZARYA = first ISS module, the catalog name for the whole station)
const ISS_EXACT_NAME = 'ISS (ZARYA)'
/**
 * Returns a short human-readable description for a satellite name,
 * to be shown as a third line in the hover tooltip.
 *
 * CelesTrak naming conventions:
 *   ISS (ZARYA)          — the actual station
 *   ISS DEB (OBJECT A)   — debris with "DEB" in name
 *   ISS OBJECT XZ        — debris without "DEB" (older catalog style)
 *   CSS (TIANHE-1)       — Chinese Space Station modules
 */
function getSatDescription(name: string): string | null {
  const n = name.toUpperCase()
  if (name === ISS_EXACT_NAME) return 'INTERNATIONAL SPACE STATION'
  // ISS debris: "ISS DEB ...", "ISS OBJECT ...", "ISS R/B ..."
  if (/^ISS\s+(DEB|OBJECT|R\/B)/i.test(name)) return 'DEBRIS / RELEASED FROM ISS'
  // Chinese Space Station modules
  if (/^CSS\b/i.test(name) || n.includes('TIANHE') || n.includes('WENTIAN') || n.includes('MENGTIAN') || n.includes('SHENZHOU') || n.includes('TIANGONG')) return 'CHINESE SPACE STATION'
  if (n.startsWith('STARLINK')) return 'SPACEX STARLINK CONSTELLATION'
  if (n.startsWith('ONEWEB')) return 'ONEWEB BROADBAND CONSTELLATION'
  // Generic debris / rocket bodies
  if (/\bDEB\b|\bDEBRIS\b|\bR\/B\b|\bROCKET BODY\b/.test(n)) return 'TRACKED DEBRIS OBJECT'
  return null
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SatelliteOverlayProps {
  bbox?: BBox
  trailMinutes?: number
  stepSeconds?: number
  maxSats?: number
  refreshHours?: number
  tleUrl?: string
  onFeaturedSat?: (info: OverlayInfo | null) => void
  /** When true, do not draw trails or dots (e.g. for mobile) */
  hideTracks?: boolean
}

export interface FeaturedSatInfo {
  name: string
  category: string
  lat: number
  lon: number
  altKm: number
  velKms: number
}

export interface OverlayInfo {
  featured: FeaturedSatInfo | null
  objectCount: number
  issNextPassMin: number | null | undefined  // null = ISS currently in frame, undefined = ISS not found/unknown
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface SatTrailData {
  name: string
  category: string
  trail: TrailPoint[]
  smoothX: number
  smoothY: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  name: string
  category: string
  description: string | null
  nearRight: boolean
}

// ─── Grid drawing ─────────────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  bbox: BBox,
  W: number,
  H: number,
) {
  ctx.save()

  // Horizontal lines (latitude)
  const latStart = Math.ceil(bbox.latMin / GRID_LAT_STEP) * GRID_LAT_STEP
  for (let lat = latStart; lat <= bbox.latMax; lat += GRID_LAT_STEP) {
    const y = ((bbox.latMax - lat) / (bbox.latMax - bbox.latMin)) * H
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.strokeStyle = `rgba(255,255,255,${GRID_LINE_ALPHA})`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Skip label if too close to top or bottom edge
    if (y > GRID_LABEL_EDGE_MARGIN && y < H - GRID_LABEL_EDGE_MARGIN) {
      ctx.fillStyle = `rgba(255,255,255,${GRID_LABEL_ALPHA})`
      ctx.font = GRID_LABEL_FONT
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${lat}°N`, 6, y - 2)
    }
  }

  // Vertical lines (longitude)
  const lonStart = Math.ceil(bbox.lonMin / GRID_LON_STEP) * GRID_LON_STEP
  for (let lon = lonStart; lon <= bbox.lonMax; lon += GRID_LON_STEP) {
    const x = ((lon - bbox.lonMin) / (bbox.lonMax - bbox.lonMin)) * W
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.strokeStyle = `rgba(255,255,255,${GRID_LINE_ALPHA})`
    ctx.lineWidth = 0.5
    ctx.stroke()

    // Skip label if too close to left or right edge
    if (x > GRID_LABEL_EDGE_MARGIN && x < W - GRID_LABEL_EDGE_MARGIN) {
      const label = lon === 0 ? '0°' : lon > 0 ? `${lon}°E` : `${Math.abs(lon)}°W`
      ctx.fillStyle = `rgba(255,255,255,${GRID_LABEL_ALPHA})`
      ctx.font = GRID_LABEL_FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(label, x, H - 14)
    }
  }

  ctx.restore()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SatelliteOverlay({
  bbox = SCANDINAVIA_BBOX,
  trailMinutes = 10,
  stepSeconds = 30,
  maxSats = 50,
  refreshHours = 6,
  tleUrl,
  onFeaturedSat,
  hideTracks = false,
}: SatelliteOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const registryRef = useRef<Map<string, SatTrailData>>(new Map())
  const rafRef = useRef<number>(0)
  const hideTracksRef = useRef(hideTracks)
  hideTracksRef.current = hideTracks

  const { sats } = useTLEData({ tleUrl, refreshHours })

  const satsRef = useRef<ParsedSatWithMeta[]>(sats)
  satsRef.current = sats

  const bboxRef = useRef(bbox)
  bboxRef.current = bbox

  const onFeaturedSatRef = useRef(onFeaturedSat)
  onFeaturedSatRef.current = onFeaturedSat

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, name: '', category: '', description: null, nearRight: false,
  })

  // ── Trail recompute ───────────────────────────────────────────────────────
  useEffect(() => {
    const recompute = () => {
      const canvas = canvasRef.current
      if (!canvas || satsRef.current.length === 0) return

      const W = canvas.width
      const H = canvas.height
      const nowMs = Date.now()
      const currentBbox = bboxRef.current

      const entryBbox: BBox = {
        latMin: currentBbox.latMin - ENTRY_PAD,
        latMax: currentBbox.latMax + ENTRY_PAD,
        lonMin: currentBbox.lonMin - ENTRY_PAD,
        lonMax: currentBbox.lonMax + ENTRY_PAD,
      }

      const registry = registryRef.current

      // Add new entrants
      for (const sat of satsRef.current) {
        if (registry.size >= maxSats) break
        if (registry.has(sat.name)) continue

        const ll = propagateToLatLon(sat.satrec, new Date(nowMs))
        if (!ll) continue
        if (!isInBBox(ll, entryBbox)) continue

        const trail = computeTrail(sat.satrec, nowMs, trailMinutes, stepSeconds, currentBbox, W, H)
        let head: TrailPoint | undefined
        for (let i = trail.length - 1; i >= 0; i--) {
          if (!isNaN(trail[i]!.x) && !isNaN(trail[i]!.y)) { head = trail[i]; break }
        }
        registry.set(sat.name, {
          name: sat.name,
          category: sat.category,
          trail,
          smoothX: head?.x ?? 0,
          smoothY: head?.y ?? 0,
        })
      }

      // Update existing + evict fully-exited
      for (const [name, existing] of registry) {
        const sat = satsRef.current.find(s => s.name === name)
        if (!sat) { registry.delete(name); continue }

        const trail = computeTrail(sat.satrec, nowMs, trailMinutes, stepSeconds, currentBbox, W, H)
        const hasValidPoint = trail.some(p => !isNaN(p.x) && !isNaN(p.y))

        if (!hasValidPoint) {
          registry.delete(name)
        } else {
          registry.set(name, {
            name,
            category: sat.category,
            trail,
            smoothX: existing.smoothX,
            smoothY: existing.smoothY,
          })
        }
      }
    }

    recompute()
    const interval = setInterval(recompute, TRAIL_RECOMPUTE_MS)
    return () => clearInterval(interval)
  }, [sats, maxSats, trailMinutes, stepSeconds])

  // ── Canvas resize (2x resolution for smoother trail rendering) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Render loop with lerp ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const frameInterval = 1000 / TARGET_FPS
    let lastRender = 0

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw)
      if (now - lastRender < frameInterval) return
      lastRender = now

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Draw grid first (behind satellites)
      drawGrid(ctx, bboxRef.current, W, H)

      if (hideTracksRef.current) return

      const registry = registryRef.current
      if (registry.size === 0) return

      for (const data of registry.values()) {
        const { trail } = data
        if (trail.length < 2) continue
        const n = trail.length

        // Find the index of the last valid (in-bbox) point — this is the true head.
        // The trail is oldest→newest; points after the satellite exits bbox are NaN.
        let headIdx = -1
        for (let i = n - 1; i >= 0; i--) {
          const p = trail[i]!
          if (!isNaN(p.x) && !isNaN(p.y)) { headIdx = i; break }
        }

        // If the head is the very last point, the satellite is currently in bbox.
        // If headIdx < n-1, the satellite has already exited — the tail of the trail
        // array is NaN sentinels. We only draw up to headIdx.
        const headIsValid = headIdx >= 0
        const satCurrentlyInBBox = headIdx === n - 1

        if (!headIsValid) continue

        const headPoint = trail[headIdx]!

        // Only lerp toward the head when the satellite is currently in bbox.
        // When it has exited, freeze the dot at the last valid position.
        if (satCurrentlyInBBox) {
          data.smoothX += (headPoint.x - data.smoothX) * LERP_FACTOR
          data.smoothY += (headPoint.y - data.smoothY) * LERP_FACTOR
        }
        // (If not in bbox, smoothX/Y stays frozen; registry will evict soon)

        // Draw trail — only up to headIdx (skip NaN exit-tail)
        const drawCount = headIdx + 1
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 0; i < drawCount - 1; i++) {
          const p0 = trail[i]!
          const p1 = trail[i + 1]!
          if (isNaN(p0.x) || isNaN(p0.y) || isNaN(p1.x) || isNaN(p1.y)) continue

          const t = (i + 1) / (drawCount - 1)
          const alpha = TRAIL_MAX_ALPHA * t * t
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
          ctx.lineWidth = TRAIL_LINE_WIDTH
          ctx.stroke()
        }

        // Only draw the dot when the satellite is currently inside the bbox
        if (satCurrentlyInBBox) {
          ctx.beginPath()
          ctx.arc(data.smoothX, data.smoothY, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.fill()
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Featured satellite + object count + ISS next pass ─────────────────────
  useEffect(() => {
    if (sats.length === 0) return

    const update = () => {
      const registry = registryRef.current
      const nowMs = Date.now()
      const currentBbox = bboxRef.current

      const objectCount = registry.size

      // Priority: Space Station > Weather > Earth Obs > Science > others
      const priority = ['Space Station', 'Weather', 'Earth Obs', 'Science', 'Satellite']
      let best: { sat: ParsedSatWithMeta; priority: number } | null = null

      for (const [name] of registry) {
        const sat = satsRef.current.find(s => s.name === name)
        if (!sat) continue
        const p = priority.indexOf(sat.category)
        const pVal = p === -1 ? priority.length : p
        if (!best || pVal < best.priority) {
          best = { sat, priority: pVal }
        }
      }

      // If a satellite is in the registry it's in frame — use its current position
      // directly without re-checking isInBBox (avoids false "no objects" at edges)
      let featured: FeaturedSatInfo | null = null
      if (best) {
        const ll = propagateToLatLon(best.sat.satrec, new Date(nowMs))
        if (ll) {
          const ll2 = propagateToLatLon(best.sat.satrec, new Date(nowMs + 1000))
          let velKms = 7.5
          if (ll2) {
            const R = 6371 + ll.altKm
            const dLat = (ll2.lat - ll.lat) * Math.PI / 180
            const dLon = (ll2.lon - ll.lon) * Math.PI / 180
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(ll.lat * Math.PI / 180) * Math.cos(ll2.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            velKms = Math.round(dist * 10) / 10
          }
          featured = {
            name: best.sat.name,
            category: best.sat.category,
            lat: Math.round(ll.lat * 10) / 10,
            lon: Math.round(ll.lon * 10) / 10,
            altKm: Math.round(ll.altKm),
            velKms,
          }
        }
      }

      // ISS next pass: scan forward up to 120 minutes — only the real ISS (ZARYA)
      const issSat = satsRef.current.find(s => s.name === ISS_EXACT_NAME)
      // undefined = ISS not found in TLE data (unknown state)
      // null      = ISS confirmed currently in frame
      // number    = minutes until ISS next enters frame
      let issNextPassMin: number | null | undefined = undefined

      if (issSat) {
        const issNow = propagateToLatLon(issSat.satrec, new Date(nowMs))
        if (issNow && isInBBox(issNow, currentBbox)) {
          // ISS is currently in frame
          issNextPassMin = null
        } else {
          // Scan forward in 1-minute steps up to 24 hours
          for (let m = 1; m <= 1440; m++) {
            const ll = propagateToLatLon(issSat.satrec, new Date(nowMs + m * 60000))
            if (ll && isInBBox(ll, currentBbox)) {
              issNextPassMin = m
              break
            }
          }
        }
      }

      onFeaturedSatRef.current?.({
        featured,
        objectCount,
        issNextPassMin,
      })
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [sats])

  // ── Mouse hover detection ─────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const registry = registryRef.current
      const mx = e.clientX
      const my = e.clientY

      let closest: { dist: number; name: string; category: string; x: number; y: number } | null = null

      for (const data of registry.values()) {
        const dx = data.smoothX - mx
        const dy = data.smoothY - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < HIT_RADIUS && (!closest || dist < closest.dist)) {
          closest = { dist, name: data.name, category: data.category, x: data.smoothX, y: data.smoothY }
        }
      }

      if (closest) {
        // Flip tooltip above dot if near bottom edge (avoid overlapping info bar)
        // Flip tooltip left if near right edge (avoid clipping)
        const nearBottom = closest.y > window.innerHeight - 70
        const nearRight = closest.x > window.innerWidth - 180
        setTooltip({
          visible: true,
          // x encodes the dot's screen x; CSS will anchor left or right based on nearRight
          x: closest.x,
          y: nearBottom ? closest.y - 32 : closest.y - 8,
          name: closest.name,
          category: closest.category,
          description: getSatDescription(closest.name),
          nearRight,
        })
      } else {
        setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev)
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {tooltip.visible && (
        <div
          className={styles.tooltip}
          style={
            tooltip.nearRight
              ? { right: window.innerWidth - tooltip.x + 10, top: tooltip.y }
              : { left: tooltip.x + 10, top: tooltip.y }
          }
          aria-hidden="true"
        >
          <span className={styles.tooltipName}>{tooltip.name}</span>
          <span className={styles.tooltipCategory}>{tooltip.category}</span>
          {tooltip.description && (
            <span className={styles.tooltipDescription}>{tooltip.description}</span>
          )}
        </div>
      )}
    </>
  )
}
