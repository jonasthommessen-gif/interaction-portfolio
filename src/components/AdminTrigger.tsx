import { useRef, useCallback } from 'react'

const HOVER_HOLD_MS = 10_000
const TAP_COUNT_TARGET = 10
const TAP_WINDOW_MS = 2000

type AdminTriggerProps = {
  children: React.ReactNode
  onTrigger: () => void
  /** Optional class for the wrapper (e.g. to match existing layout). No hover/active styles. */
  className?: string
}

/**
 * Hidden admin trigger: on touch (mobile) 10 taps within 2s fires onTrigger; on desktop 10s hover
 * fires onTrigger. No visual feedback (no cursor change, no hover effect).
 */
export function AdminTrigger({ children, onTrigger, className }: AdminTriggerProps) {
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tapCountRef = useRef(0)
  const tapWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownRef = useRef(false)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    pointerDownRef.current = false
  }, [])

  const startHoverTimer = useCallback(() => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null
      pointerDownRef.current = false
      onTrigger()
    }, HOVER_HOLD_MS)
  }, [onTrigger, clearHoverTimer])

  const clearTapWindow = useCallback(() => {
    if (tapWindowRef.current) {
      clearTimeout(tapWindowRef.current)
      tapWindowRef.current = null
    }
    tapCountRef.current = 0
  }, [])

  const handleTouchTap = useCallback(() => {
    if (tapWindowRef.current) {
      clearTimeout(tapWindowRef.current)
      tapWindowRef.current = null
    }
    tapCountRef.current += 1
    if (tapCountRef.current >= TAP_COUNT_TARGET) {
      tapCountRef.current = 0
      onTrigger()
      return
    }
    tapWindowRef.current = setTimeout(clearTapWindow, TAP_WINDOW_MS)
  }, [onTrigger, clearTapWindow])

  return (
    <span
      className={className}
      role="presentation"
      aria-hidden
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') {
          pointerDownRef.current = true
          handleTouchTap()
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'touch') {
          pointerDownRef.current = false
        } else {
          clearHoverTimer()
        }
      }}
      onPointerLeave={clearHoverTimer}
      onPointerCancel={clearHoverTimer}
      onMouseEnter={() => {
        if (!pointerDownRef.current) startHoverTimer()
      }}
      onMouseLeave={clearHoverTimer}
      style={{ cursor: 'inherit', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {children}
    </span>
  )
}
