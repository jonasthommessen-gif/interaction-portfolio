import type { MotionParams } from './params'
import type { MotionMode, MotionModeId } from './types'
import type { MotionDerivedState } from '../state/types'
import { chargingFlowMode } from './modes/chargingFlow'

export function createMode(_id: MotionModeId): MotionMode<MotionParams, MotionDerivedState> {
  return chargingFlowMode()
}
