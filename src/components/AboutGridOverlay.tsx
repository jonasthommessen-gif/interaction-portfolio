import styles from './AboutGridOverlay.module.css'

/**
 * Layer B: Fixed grid overlay — 6 hairlines + 2 intersection glyphs.
 * Uses CSS variables from About page: --about-splitX, --about-topLineY, --about-midLineY, --about-lineColor.
 * pointer-events: none so it never blocks scrolling or clicks.
 */
export function AboutGridOverlay() {
  return (
    <div className={styles.overlay} aria-hidden>
      {/* Border hairlines */}
      <div className={styles.lineTopBorder} />
      <div className={styles.lineLeftBorder} />
      <div className={styles.lineRightBorder} />
      {/* Content hairlines (data attrs for scroll-distance measurement) */}
      <div className={styles.lineTopContent} data-about-line="top" />
      <div className={styles.lineVerticalSplit} />
      <div className={styles.lineMid} data-about-line="mid" />
      {/* Intersection glyphs — centered on (splitX, topLineY) and (splitX, midLineY) */}
      <div className={styles.glyphTop} aria-hidden>
        <img src="/Other/Intsection.glyph.svg" alt="" width="47" height="46" />
      </div>
      <div className={styles.glyphMid} aria-hidden>
        <img src="/Other/Intsection.glyph.svg" alt="" width="47" height="46" />
      </div>
    </div>
  )
}
