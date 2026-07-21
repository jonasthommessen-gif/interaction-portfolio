import { useMemo, useRef, useState } from 'react'
import { ChargingSpeedCard } from '../components/ChargingSpeedCard'
import { DEFAULT_MOTION_PARAMS } from '../motion/params'
import { deriveChargingState } from '../state/chargingState'
import type { ChargingInputs } from '../state/types'
import {
  SPEED_CARD_DESIGN_H,
  SPEED_CARD_DESIGN_W,
  useSpeedCardShowcaseScale,
} from './useSpeedCardShowcaseScale'
import '../charging-speed.css'

const SHOWCASE_SEED = 42
const CHARGER_MAX_KW = 400

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export type SpeedCardShowcaseProps = {
  /** Initial charging power in kW. */
  initialKw?: number
  /** Optional root class for portfolio embedding. */
  className?: string
}

/**
 * Charging speed card with a kW slider underneath.
 * Portfolio-embedded (section-width), not a full-viewport takeover.
 */
export function SpeedCardShowcase(props: SpeedCardShowcaseProps) {
  const { initialKw = 120, className } = props
  const [kw, setKw] = useState(() => clamp(initialKw, 0, CHARGER_MAX_KW))
  const viewportRef = useRef<HTMLDivElement>(null)
  const scale = useSpeedCardShowcaseScale(viewportRef)

  const inputs = useMemo<ChargingInputs>(
    () => ({
      kw,
      batteryPct: 42,
      temperature: 'normal',
      powerSharing: 'none',
      explanationMode: 'auto',
      chargerMaxKw: CHARGER_MAX_KW,
      chargingTargetPct: 80,
    }),
    [kw],
  )

  const derived = useMemo(() => deriveChargingState(inputs), [inputs])
  const scaledW = SPEED_CARD_DESIGN_W * scale
  const scaledH = SPEED_CARD_DESIGN_H * scale

  return (
    <div
      className={className ? `speedCardShowcase ${className}` : 'speedCardShowcase'}
      data-showcase="speed-card"
    >
      <div ref={viewportRef} className="speedCardShowcaseViewport">
        <div
          className="speedCardShowcaseCardWrap"
          style={{ width: scaledW, height: scaledH }}
        >
          <div
            className="speedCardShowcaseStage chargingScreen--portrait chargingScreen--largePortrait"
            style={{
              width: SPEED_CARD_DESIGN_W,
              height: SPEED_CARD_DESIGN_H,
              transform: `scale(${scale})`,
            }}
          >
            <ChargingSpeedCard
              stateTitle={derived.stateTitle}
              kw={kw}
              maxKw={CHARGER_MAX_KW}
              explanation={derived.explanation}
              mode="chargingFlow"
              motionEnabled
              motionParams={DEFAULT_MOTION_PARAMS}
              seed={SHOWCASE_SEED}
              derived={derived}
            />
          </div>
        </div>
      </div>

      <div className="speedCardShowcaseControls">
        <div className="speedCardShowcaseSlider cpRow" style={{ width: scaledW }}>
          <div className="cpRowLabel">
            <span>Charging speed</span>
            <span>{Math.round(kw)} kW</span>
          </div>
          <input
            type="range"
            min={0}
            max={CHARGER_MAX_KW}
            value={kw}
            aria-label="Charging speed in kilowatts"
            onChange={(event) => setKw(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
