export type OrbitParams = {
  cx: number
  cy: number
  rx: number
  ry: number
  phase: number
  omega: number
}

export type OrbitPoint = { x: number; y: number }

export const ZENITH_Y_FRACTION = 0.12

/** Parametric position on the orbit circle. */
export function orbitPosition(params: OrbitParams, theta: number): OrbitPoint {
  return {
    x: params.cx + params.rx * Math.cos(theta),
    y: params.cy + params.ry * Math.sin(theta),
  }
}

export const ZENITH_THETA = -Math.PI / 2

/**
 * Zenith proximity: Gaussian bell centered at the top of the circle.
 * sigma=0.28 → zone width ≈ ±0.14 rad; at ORBIT_OMEGA the satellite
 * crosses the zone in ~2.4 s.
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
 * All satellites share the same angular speed so the orbit feels like a
 * single coherent stream, not a jittery scatter of independent objects.
 * Full orbit ≈ 52 s — slow and graceful at this setting.
 */
export const ORBIT_OMEGA = -0.12   // rad/s (negative = counter-clockwise when viewed normally)

/**
 * Phase offset places sat-0 just past the zenith at startup so the
 * section is immediately alive. Even spacing around the full hidden
 * circle keeps the visible arc from ever being crowded.
 *
 * cx = effectiveWidth × 0.46 is computed in the component using the
 * viewport-relative left-column width so the orbit reaches the left
 * viewport edge.
 */
const PHASE_OFFSET = Math.PI * 1.5 + 0.3   // ≈ 5.012 rad

export function buildOrbitParams(
  index: number,
  count: number,
  effectiveWidth: number,   // viewport-relative left-column width (container.left + container.width)
  height: number,
): OrbitParams {
  const R = Math.max(effectiveWidth * 0.65, height * 1.1)
  const cx = effectiveWidth * 0.46    // viewport coords; component converts to container coords for rendering
  const cy = R + height * ZENITH_Y_FRACTION
  const phase = (index / Math.max(count, 1)) * 2 * Math.PI + PHASE_OFFSET
  return { cx, cy, rx: R, ry: R, phase, omega: ORBIT_OMEGA }
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
