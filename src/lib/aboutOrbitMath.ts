export type OrbitParams = {
  cx: number
  cy: number
  rx: number
  ry: number
  phase: number
  omega: number
}

export type OrbitPoint = { x: number; y: number }

/** Ellipse position; θ = 0 is right, increasing θ moves clockwise (screen y-down). */
export function orbitPosition(params: OrbitParams, theta: number): OrbitPoint {
  return {
    x: params.cx + params.rx * Math.cos(theta),
    y: params.cy + params.ry * Math.sin(theta),
  }
}

/** Zenith is top of ellipse (minimum y): sin(θ) ≈ -1 → θ ≈ -π/2. */
export const ZENITH_THETA = -Math.PI / 2

export function zenithProximity(theta: number): number {
  const d = Math.abs(normalizeAngle(theta - ZENITH_THETA))
  const sigma = 0.55
  return Math.exp(-(d * d) / (2 * sigma * sigma))
}

export function zenithSpeedFactor(theta: number): number {
  const prox = zenithProximity(theta)
  return 1 - prox * 0.75
}

export function normalizeAngle(a: number): number {
  let x = a % (2 * Math.PI)
  if (x > Math.PI) x -= 2 * Math.PI
  if (x < -Math.PI) x += 2 * Math.PI
  return x
}

export function buildOrbitParams(
  index: number,
  count: number,
  width: number,
  height: number,
): OrbitParams {
  const cx = width * (0.35 + (index % 3) * 0.15)
  const cy = height * (0.45 + (index % 2) * 0.12)
  const rx = width * (0.12 + (index % 4) * 0.04)
  const ry = height * (0.1 + (index % 3) * 0.035)
  const phase = (index / Math.max(count, 1)) * 2 * Math.PI
  const omega = 0.35 + (index % 5) * 0.06
  return { cx, cy, rx, ry, phase, omega }
}
