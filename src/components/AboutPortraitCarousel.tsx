import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './AboutPortraitCarousel.module.css'

export type PortraitSlide = {
  src: string
  alt?: string
}

const INTERVAL_MS = 4000

type Props = {
  portraits: PortraitSlide[]
  enableSwipe?: boolean
}

export function AboutPortraitCarousel({ portraits, enableSwipe = false }: Props) {
  const [index, setIndex] = useState(0)
  const [fadeKey, setFadeKey] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const pauseUntil = useRef(0)

  const count = portraits.length
  const current = count > 0 ? portraits[index % count]! : null

  const goTo = useCallback(
    (next: number) => {
      if (count <= 1) return
      const wrapped = ((next % count) + count) % count
      setIndex(wrapped)
      setFadeKey((k) => k + 1)
    },
    [count],
  )

  useEffect(() => {
    if (count <= 1) return
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return
      setIndex((i) => {
        setFadeKey((k) => k + 1)
        return (i + 1) % count
      })
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [count])

  const onTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!enableSwipe || touchStartX.current == null) return
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) return
    const dx = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    pauseUntil.current = Date.now() + INTERVAL_MS
    if (dx < 0) goTo(index + 1)
    else goTo(index - 1)
  }

  if (!current) return null

  return (
    <div
      className={styles.wrap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        key={`${current.src}-${fadeKey}`}
        src={current.src}
        alt={current.alt ?? ''}
        className={styles.image}
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
    </div>
  )
}
