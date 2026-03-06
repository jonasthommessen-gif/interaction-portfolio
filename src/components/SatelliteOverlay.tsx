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
  smoothTrailWithSpline,
} from '../lib/satelliteMath'
import type { BBox, TrailPoint } from '../lib/satelliteMath'
import { SCANDINAVIA_BBOX } from '../lib/satelliteMath'
import {
  CANVAS_EXPAND_FRAC,
  DOT_RADIUS,
  ENTRY_PAD,
  HIT_RADIUS,
  ISS_EXACT_NAME,
  LERP_FACTOR,
  TRAIL_LINE_WIDTH,
  TRAIL_MAX_ALPHA,
  TRAIL_RECOMPUTE_MS,
  TRAIL_SMOOTHING_CONFIG,
  TARGET_FPS,
  canvasToClient,
  clientToCanvas,
  computeDirectionFromTrail,
  drawGlyphImage,
  drawGrid,
  expandBBox,
  getCanvasTransform,
  getSatDescription,
  getVisibleRectAndTransform,
} from '../lib/satelliteOverlayUtils'
import styles from './SatelliteOverlay.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Props for the full-screen satellite map overlay.
 * @property bbox - Map region (lat/lon bounds); defaults to Scandinavia
 * @property onFeaturedSat - Callback with featured satellite, object count, and ISS next-pass countdown
 * @property hideTracks - When true, do not draw trails or dots (e.g. for mobile)
 * @property recomputeTrailsOnResize - When true, recompute trails after canvas resize (desktop)
 */
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
  /** When true, recompute trails after canvas resize (desktop only). */
  recomputeTrailsOnResize?: boolean
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
  /** true when featured was chosen by priority (not user-picked) */
  featuredIsPriority?: boolean
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
  recomputeTrailsOnResize = false,
}: SatelliteOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const registryRef = useRef<Map<string, SatTrailData>>(new Map())
  const rafRef = useRef<number>(0)
  const hideTracksRef = useRef(hideTracks)
  hideTracksRef.current = hideTracks
  const recomputeTrailsOnResizeRef = useRef(recomputeTrailsOnResize)
  recomputeTrailsOnResizeRef.current = recomputeTrailsOnResize
  const recomputeTrailsRef = useRef<() => void>(() => {})

  const { sats, error: tleError } = useTLEData({ tleUrl, refreshHours })

  const satsRef = useRef<ParsedSatWithMeta[]>(sats)
  satsRef.current = sats

  const bboxRef = useRef(bbox)
  bboxRef.current = bbox

  const onFeaturedSatRef = useRef(onFeaturedSat)
  onFeaturedSatRef.current = onFeaturedSat

  const [pickedSatName, setPickedSatName] = useState<string | null>(null)
  const pickedSatNameRef = useRef<string | null>(null)
  pickedSatNameRef.current = pickedSatName

  const hoveredSatNameRef = useRef<string | null>(null)
  const baseGlyphRef = useRef<HTMLImageElement | null>(null)
  const issGlyphRef = useRef<HTMLImageElement | null>(null)
  /** Updated each frame for hit-testing and tooltip (expanded space <-> screen). */
  const visibleRectRef = useRef({
    visibleLeft: 0,
    visibleTop: 0,
    scaleX: 1,
    scaleY: 1,
    visibleWidth: 1,
    visibleHeight: 1,
  })

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, name: '', category: '', description: null, nearRight: false,
  })

  function recomputeTrails() {
    const canvas = canvasRef.current
    if (!canvas || satsRef.current.length === 0) return

    const W = canvas.width
    const H = canvas.height
    const nowMs = Date.now()
    const currentBbox = bboxRef.current
    const bboxExpanded = expandBBox(currentBbox, CANVAS_EXPAND_FRAC)
    const prevRegistry = registryRef.current

    const entryBbox: BBox = {
      latMin: currentBbox.latMin - ENTRY_PAD,
      latMax: currentBbox.latMax + ENTRY_PAD,
      lonMin: currentBbox.lonMin - ENTRY_PAD,
      lonMax: currentBbox.lonMax + ENTRY_PAD,
    }

    const nextRegistry = new Map<string, SatTrailData>()

    // Add new entrants
    for (const sat of satsRef.current) {
      if (nextRegistry.size >= maxSats) break
      if (prevRegistry.has(sat.name)) continue

      const ll = propagateToLatLon(sat.satrec, new Date(nowMs))
      if (!ll) continue
      if (!isInBBox(ll, entryBbox)) continue

      const rawTrail = computeTrail(sat.satrec, nowMs, trailMinutes, stepSeconds, bboxExpanded, W, H, currentBbox)
      const trail = smoothTrailWithSpline(
        rawTrail,
        TRAIL_SMOOTHING_CONFIG.samplesPerSegment,
        TRAIL_SMOOTHING_CONFIG.splineTension,
      )
      let head: TrailPoint | undefined
      for (let i = trail.length - 1; i >= 0; i--) {
        if (!isNaN(trail[i]!.x) && !isNaN(trail[i]!.y)) { head = trail[i]; break }
      }
      nextRegistry.set(sat.name, {
        name: sat.name,
        category: sat.category,
        trail,
        smoothX: head?.x ?? 0,
        smoothY: head?.y ?? 0,
      })
    }

    // Update existing + evict fully-exited
    for (const [name, existing] of prevRegistry) {
      const sat = satsRef.current.find(s => s.name === name)
      if (!sat) continue

      const rawTrail = computeTrail(sat.satrec, nowMs, trailMinutes, stepSeconds, bboxExpanded, W, H, currentBbox)
      const trail = smoothTrailWithSpline(
        rawTrail,
        TRAIL_SMOOTHING_CONFIG.samplesPerSegment,
        TRAIL_SMOOTHING_CONFIG.splineTension,
      )
      const hasValidPoint = trail.some(p => !isNaN(p.x) && !isNaN(p.y))

      if (!hasValidPoint) {
        continue
      } else {
        nextRegistry.set(name, {
          name,
          category: sat.category,
          trail,
          smoothX: existing.smoothX,
          smoothY: existing.smoothY,
        })
      }
    }

    registryRef.current = nextRegistry
  }
  recomputeTrailsRef.current = recomputeTrails

  // ── Trail recompute ───────────────────────────────────────────────────────
  useEffect(() => {
    recomputeTrails()
    const interval = setInterval(() => recomputeTrailsRef.current?.(), TRAIL_RECOMPUTE_MS)
    return () => clearInterval(interval)
  }, [sats, maxSats, trailMinutes, stepSeconds])

  // ── Load hover glyph SVGs ─────────────────────────────────────────────────
  useEffect(() => {
    const baseImg = new Image()
    baseImg.src = '/Other/Base.satelite.svg'
    baseGlyphRef.current = baseImg

    const issImg = new Image()
    issImg.src = '/Other/ISS.SVG.svg'
    issGlyphRef.current = issImg
  }, [])

  // ── Canvas resize (2x resolution for smoother trail rendering) ─────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      if (recomputeTrailsOnResizeRef.current) {
        recomputeTrailsRef.current?.()
      }
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

      const currentBbox = bboxRef.current
      const bboxExpanded = expandBBox(currentBbox, CANVAS_EXPAND_FRAC)
      const { visibleLeft, visibleTop, visibleRight, visibleBottom, scaleX, scaleY, tx, ty } =
        getVisibleRectAndTransform(currentBbox, bboxExpanded, W, H)

      visibleRectRef.current = {
        visibleLeft,
        visibleTop,
        scaleX,
        scaleY,
        visibleWidth: visibleRight - visibleLeft,
        visibleHeight: visibleBottom - visibleTop,
      }

      ctx.save()
      ctx.setTransform(scaleX, 0, 0, scaleY, tx, ty)

      // Draw grid and trails in expanded space; transform zooms to visible bbox
      drawGrid(ctx, bboxExpanded, W, H)

      if (hideTracksRef.current) {
        ctx.restore()
        return
      }

      const registry = registryRef.current
      if (registry.size === 0) return

      const hoveredName = hoveredSatNameRef.current
      const baseGlyphImg = baseGlyphRef.current
      const issGlyphImg = issGlyphRef.current

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

        // In frame (for dot and count) only when head is last point and inside visible bbox.
        const headIsValid = headIdx >= 0
        const satCurrentlyInBBox = headIdx === n - 1 && (trail[headIdx]?.inStrictBBox === true)

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
        ctx.lineWidth = TRAIL_LINE_WIDTH

        let i = 0
        while (i < drawCount - 1) {
          // Skip over any NaN sentinels
          while (i < drawCount && (isNaN(trail[i]!.x) || isNaN(trail[i]!.y))) {
            i++
          }
          if (i >= drawCount - 1) break

          const segStart = i
          let segEnd = segStart + 1
          while (
            segEnd < drawCount &&
            !isNaN(trail[segEnd]!.x) &&
            !isNaN(trail[segEnd]!.y)
          ) {
            segEnd++
          }
          const lastIdx = segEnd - 1
          if (lastIdx <= segStart) {
            i = segEnd
            continue
          }

          const tail = trail[segStart]!
          const head = trail[lastIdx]!

          const tTail = segStart / (drawCount - 1)
          const tHead = lastIdx / (drawCount - 1)
          const alphaTail = TRAIL_MAX_ALPHA * tTail * tTail
          const alphaHead = TRAIL_MAX_ALPHA * tHead * tHead

          const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y)
          gradient.addColorStop(0, `rgba(255,255,255,${alphaTail.toFixed(3)})`)
          gradient.addColorStop(1, `rgba(255,255,255,${alphaHead.toFixed(3)})`)

          ctx.beginPath()
          ctx.moveTo(tail.x, tail.y)
          for (let j = segStart + 1; j <= lastIdx; j++) {
            const p = trail[j]!
            ctx.lineTo(p.x, p.y)
          }
          ctx.strokeStyle = gradient
          ctx.stroke()

          i = segEnd
        }

        // Only draw the dot when the satellite is inside the visible (strict) bbox
        if (satCurrentlyInBBox) {
          const isHovered = hoveredName && hoveredName === data.name
          const drawX = Math.round(data.smoothX)
          const drawY = Math.round(data.smoothY)

          ctx.beginPath()
          ctx.arc(drawX, drawY, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.fill()

          if (isHovered) {
            const isSpecial = data.name === ISS_EXACT_NAME || data.category === 'Space Station'
            if (isSpecial && issGlyphImg && issGlyphImg.complete) {
              const dir = computeDirectionFromTrail(trail, headIdx)
              const angle = dir ? Math.atan2(dir.vy, dir.vx) + Math.PI / 2 : 0
              drawGlyphImage(ctx, issGlyphImg, drawX, drawY, angle, 30, 17)
            } else if (!isSpecial && baseGlyphImg && baseGlyphImg.complete) {
              drawGlyphImage(ctx, baseGlyphImg, drawX, drawY, 0, 31, 17)
            }
          }
        }
      }

      ctx.restore()
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

      // Count only satellites currently in frame; record which names are in frame for featured selection
      let objectCount = 0
      const inFrameNames = new Set<string>()
      for (const data of registry.values()) {
        const { trail } = data
        if (trail.length < 2) continue
        const n = trail.length
        let headIdx = -1
        for (let i = n - 1; i >= 0; i--) {
          const p = trail[i]!
          if (!isNaN(p.x) && !isNaN(p.y)) {
            headIdx = i
            break
          }
        }
        const inStrictBBox = trail[headIdx]?.inStrictBBox === true
        if (headIdx === n - 1 && inStrictBBox) {
          objectCount++
          inFrameNames.add(data.name)
        }
      }

      // User-picked satellite overrides priority-based selection when still in frame
      const picked = pickedSatNameRef.current && inFrameNames.has(pickedSatNameRef.current)
        ? satsRef.current.find(s => s.name === pickedSatNameRef.current)
        : null

      // Priority: Space Station > Weather > Earth Obs > Science > others (used when no pick); only consider in-frame
      const priority = ['Space Station', 'Weather', 'Earth Obs', 'Science', 'Satellite']
      let best: { sat: ParsedSatWithMeta; priority: number } | null = null

      for (const [name] of registry) {
        if (!inFrameNames.has(name)) continue
        const sat = satsRef.current.find(s => s.name === name)
        if (!sat) continue
        const p = priority.indexOf(sat.category)
        const pVal = p === -1 ? priority.length : p
        if (!best || pVal < best.priority) {
          best = { sat, priority: pVal }
        }
      }

      const chosen = picked ?? best?.sat ?? null
      let featured: FeaturedSatInfo | null = null
      if (chosen) {
        const ll = propagateToLatLon(chosen.satrec, new Date(nowMs))
        if (ll) {
          const ll2 = propagateToLatLon(chosen.satrec, new Date(nowMs + 1000))
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
            name: chosen.name,
            category: chosen.category,
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
        featuredIsPriority: chosen != null && picked == null,
      })
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [sats])

  // ── Click/tap on dot to feature that satellite ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (e: PointerEvent) => {
      const registry = registryRef.current
      const { rect, scaleX: cssScaleX, scaleY: cssScaleY } = getCanvasTransform(canvas)
      const screenX = (e.clientX - rect.left) * cssScaleX
      const screenY = (e.clientY - rect.top) * cssScaleY
      const vr = visibleRectRef.current
      const expandedX = vr.visibleLeft + screenX / vr.scaleX
      const expandedY = vr.visibleTop + screenY / vr.scaleY
      const hitRadiusCanvas = HIT_RADIUS * Math.max(cssScaleX, cssScaleY)

      let closest: { dist: number; name: string; x: number; y: number } | null = null
      for (const data of registry.values()) {
        const dx = data.smoothX - expandedX
        const dy = data.smoothY - expandedY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < hitRadiusCanvas && (!closest || dist < closest.dist)) {
          closest = { dist, name: data.name, x: data.smoothX, y: data.smoothY }
        }
      }
      if (closest) {
        setPickedSatName(closest.name)
        hoveredSatNameRef.current = closest.name
        const screenDotX = (closest.x - vr.visibleLeft) * vr.scaleX
        const screenDotY = (closest.y - vr.visibleTop) * vr.scaleY
        const clientPos = canvasToClient(canvas, screenDotX, screenDotY)
        const nearBottom = clientPos.y > window.innerHeight - 70
        const nearRight = clientPos.x > window.innerWidth - 180
        setTooltip({
          visible: true,
          x: clientPos.x,
          y: nearBottom ? clientPos.y - 32 : clientPos.y - 8,
          name: closest.name,
          category: registry.get(closest.name)?.category ?? '',
          description: getSatDescription(closest.name),
          nearRight,
        })
      } else {
        setPickedSatName(null)
        hoveredSatNameRef.current = null
        setTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev))
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    return () => canvas.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // ── Mouse hover detection ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseMove = (e: MouseEvent) => {
      const registry = registryRef.current
      const { scaleX: cssScaleX, scaleY: cssScaleY } = getCanvasTransform(canvas)
      const canvasPos = clientToCanvas(canvas, e.clientX, e.clientY)
      const vr = visibleRectRef.current
      const expandedX = vr.visibleLeft + canvasPos.x / vr.scaleX
      const expandedY = vr.visibleTop + canvasPos.y / vr.scaleY

      let closest: { dist: number; name: string; category: string; x: number; y: number } | null = null

      for (const data of registry.values()) {
        const dx = data.smoothX - expandedX
        const dy = data.smoothY - expandedY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const hitRadiusCanvas = HIT_RADIUS * Math.max(cssScaleX, cssScaleY)
        if (dist < hitRadiusCanvas && (!closest || dist < closest.dist)) {
          closest = { dist, name: data.name, category: data.category, x: data.smoothX, y: data.smoothY }
        }
      }

      if (closest) {
        hoveredSatNameRef.current = closest.name
        const screenDotX = (closest.x - vr.visibleLeft) * vr.scaleX
        const screenDotY = (closest.y - vr.visibleTop) * vr.scaleY
        const clientPos = canvasToClient(canvas, screenDotX, screenDotY)
        // Flip tooltip above dot if near bottom edge (avoid overlapping info bar)
        // Flip tooltip left if near right edge (avoid clipping)
        const nearBottom = clientPos.y > window.innerHeight - 70
        const nearRight = clientPos.x > window.innerWidth - 180
        setTooltip({
          visible: true,
          // x encodes the dot's screen x; CSS will anchor left or right based on nearRight
          x: clientPos.x,
          y: nearBottom ? clientPos.y - 32 : clientPos.y - 8,
          name: closest.name,
          category: closest.category,
          description: getSatDescription(closest.name),
          nearRight,
        })
      } else {
        hoveredSatNameRef.current = null
        setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev)
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  return (
    <>
      <div className={styles.canvasWrapper} aria-label="Satellite positions over map">
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      </div>
      {tleError && (
        <div
          className={styles.tleErrorBanner}
          role="status"
          aria-live="polite"
        >
          Satellite data temporarily unavailable
        </div>
      )}
      {tooltip.visible && (
        <div
          className={styles.tooltip}
          style={
            tooltip.nearRight
              ? { right: window.innerWidth - tooltip.x + 30, top: tooltip.y }
              : { left: tooltip.x + 30, top: tooltip.y }
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
