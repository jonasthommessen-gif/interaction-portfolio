import { useEffect, useMemo, useRef } from 'react'
import type { MotionParams } from './params'
import type { Dims, ModeContext } from './types'
import type { MotionModeId } from './types'
import type { MotionDerivedState } from '../state/types'
import { createMode } from './registry'
import { damp } from '../utils/lerp'

type Derived = MotionDerivedState

export function MotionRenderer(props: {
  enabled: boolean
  mode: MotionModeId
  params: MotionParams
  seed: number
  derived: Derived
  /** Force canvas DPR (e.g. 2 for presentation capture). */
  pixelRatio?: number
}) {
  const { enabled, mode, params, seed, derived, pixelRatio } = props
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)
  const modeRef = useRef<ReturnType<typeof createMode> | null>(null)
  const derivedRef = useRef<Derived>(derived)
  const paramsRef = useRef<MotionParams>(params)
  const smoothParamsRef = useRef<MotionParams | null>(null)
  const dimsRef = useRef<Dims | null>(null)

  const modeInstance = useMemo(() => createMode(mode), [mode])

  useEffect(() => {
    derivedRef.current = derived
  }, [derived])

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    modeRef.current?.dispose?.()
    modeRef.current = modeInstance

    let pending = false
    let lastW = 0
    let lastH = 0

    const updateDims = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        const rect = parent.getBoundingClientRect()
        const dpr =
          pixelRatio ??
          Math.max(1, Math.min(2.5, window.devicePixelRatio || 1))
        const w = Math.max(1, Math.floor(rect.width))
        const h = Math.max(1, Math.floor(rect.height))

        if (w === lastW && h === lastH && dimsRef.current) return
        lastW = w
        lastH = h

        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        dimsRef.current = { w, h, dpr }
        modeInstance.init(ctx, dimsRef.current, seed)
      })
    }

    updateDims()

    const ro = new ResizeObserver(() => updateDims())
    ro.observe(parent)

    const modeCtx: ModeContext = { now: performance.now() }

    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick)
      const dims = dimsRef.current
      if (!dims) return

      const dt = Math.min(0.05, (t - (lastRef.current || t)) / 1000)
      lastRef.current = t

      // Smooth motion-lab params only; derived values pass through (smoothed in chargingFlow mode).
      if (!smoothParamsRef.current) {
        smoothParamsRef.current = { ...paramsRef.current }
      } else {
        const p = smoothParamsRef.current
        const targetP = paramsRef.current
        ;(Object.keys(targetP) as Array<keyof MotionParams>).forEach((k) => {
          p[k] = damp(p[k], targetP[k], 10, dt)
        })
      }

      const smoothParams = smoothParamsRef.current
      if (!smoothParams) return

      modeCtx.now = t

      if (!enabled) {
        ctx.clearRect(0, 0, dims.w, dims.h)
        return
      }

      const liveDerived = derivedRef.current
      modeInstance.update(dt, smoothParams, liveDerived, modeCtx)
      modeInstance.render(ctx, dims, smoothParams, liveDerived, modeCtx)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      modeRef.current?.dispose?.()
      modeRef.current = null
      smoothParamsRef.current = null
    }
  }, [enabled, modeInstance, seed, pixelRatio])

  return <canvas ref={canvasRef} className="motionCanvas" />
}
