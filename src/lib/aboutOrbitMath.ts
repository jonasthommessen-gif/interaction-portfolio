export type OrbitParams = {
  cx: number
  cy: number
  rx: number
  ry: number
  phase: number
  omega: number
}

export type OrbitPoint = { x: number; y: number }

/**
 * The zenith fraction controls where the mathematical top of the circle sits
 * inside the visible section. 0.12 = 12% from the section top.
 */
export const ZENITH_Y_FRACTION = 0.12

/** Parametric circle/ellipse position. θ = 0 → rightmost, increasing θ → clockwise. */
export function orbitPosition(params: OrbitParams, theta: number): OrbitPoint {
  return {
    x: params.cx + params.rx * Math.cos(theta),
    y: params.cy + params.ry * Math.sin(theta),
  }
}

/** Zenith is the top of the circle: sin(θ) = −1, i.e. θ = −π/2. */
export const ZENITH_THETA = -Math.PI / 2

/**
 * Proximity to zenith. sigma = 0.28 gives a tight window so that with
 * 6 satellites spaced 2π/6 ≈ 1.047 rad apart, only one exceeds the
 * auto-reveal threshold (0.88) at any moment.
 */
export function zenithProximity(theta: number): number {
  const d = Math.abs(normalizeAngle(theta - ZENITH_THETA))
  const sigma = 0.28
  return Math.exp(-(d * d) / (2 * sigma * sigma))
}

/** Speed multiplier near zenith: slows to ~35% at peak. */
export function zenithSpeedFactor(theta: number): number {
  return 1 - zenithProximity(theta) * 0.65
}

export function normalizeAngle(a: number): number {
  let x = a % (2 * Math.PI)
  if (x > Math.PI) x -= 2 * Math.PI
  if (x < -Math.PI) x += 2 * Math.PI
  return x
}

/**
 * True circle orbit centered below the section.
 *
 * Geometry:
 *   R  = max(w * 0.65, h * 1.1)   — scales with both axes
 *   cy = R + h * ZENITH_Y_FRACTION — places the mathematical zenith inside section
 *
 * For w=600, h=300: R=390, cy=426, zenith y=36 (12% from top) ✓
 * At x=section edge: satellite appears at ~59% section height ✓
 *
 * Full-circle phase distribution (2π spacing): section overflow:hidden clips
 * the below-section portion. Satellites genuinely orbit the full circle;
 * only the top arc is ever visible.
 *
 * Negative omega → counterclockwise in screen coords → right-to-left across top arc.
 */
// 54° offset — breaks the 4π/3 / 5π/3 mirror symmetry that caused clustering
const PHASE_OFFSET = Math.PI * 0.3

export function buildOrbitParams(
  index: number,
  count: number,
  width: number,
  height: number,
): OrbitParams {
  const R = Math.max(width * 0.65, height * 1.1)
  const cx = width / 2
  const cy = R + height * ZENITH_Y_FRACTION
  const phase = (index / Math.max(count, 1)) * 2 * Math.PI + PHASE_OFFSET
  const omega = -(0.20 + (index % 3) * 0.06)  // 0.20 / 0.26 / 0.32 — wider spread prevents re-clustering
  return { cx, cy, rx: R, ry: R, phase, omega }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
