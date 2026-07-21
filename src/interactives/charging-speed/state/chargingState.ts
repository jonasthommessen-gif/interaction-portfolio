import { COST } from './constants'
import type {
  ChargingInputs,
  ChargingStateTitle,
  DerivedChargingState,
  MotionDerivedState,
} from './types'

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

const TAPER_START_PCT = 78
const TAPER_END_PCT = 82

const MAX_SPEED_DELTA_KW = 5
const VERY_FAST_DELTA_KW = 100

const STATE_COPY: Record<ChargingStateTitle, string> = {
  'Warming up': `Your battery is cold!
Reducing the power until battery reaches normal temperature.`,
  'Almost there': `Almost there - slowing down
speed before reaching 80%.`,
  Shared: 'The charging power is shared between you and another vehicle.',
  Reduced: 'Low capacity - lots of people are charging their vehicles right now!',
  Peak: 'Charging at maximum speed',
  Fast: 'Charging speed is high and steady.',
  'Very fast': 'You’re charging at a very high speed.',
  'Maximum speed': 'Charging at the highest speed available',
  Optimal: 'The charging power is shared between you and another vehicle.',
  Slow: 'Charging at maximum speed',
}

function resolveStateTitle(
  inputs: ChargingInputs,
  powerRatio: number,
  taper: number,
): ChargingStateTitle {
  const cold = inputs.temperature === 'cold'
  const shared = inputs.powerSharing === 'shared'
  const taperActive = taper > 0.35 || inputs.batteryPct >= TAPER_START_PCT

  if (cold && powerRatio < 0.55) return 'Slow'
  if (taperActive) return 'Slow'
  if (shared) return 'Optimal'
  if (powerRatio < 0.35) return 'Reduced'

  const safeMaxKw = Math.max(1, inputs.chargerMaxKw ?? 400)
  const deltaKw = safeMaxKw - inputs.kw
  if (deltaKw <= MAX_SPEED_DELTA_KW) return 'Maximum speed'
  if (deltaKw <= VERY_FAST_DELTA_KW) return 'Very fast'
  return 'Fast'
}

function explanationFor(
  inputs: ChargingInputs,
  title: ChargingStateTitle,
): { explanation?: string } {
  if (inputs.explanationMode === 'manual') {
    const manual = inputs.manualExplanation?.trim()
    return manual ? { explanation: manual } : {}
  }

  if (title === 'Optimal') {
    return { explanation: 'The charging power is shared between you and another vehicle.' }
  }

  if (title === 'Slow') {
    if (inputs.temperature === 'cold') {
      return {
        explanation: `Your battery is cold!
Reducing the power until battery reaches normal temperature.`,
      }
    }

    if (inputs.batteryPct >= TAPER_START_PCT) {
      return {
        explanation: `Almost there - slowing down
speed before reaching 80%.`,
      }
    }

    return {
      explanation: `Not quite ideal right now.
We’re adjusting the power to keep charging stable.`,
    }
  }

  if (title === 'Fast') {
    return { explanation: 'Charging speed is high and steady.' }
  }

  if (title === 'Very fast') {
    return { explanation: 'You’re charging at a very high speed.' }
  }

  if (title === 'Maximum speed') {
    return { explanation: 'Charging at the highest speed available' }
  }

  if (title === 'Reduced') {
    return { explanation: 'Low capacity - lots of people are charging their vehicles right now!' }
  }

  if (title === 'Shared') {
    return { explanation: 'The charging power is shared between you and another vehicle.' }
  }

  return { explanation: STATE_COPY[title] }
}

const MIN_MOTION_BRIGHTNESS = 0.32
const MIN_MOTION_DENSITY = 0.14
const MIN_MOTION_SPEED = 0.12

const IDLE_MOTION = {
  intensity: 0.025,
  density: 0.045,
  brightness: 0.18,
  speed: 0.035,
  pulse: 0.035,
} as const

function derivedMotion(
  inputs: ChargingInputs,
  powerRatio: number,
  taper: number,
): MotionDerivedState {
  const cold = inputs.temperature === 'cold' ? 1 : 0
  const shared = inputs.powerSharing === 'shared' ? 1 : 0
  const constrained = clamp01(0.55 * cold + 0.45 * shared)
  const fragmented = shared ? 0.55 : 0.0

  const energy = clamp01(Math.pow(powerRatio, 0.75))
  const densityEnergy = clamp01(Math.pow(powerRatio, 0.48))
  const taperFactor = 1 - 0.35 * taper
  const conditionPenalty = 0.2 * constrained

  const activeIntensity = clamp01(energy * taperFactor * (1 - conditionPenalty))
  const activeDensity = clamp01(
    lerp(MIN_MOTION_DENSITY, 1.0, densityEnergy) * (1 - 0.1 * constrained),
  )
  const activeBrightness = clamp01(lerp(MIN_MOTION_BRIGHTNESS, 1.0, activeIntensity))
  const activeSpeed = clamp01(
    lerp(MIN_MOTION_SPEED, 1.0, activeIntensity) * (1 - 0.12 * constrained),
  )
  const activePulse = clamp01(lerp(0.2, 0.9, activeIntensity) * (1 - 0.15 * constrained))
  const activeUpward = clamp01(lerp(0.15, 1.0, activeIntensity))

  let idleT = 1
  if (inputs.kw < 1 || powerRatio < 0.003) {
    idleT = 0
  } else {
    idleT = smoothstep(1, 8, inputs.kw)
  }

  const intensity = lerp(IDLE_MOTION.intensity, activeIntensity, idleT)
  const density = lerp(IDLE_MOTION.density, activeDensity, idleT)
  const brightness = lerp(IDLE_MOTION.brightness, activeBrightness, idleT)
  const speed = lerp(IDLE_MOTION.speed, activeSpeed, idleT)
  const pulse = lerp(IDLE_MOTION.pulse, activePulse, idleT)
  const upward = lerp(0.08, activeUpward, idleT)

  return {
    intensity,
    taper,
    constrained,
    fragmented,
    brightness,
    density,
    speed,
    upward,
    pulse,
  }
}

function formatClockTime(date: Date): string {
  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function deriveChargingState(inputs: ChargingInputs): DerivedChargingState {
  const safeMaxKw = Math.max(1, inputs.chargerMaxKw ?? 400)
  const powerRatio = clamp01(inputs.kw / safeMaxKw)
  const taper = smoothstep(TAPER_START_PCT, TAPER_END_PCT, inputs.batteryPct)

  const title = resolveStateTitle(inputs, powerRatio, taper)
  const { explanation } = explanationFor(inputs, title)
  const motionDerived = derivedMotion(inputs, powerRatio, taper)

  const minutes = Math.max(
    1,
    Math.round(lerp(55, 14, powerRatio) + lerp(0, 18, taper)),
  )

  const targetPct = inputs.chargingTargetPct ?? 100
  const arrival = new Date(Date.now() + minutes * 60_000)
  const estimatedTime =
    inputs.batteryPct >= targetPct ? 'Done' : `~${minutes} minutes`
  const estimatedTimeHelp =
    inputs.batteryPct >= targetPct
      ? 'Fully charged'
      : `Charged to ${Math.round(targetPct)}% at ${formatClockTime(arrival)}`

  const cost =
    COST.nokPerKwh *
    COST.sessionKwhEstimate *
    clamp01(lerp(0.65, 1.15, motionDerived.intensity))
  const estimatedCost = `${cost.toFixed(2).replace('.', ',')} NOK`
  const estimatedCostHelp = `${COST.nokPerKwh.toFixed(2).replace('.', ',')} per kWh`

  const summary = `${title} / ${inputs.temperature} / ${inputs.powerSharing} / ${Math.round(
    inputs.kw,
  )} kW`

  return {
    stateTitle: title,
    explanation,
    intensity: motionDerived.intensity,
    taperFactor: 1 - taper,
    summary,
    estimatedTime,
    estimatedTimeHelp,
    estimatedCost,
    estimatedCostHelp,
    motionDerived,
  }
}
