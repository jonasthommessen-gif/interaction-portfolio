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
  /** `split` = smaller carousel for 50/50 side-by-side layouts */
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
      <div className={styles.carouselRow}>
        {index > 0 ? (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowOutside}`}
            onClick={prev}
            aria-label="Previous image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <span className={styles.arrowSpacer} aria-hidden="true" />
        )}

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

        {index < items.length - 1 ? (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowOutside}`}
            onClick={next}
            aria-label="Next image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span className={styles.arrowSpacer} aria-hidden="true" />
        )}
      </div>

      {items.length > 1 && (
        <div className={styles.dots}>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {current.caption && (
        <p className={styles.caption}>{current.caption}</p>
      )}
    </div>
  )
}
