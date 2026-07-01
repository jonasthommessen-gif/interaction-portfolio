import { useState } from 'react'
import styles from './SectionCarousel.module.css'

type CarouselItem = {
  src: string
  alt?: string
  caption?: string
}

type Props = {
  items: CarouselItem[]
  loading?: 'eager' | 'lazy'
  /** `split` = 50/50 side-by-side layout */
  variant?: 'full' | 'split'
}

export function SectionCarousel({ items, loading = 'lazy', variant = 'full' }: Props) {
  const [index, setIndex] = useState(0)

  if (!items.length) return null

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(items.length - 1, i + 1))

  const current = items[index]!

  const rootClass = variant === 'split' ? `${styles.carousel} ${styles.carouselSplit}` : styles.carousel

  return (
    <div className={rootClass}>
      <div className={styles.track}>
        <div
          className={styles.slides}
          style={{ transform: `translateX(${-index * 100}%)` }}
        >
          {items.map((item, i) => (
            <div key={i} className={styles.slide}>
              <img
                src={item.src}
                alt={item.alt ?? ''}
                className={styles.img}
                loading={loading}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navArrow}
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous image"
          >
            ←
          </button>
          <div className={styles.dots}>
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.navArrow}
            onClick={next}
            disabled={index === items.length - 1}
            aria-label="Next image"
          >
            →
          </button>
        </div>
      )}

      {current.caption && (
        <p className={styles.caption}>{current.caption}</p>
      )}
    </div>
  )
}
