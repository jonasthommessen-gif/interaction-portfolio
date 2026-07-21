import { useEffect, useState, type RefObject } from 'react'

/** Design-frame size of the portrait charging speed card. */
export const SPEED_CARD_DESIGN_W = 662
export const SPEED_CARD_DESIGN_H = 241

const VIEWPORT_PADDING_PX = 16

/**
 * Scale the design card to fit the available content width.
 * Height of the viewport grows with the scaled card (section embed, not fullscreen).
 */
export function useSpeedCardShowcaseScale(viewportRef: RefObject<HTMLElement | null>) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const update = () => {
      const { width } = el.getBoundingClientRect()
      if (width <= 0) return
      const maxW = width - VIEWPORT_PADDING_PX
      const next = maxW / SPEED_CARD_DESIGN_W
      setScale(Math.max(0.35, Math.min(1, next)))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [viewportRef])

  return scale
}
