import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import styles from './AboutOverlay.module.css'

const FLOATING_KEYWORDS = ['Systems thinking', 'UX', 'UI', 'Products', 'Prototyping', 'Motion'] as const

type WordState = { x: number; y: number; vx: number; vy: number }

function initWordStates(containerWidth: number, containerHeight: number, wordWidths: number[], wordHeights: number[]): WordState[] {
  const speedMin = 20
  const speedMax = 50
  return FLOATING_KEYWORDS.map((_, i) => {
    const w = wordWidths[i] ?? 60
    const h = wordHeights[i] ?? 20
    const maxX = Math.max(0, containerWidth - w)
    const maxY = Math.max(0, containerHeight - h)
    return {
      x: maxX > 0 ? Math.random() * maxX : 0,
      y: maxY > 0 ? Math.random() * maxY : 0,
      vx: (Math.random() - 0.5) * 2 * (speedMax - speedMin) + (Math.random() > 0.5 ? speedMin : -speedMin),
      vy: (Math.random() - 0.5) * 2 * (speedMax - speedMin) + (Math.random() > 0.5 ? speedMin : -speedMin),
    }
  })
}

const IconLinkedIn = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.76 1.76 0 016.5 8.25zM19 19h-3v-4.74c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5V19h-3v-9h2.87v1.3h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19z" fill="currentColor" />
  </svg>
)

const IconInstagram = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2.16c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.05 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.05-1.65.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.05-1.27-.07-1.65-.07-4.85s0-3.58.07-4.85c.15-3.24 1.7-4.77 4.92-4.92 1.27-.05 1.65-.07 4.85-.07zM12 0C8.74 0 8.33 0 7.05.07 2.7.27.27 2.69.07 7.05 0 8.33 0 8.74 0 12s0 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 24 8.74 24 12 24s3.67 0 4.95-.07c4.36-.2 6.78-2.62 6.98-6.98.05-1.28.07-1.69.07-4.95s0-3.67-.07-4.95C23.73 2.7 21.31.27 16.95.07 15.67 0 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.37a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" fill="currentColor" />
  </svg>
)

const IconMail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
  </svg>
)

function FloatingKeywords() {
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [positions, setPositions] = useState<WordState[]>(() =>
    FLOATING_KEYWORDS.map(() => ({ x: 0, y: 0, vx: 24, vy: 18 }))
  )
  const initializedRef = useRef(false)
  const lastTimeRef = useRef<number>(0)

  const tryInit = useRef(() => {
    const container = containerRef.current
    if (!container || initializedRef.current) return
    const refs = wordRefs.current
    const { width: cw, height: ch } = container.getBoundingClientRect()
    if (cw <= 0 || ch <= 0) return
    const widths = refs.map((el) => Math.max(el?.offsetWidth ?? 0, 60))
    const heights = refs.map((el) => Math.max(el?.offsetHeight ?? 0, 20))
    setPositions(initWordStates(cw, ch, widths, heights))
    initializedRef.current = true
  })

  useLayoutEffect(() => {
    tryInit.current()
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      if (initializedRef.current) return
      tryInit.current()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = 0
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      const prev = lastTimeRef.current
      const dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0.016
      lastTimeRef.current = now

      const { width: cw, height: ch } = container.getBoundingClientRect()
      if (cw <= 0 || ch <= 0) return

      const boundsW = Math.max(cw, 1)
      const boundsH = Math.max(ch, 1)

      setPositions((prevPositions) => {
        const refs = wordRefs.current
        const next = prevPositions.map((p, i) => {
          const w = refs[i]?.offsetWidth ?? 60
          const h = refs[i]?.offsetHeight ?? 20
          let { x, y, vx, vy } = p
          x += vx * dt
          y += vy * dt
          if (x <= 0) {
            x = 0
            vx = Math.abs(vx)
          }
          if (x + w >= boundsW) {
            x = boundsW - w
            vx = -Math.abs(vx)
          }
          if (y <= 0) {
            y = 0
            vy = Math.abs(vy)
          }
          if (y + h >= boundsH) {
            y = boundsH - h
            vy = -Math.abs(vy)
          }
          return { x, y, vx, vy }
        })
        return next
      })
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div ref={containerRef} className={styles.keywordsSection1} aria-hidden>
      {FLOATING_KEYWORDS.map((word, i) => (
        <span
          key={word}
          ref={(el) => {
            wordRefs.current[i] = el
          }}
          className={styles.keywordFloat}
          style={{ left: positions[i].x, top: positions[i].y }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}

export function AboutOverlay() {
  const [portraitError, setPortraitError] = useState(false)

  return (
    <>
      {/* Left column: fixed, no scroll — bio (panel 1) visible; skills (panels 2–3) in DOM but clipped */}
      <div className={styles.leftColumn}>
        {/* Panel 1: name + bio + first simple separator (snaps so top separator aligns) */}
        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionFirstCard}`} aria-label="About">
            <header className={styles.topSeparator}>
              <div className={styles.topSeparatorLine} aria-hidden>
                <div className={styles.lineSegment} />
                <span className={styles.lineHeadGlyph}>
                  <img src="/Other/Name.glyph.svg" alt="" width="47" height="46" aria-hidden />
                </span>
                <span className={styles.nameGap} />
                <h1 className={styles.name}>JONAS THOMMESSEN</h1>
                <span className={styles.nameGap} />
                <span className={styles.lineHeadGlyph}>
                  <img src="/Other/Name.glyph.svg" alt="" width="47" height="46" aria-hidden />
                </span>
                <div className={styles.lineSegment} />
              </div>
            </header>
            <div className={styles.separatorGapBlock}>
              <div className={styles.textBlockCentered}>
                <h2 className={styles.title}>Interaction & product designer</h2>
                <div className={styles.bioText}>
                  <p>
                    I work across strategy and interaction design, focusing on making complexity navigable.
                  </p>
                  <p>
                    Interfaces don&apos;t exist on their own. They&apos;re shaped by context, limitations, and the way people make sense of what they see. My practice is about clarifying those relationships, making information frictionless to navigate and decisions easier to understand.
                  </p>
                  <p>Based in Norway</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Panel 2: first simple separator at TOP so one scroll brings this line to top */}
        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionSnapStart} ${styles.sectionPanel2}`} aria-label="About continued">
            <div className={styles.separatorLineWrapper} aria-hidden>
              <div className={styles.separatorLine} />
            </div>
            <div className={`${styles.separatorGapCell} ${styles.separatorGapCellBetweenSeparators}`} aria-hidden />
            <FloatingKeywords />
          </section>
        </div>

        {/* Panel 3: Section 2 (skills + connectors) */}
        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionSnapStart}`} aria-label="Skills">
            <div className={styles.separatorLineWrapper} aria-hidden>
              <div className={styles.separatorLine} />
            </div>
            <div className={styles.separatorGapCell}>
              <div className={styles.keywordsSection2}>
                <div className={styles.connectorsSvg} aria-hidden>
                  <svg viewBox="0 0 400 200" preserveAspectRatio="none">
                    <line x1="80" y1="160" x2="200" y2="100" stroke="var(--about-lineColor)" strokeWidth="1" />
                    <line x1="320" y1="80" x2="220" y2="110" stroke="var(--about-lineColor)" strokeWidth="1" />
                    <line x1="140" y1="180" x2="200" y2="120" stroke="var(--about-lineColor)" strokeWidth="1" />
                  </svg>
                </div>
                <span className={styles.keywordUx}>UX</span>
                <span className={styles.keywordProducts}>Products</span>
                <span className={styles.keywordSystems}>Systems thinking</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Right panel: fixed, image block + contact block */}
      <aside className={styles.rightPanel}>
        <div className={styles.imageBlock}>
          <div className={styles.imageWrap}>
            {!portraitError && (
              <img
                src="/images/placeholders/IMG_7240.JPG"
                alt=""
                className={styles.portraitImage}
                onError={() => setPortraitError(true)}
              />
            )}
          </div>
        </div>
        <div className={styles.contactBlock}>
          <h2 className={styles.contactHeading}>How to reach me</h2>
          <ul className={styles.contactList}>
            <li>
              <a href="https://www.linkedin.com/in/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                <span className={styles.contactIcon}><IconLinkedIn /></span>
                Jonas Thommessen
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                <span className={styles.contactIcon}><IconInstagram /></span>
                @jonasthommessen
              </a>
            </li>
            <li>
              <a href="mailto:jonas.thommessen@icloud.com" className={styles.contactLink}>
                <span className={styles.contactIcon}><IconMail /></span>
                jonas.thommessen@icloud.com
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </>
  )
}
