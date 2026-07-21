import { useEffect, useRef, useState } from 'react'

type PowerMeterProps = {
  currentKw: number
  maxKw: number
}

const SNAP_KW = 20

export function PowerMeter({ currentKw, maxKw }: PowerMeterProps) {
  const safeMax = Math.max(1, maxKw)
  const value = Math.max(0, Math.min(safeMax, currentKw))
  const ratio = Math.max(0, Math.min(1, value / safeMax))

  const snapRatio = Math.max(0, Math.min(0.49, SNAP_KW / safeMax))
  const atTop = ratio >= 1 - snapRatio
  const atBottom = ratio <= snapRatio

  // Position marker relative to the rendered rail element (not the full container),
  // so layout overrides (e.g. fixed/centered rail height) keep marker aligned.
  const meterRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const triangleRef = useRef<HTMLSpanElement>(null)
  const railMetricsRef = useRef({ railTop: 0, railHeight: 0, meterHeight: 0 })
  const [, bumpLayout] = useState(0)

  const computedBottomPx =
    railMetricsRef.current.railHeight > 0
      ? (() => {
          const { railTop, railHeight, meterHeight } = railMetricsRef.current
          const railBottomOffset = meterHeight - (railTop + railHeight)
          const clampedRatio = atTop ? 1 : atBottom ? 0 : ratio
          const triangleHalf = (triangleRef.current?.offsetHeight ?? 0) / 2
          // Align the triangle's center (its "tip" Y) to the rail position.
          return railBottomOffset + clampedRatio * railHeight - triangleHalf
        })()
      : undefined

  const markerStyle =
    computedBottomPx != null ? { bottom: `${computedBottomPx}px` } : { bottom: `${ratio * 100}%` }

  useEffect(() => {
    const meterEl = meterRef.current
    const railEl = railRef.current
    if (!meterEl || !railEl) return

    const update = () => {
      // Use offset* metrics for positioning, because getBoundingClientRect()
      // is affected by ancestor transforms (e.g. preview scaling).
      const meterOffsetHeight = meterEl.offsetHeight
      const railOffsetTop = railEl.offsetTop
      const railOffsetHeight = railEl.offsetHeight

      railMetricsRef.current = {
        railTop: railOffsetTop,
        railHeight: railOffsetHeight,
        meterHeight: meterOffsetHeight,
      }
      bumpLayout((x) => x + 1)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(meterEl)
    ro.observe(railEl)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      className="powerMeter"
      role="img"
      aria-label={`${Math.round(value)} of ${Math.round(safeMax)} kW`}
      ref={meterRef}
    >
      <div className="powerMeterRail" ref={railRef} />

      {!atTop ? (
        <div className="powerMeterLabel powerMeterLabel--top">{Math.round(safeMax)}</div>
      ) : null}

      {!atBottom ? <div className="powerMeterLabel powerMeterLabel--bottom">0</div> : null}

      <div className="powerMeterMarker" style={markerStyle} ref={markerRef}>
        <span className="powerMeterTriangle" aria-hidden="true" ref={triangleRef} />
      </div>
    </div>
  )
}
