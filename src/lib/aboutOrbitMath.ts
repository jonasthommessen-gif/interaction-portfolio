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
 * Proximity to zenith. sigma = 0.28 keeps the reveal window tight enough
 * that only one satellite can exceed ZENITH_THRESHOLD (0.88) at a time.
 */
export function zenithProximity(theta: number): number {
  const d = Math.abs(normalizeAngle(theta - ZENITH_THETA))
  const sigma = 0.28
  return Math.exp(-(d * d) / (2 * sigma * sigma))
}

export function normalizeAngle(a: number): number {
  let x = a % (2 * Math.PI)
  if (x > Math.PI) x -= 2 * Math.PI
  if (x < -Math.PI) x += 2 * Math.PI
  return x
}

/**
 * Circle orbit centered below the section so only the upper arc is visible.
 *
 * cx = 0.46 × width  — slight left shift keeps the orbit away from the right
 *                       contact column without touching layout or section widths.
 *
 * PHASE_OFFSET = 3π/2 + 0.3  — places sat 0 just past zenith at startup so the
 *                               animation is immediately alive, and distributes the
 *                               remaining satellites around the hidden circle with
 *                               no initial zenith crowding.
 *
 * omega 0.20 / 0.26 / 0.32  — wide speed spread prevents re-clustering over time.
 *
 * Speed is constant (no zenith slow-down). The zenith hold (ZENITH_HOLD_MS) in
 * the component provides the dwell; variable speed was causing satellites to bunch.
 */
const PHASE_OFFSET = Math.PI * 1.5 + 0.3   // ≈ 5.012 rad

export function buildOrbitParams(
  index: number,
  count: number,
  width: number,
  height: number,
): OrbitParams {
  const R = Math.max(width * 0.65, height * 1.1)
  const cx = width * 0.46
  const cy = R + height * ZENITH_Y_FRACTION
  const phase = (index / Math.max(count, 1)) * 2 * Math.PI + PHASE_OFFSET
  const omega = -(0.20 + (index % 3) * 0.06)   // 0.20 / 0.26 / 0.32
  return { cx, cy, rx: R, ry: R, phase, omega }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
