import { useEffect, useRef } from 'react'

export type UseIdleTimerOptions = {
  timeoutMs: number
  onIdle: () => void
  enabled?: boolean
}

/**
 * Calls `onIdle()` once after `timeoutMs` of no user activity.
 *
 * Once idle has fired, it will not fire again until activity happens (i.e. once
 * per idle period).
 */
export function useIdleTimer({ timeoutMs, onIdle, enabled = true }: UseIdleTimerOptions) {
  const onIdleRef = useRef(onIdle)
  const timeoutIdRef = useRef<number | null>(null)
  const hasFiredRef = useRef(false)

  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    if (!enabled) return

    const clear = () => {
      if (timeoutIdRef.current !== null) {
        window.clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
    }

    const arm = () => {
      clear()
      timeoutIdRef.current = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') return
        if (hasFiredRef.current) return
        hasFiredRef.current = true
        onIdleRef.current()
      }, timeoutMs)
    }

    const markActivity = () => {
      if (document.visibilityState === 'hidden') return
      hasFiredRef.current = false
      arm()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clear()
        return
      }
      // Treat returning to the tab as “activity” and restart the timer.
      markActivity()
    }

    const opts: AddEventListenerOptions = { passive: true }

    window.addEventListener('pointermove', markActivity, opts)
    window.addEventListener('pointerdown', markActivity, opts)
    window.addEventListener('keydown', markActivity)
    window.addEventListener('wheel', markActivity, opts)
    window.addEventListener('touchstart', markActivity, opts)
    window.addEventListener('touchmove', markActivity, opts)
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Start counting from mount.
    arm()

    return () => {
      clear()
      window.removeEventListener('pointermove', markActivity)
      window.removeEventListener('pointerdown', markActivity)
      window.removeEventListener('keydown', markActivity)
      window.removeEventListener('wheel', markActivity)
      window.removeEventListener('touchstart', markActivity)
      window.removeEventListener('touchmove', markActivity)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, timeoutMs])
}
