export type MotionModeId = 'chargingFlow'

export const MOTION_MODES: Array<{ id: MotionModeId; label: string }> = [
  { id: 'chargingFlow', label: 'Charging flow' },
]

export type Dims = { w: number; h: number; dpr: number }

export type ModeContext = {
  now: number
}

export type MotionMode<Params, Derived> = {
  id: MotionModeId
  init: (ctx: CanvasRenderingContext2D, dims: Dims, seed: number) => void
  update: (dt: number, params: Params, derived: Derived, modeCtx: ModeContext) => void
  render: (
    ctx: CanvasRenderingContext2D,
    dims: Dims,
    params: Params,
    derived: Derived,
    modeCtx: ModeContext,
  ) => void
  dispose?: () => void
}
