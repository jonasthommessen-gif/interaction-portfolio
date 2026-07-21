import { useRef } from 'react'
import type { MotionParams } from '../motion/params'
import { MotionRenderer } from '../motion/MotionRenderer'
import type { MotionModeId } from '../motion/types'
import type { DerivedChargingState } from '../state/types'
import { BoltIcon } from './BoltIcon'
import { PowerMeter } from './PowerMeter'

type ChargingSpeedCardProps = {
  label?: string
  stateTitle: string
  kw: number
  maxKw: number
  explanation?: string
  mode: MotionModeId
  motionEnabled: boolean
  motionParams: MotionParams
  seed: number
  derived: DerivedChargingState
  pixelRatio?: number
}

export function ChargingSpeedCard(props: ChargingSpeedCardProps) {
  const {
    label = 'Charging speed',
    stateTitle,
    kw,
    maxKw,
    explanation,
    mode,
    motionEnabled,
    motionParams,
    seed,
    derived,
    pixelRatio,
  } = props

  const particleFieldRef = useRef<HTMLDivElement>(null)
  const kwLabel = `${Math.round(kw)} KW`

  return (
    <div className="speedCard">
      <div className="speedCardLeft">
        <div className="speedCardCategory">
          <BoltIcon size={20} /> {label}
        </div>
        <div className="speedCardMainText">
          <div className="speedCardTitle">{stateTitle}</div>
          <div className="speedCardKw">{kwLabel}</div>
          {explanation ? (
            <div className="speedCardDescription">{explanation}</div>
          ) : null}
        </div>
      </div>

      <div ref={particleFieldRef} className="speedCardParticleField" aria-hidden="true">
        <MotionRenderer
          enabled={motionEnabled}
          mode={mode}
          params={motionParams}
          seed={seed}
          derived={derived.motionDerived}
          pixelRatio={pixelRatio}
        />
      </div>
      <div className="speedCardMeter" aria-hidden="true">
        <PowerMeter currentKw={kw} maxKw={maxKw} />
      </div>
    </div>
  )
}
