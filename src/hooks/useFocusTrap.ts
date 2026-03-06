/**
 * useFocusTrap — trap focus inside a container and return focus on close.
 * Use for modal overlays so keyboard users can't tab out (WCAG 2.1.2, 2.4.3).
 */

import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
  )
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean
): { returnFocus: () => void } {
  const previousActiveRef = useRef<HTMLElement | null>(null)

  const returnFocus = useCallback(() => {
    const prev = previousActiveRef.current
    if (prev && typeof prev.focus === 'function') {
      prev.focus()
      previousActiveRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    previousActiveRef.current = document.activeElement as HTMLElement | null

    const focusables = getFocusables(container)
    const first = focusables[0]
    if (first) {
      first.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = getFocusables(container)
      if (focusables.length === 0) return
      const current = document.activeElement as HTMLElement
      const idx = focusables.indexOf(current)
      if (idx === -1) {
        if (e.shiftKey) focusables[focusables.length - 1]?.focus()
        else focusables[0]?.focus()
        e.preventDefault()
        return
      }
      if (e.shiftKey) {
        const next = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1]
        next?.focus()
        e.preventDefault()
      } else {
        const next = idx >= focusables.length - 1 ? focusables[0] : focusables[idx + 1]
        next?.focus()
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      returnFocus()
    }
  }, [isActive, containerRef, returnFocus])

  return { returnFocus }
}
