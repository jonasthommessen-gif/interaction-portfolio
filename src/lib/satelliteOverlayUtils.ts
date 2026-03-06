/**
 * Pure helpers and drawing for SatelliteOverlay.
 * Extracted for testability and smaller component file.
 */

import type { BBox, TrailPoint } from './satelliteMath'

// ─── Config (used by overlay and drawing) ────────────────────────────────────

export const ENTRY_PAD = 8
export const CANVAS_EXPAND_FRAC = 0.1
export const TARGET_FPS = 30
export const TRAIL_RECOMPUTE_MS = 500
export const DOT_RADIUS = 4
export const TRAIL_MAX_ALPHA = 0.72
export const TRAIL_LINE_WIDTH = 1.7
export const HIT_RADIUS = 14
export const LERP_FACTOR = 0.28

export const TRAIL_SMOOTHING_CONFIG = {
  splineTension: 0.5,
  samplesPerSegment: 8,
} as const

export const GRID_LAT_STEP = 10
export const GRID_LON_STEP = 15
export const GRID_LINE_ALPHA = 0.045
export const GRID_LABEL_ALPHA = 0.18
export const GRID_LABEL_FONT = '8px "IBM Plex Sans", system-ui, sans-serif'
export const GRID_LABEL_EDGE_MARGIN = 28

export const ISS_EXACT_NAME = 'ISS (ZARYA)'

// ─── BBox / transform ─────────────────────────────────────────────────────────

/** Expand bbox by a fraction of its size on each side. */
export function expandBBox(bbox: BBox, frac: number): BBox {
  const latRange = bbox.latMax - bbox.latMin
  const lonRange = bbox.lonMax - bbox.lonMin
  const padLat = latRange * frac
  const padLon = lonRange * frac
  return {
    latMin: bbox.latMin - padLat,
    latMax: bbox.latMax + padLat,
    lonMin: bbox.lonMin - padLon,
    lonMax: bbox.lonMax + padLon,
  }
}

/** Visible rect (strict bbox in expanded pixel space) and transform to map it to (0,0,W,H). */
export function getVisibleRectAndTransform(
  bbox: BBox,
  bboxExpanded: BBox,
  W: number,
  H: number,
): {
  visibleLeft: number
  visibleTop: number
  visibleRight: number
  visibleBottom: number
  scaleX: number
  scaleY: number
  tx: number
  ty: number
} {
  const lonRangeExp = bboxExpanded.lonMax - bboxExpanded.lonMin
  const latRangeExp = bboxExpanded.latMax - bboxExpanded.latMin
  const visibleLeft = ((bbox.lonMin - bboxExpanded.lonMin) / lonRangeExp) * W
  const visibleRight = ((bbox.lonMax - bboxExpanded.lonMin) / lonRangeExp) * W
  const visibleTop = ((bboxExpanded.latMax - bbox.latMax) / latRangeExp) * H
  const visibleBottom = ((bboxExpanded.latMax - bbox.latMin) / latRangeExp) * H
  const visibleWidth = visibleRight - visibleLeft
  const visibleHeight = visibleBottom - visibleTop
  const scaleX = W / visibleWidth
  const scaleY = H / visibleHeight
  const tx = -visibleLeft * scaleX
  const ty = -visibleTop * scaleY
  return { visibleLeft, visibleTop, visibleRight, visibleBottom, scaleX, scaleY, tx, ty }
}

// ─── Canvas coordinate helpers ────────────────────────────────────────────────

export function getCanvasTransform(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { rect, scaleX, scaleY }
}

export function clientToCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const { rect, scaleX, scaleY } = getCanvasTransform(canvas)
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

export function canvasToClient(
  canvas: HTMLCanvasElement,
  canvasX: number,
  canvasY: number,
): { x: number; y: number } {
  const { rect, scaleX, scaleY } = getCanvasTransform(canvas)
  return {
    x: rect.left + canvasX / scaleX,
    y: rect.top + canvasY / scaleY,
  }
}

// ─── Trail / tooltip helpers ────────────────────────────────────────────────

export function computeDirectionFromTrail(
  trail: TrailPoint[],
  headIdx: number,
): { vx: number; vy: number } | null {
  for (let k = 1; k <= 5; k++) {
    const idx = headIdx - k
    if (idx < 0) break
    const tail = trail[idx]!
    const head = trail[headIdx]!
    if (isNaN(tail.x) || isNaN(tail.y) || isNaN(head.x) || isNaN(head.y)) continue
    const vx = head.x - tail.x
    const vy = head.y - tail.y
    const len = Math.hypot(vx, vy)
    if (len === 0) continue
    return { vx: vx / len, vy: vy / len }
  }
  return null
}

/**
 * Returns a short human-readable description for a satellite name (tooltip third line).
 */
export function getSatDescription(name: string): string | null {
  const n = name.toUpperCase()
  if (name === ISS_EXACT_NAME) return 'INTERNATIONAL SPACE STATION'
  if (/^ISS\s+(DEB|OBJECT|R\/B)/i.test(name)) return 'DEBRIS / RELEASED FROM ISS'
  if (/^CSS\b/i.test(name) || n.includes('TIANHE') || n.includes('WENTIAN') || n.includes('MENGTIAN') || n.includes('SHENZHOU') || n.includes('TIANGONG')) return 'CHINESE SPACE STATION'
  if (n.startsWith('STARLINK')) return 'SPACEX STARLINK CONSTELLATION'
  if (n.startsWith('ONEWEB')) return 'ONEWEB BROADBAND CONSTELLATION'
  if (/\bDEB\b|\bDEBRIS\b|\bR\/B\b|\bROCKET BODY\b/.test(n)) return 'TRACKED DEBRIS OBJECT'
  return null
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export function drawGlyphImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  rotationRad: number,
  centerXInImage: number,
  centerYInImage: number,
): void {
  const scale = DOT_RADIUS / 2
  ctx.save()
  ctx.translate(x, y)
  if (rotationRad !== 0) ctx.rotate(rotationRad)
  ctx.scale(scale, scale)
  ctx.drawImage(img, -centerXInImage, -centerYInImage)
  ctx.restore()
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  bbox: BBox,
  W: number,
  H: number,
): void {
  ctx.save()

  const latStart = Math.ceil(bbox.latMin / GRID_LAT_STEP) * GRID_LAT_STEP
  for (let lat = latStart; lat <= bbox.latMax; lat += GRID_LAT_STEP) {
    const y = ((bbox.latMax - lat) / (bbox.latMax - bbox.latMin)) * H
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.strokeStyle = `rgba(255,255,255,${GRID_LINE_ALPHA})`
    ctx.lineWidth = 0.5
    ctx.stroke()
    if (y > GRID_LABEL_EDGE_MARGIN && y < H - GRID_LABEL_EDGE_MARGIN) {
      ctx.fillStyle = `rgba(255,255,255,${GRID_LABEL_ALPHA})`
      ctx.font = GRID_LABEL_FONT
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${lat}°N`, 6, y - 2)
    }
  }

  const lonStart = Math.ceil(bbox.lonMin / GRID_LON_STEP) * GRID_LON_STEP
  for (let lon = lonStart; lon <= bbox.lonMax; lon += GRID_LON_STEP) {
    const x = ((lon - bbox.lonMin) / (bbox.lonMax - bbox.lonMin)) * W
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.strokeStyle = `rgba(255,255,255,${GRID_LINE_ALPHA})`
    ctx.lineWidth = 0.5
    ctx.stroke()
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
