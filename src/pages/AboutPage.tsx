import { useEffect, useRef, useState } from 'react'
import { GrainBackground } from '../components/GrainBackground'
import { AboutGridOverlay, type AboutGridOverlayRefs } from '../components/AboutGridOverlay'
import gsap from 'gsap'
import styles from './AboutPage.module.css'

const ABOUT_VISITED_KEY = 'aboutVisited'
const TIMELINE_DURATION_MAX = 2.0

function getAboutVisited(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(ABOUT_VISITED_KEY) === 'true'
}

const initialRefs: AboutGridOverlayRefs = {
  trailLine: null,
  topLine: null,
  splitLine: null,
  midLineLeft: null,
  midLineRight: null,
  nameText: null,
  chevronLeft: null,
  chevronRight: null,
  leaderVertical: null,
  leaderHorizontal: null,
  intersectionTop: null,
  intersectionMid: null,
  trailGlyph: null,
  leftEdge: null,
  rightEdge: null,
}

export function AboutPage() {
  const [visited, setVisited] = useState(false)
  const gridRefs = useRef<AboutGridOverlayRefs>(initialRefs)
  const contentRef = useRef<HTMLDivElement>(null)
  const timelineRun = useRef(false)

  useEffect(() => {
    setVisited(getAboutVisited())
  }, [])

  useEffect(() => {
    if (visited || timelineRun.current) return
    const r = gridRefs.current
    if (!r.topLine || !r.splitLine || !r.midLineLeft || !r.midLineRight || !contentRef.current) return

    timelineRun.current = true
    const tl = gsap.timeline({
      onComplete: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(ABOUT_VISITED_KEY, 'true')
        }
        setVisited(true)
      },
    })

    const topLen = r.topLine.getTotalLength?.() ?? 2000
    const splitLen = r.splitLine.getTotalLength?.() ?? 1000
    const midRightLen = r.midLineRight.getTotalLength?.() ?? 1500
    const leftLen = r.leftEdge?.getTotalLength?.() ?? 1000
    const rightLen = r.rightEdge?.getTotalLength?.() ?? 1000
    const trailLen = r.trailLine?.getTotalLength?.() ?? 100

    /* Scale so total timeline is ≤ 2s. Last action starts ~1.65s, content fade ~0.35s => ~2s */
    const totalScale = TIMELINE_DURATION_MAX / 2.7
    const step = (n: number) => n * totalScale

    // Step 1: Trail (top right) + trail glyph
    tl.fromTo(r.trailLine, { strokeDashoffset: trailLen }, { strokeDashoffset: 0, duration: step(0.5), ease: 'power2.out' }, 0)
    tl.to(r.trailGlyph, { opacity: 1, duration: step(0.3) }, 0)

    // Step 2: Top line draw, name, chevrons, edge lines
    tl.fromTo(r.topLine, { strokeDashoffset: topLen }, { strokeDashoffset: 0, duration: step(0.6), ease: 'power2.out' }, step(0.4))
    tl.to(r.nameText, { opacity: 1, duration: step(0.25) }, step(0.45))
    tl.to(r.chevronLeft, { opacity: 1, duration: step(0.2) }, step(0.5))
    tl.to(r.chevronRight, { opacity: 1, duration: step(0.2) }, step(0.5))
    tl.fromTo(r.leftEdge, { strokeDashoffset: leftLen }, { strokeDashoffset: 0, duration: step(0.3) }, step(0.4))
    tl.fromTo(r.rightEdge, { strokeDashoffset: rightLen }, { strokeDashoffset: 0, duration: step(0.3) }, step(0.4))

    // Step 3: Split vertical + leader
    tl.fromTo(r.splitLine, { strokeDashoffset: splitLen }, { strokeDashoffset: 0, duration: step(0.7), ease: 'power2.inOut' }, step(1.0))
    tl.to(r.leaderVertical, { opacity: 1, duration: 0.01 }, step(1.0))
    tl.fromTo(r.leaderVertical, { y: 0 }, { y: splitLen, duration: step(0.7), ease: 'none' }, step(1.0))
    tl.to(r.leaderVertical, { opacity: 0, duration: 0.05 }, step(1.7))

    // Step 4: Mid line left visible, right segment + leader (leader moves right with draw head)
    tl.set(r.midLineLeft, { strokeDashoffset: 0 }, step(1.6))
    tl.fromTo(r.midLineRight, { strokeDashoffset: midRightLen }, { strokeDashoffset: 0, duration: step(0.6), ease: 'power2.out' }, step(1.6))
    tl.to(r.leaderHorizontal, { opacity: 1, duration: 0.01 }, step(1.6))
    const rightwardDist = typeof window !== 'undefined' ? window.innerWidth - 400 : 500
    tl.fromTo(r.leaderHorizontal, { x: 0 }, { x: rightwardDist, duration: step(0.6), ease: 'none' }, step(1.6))
    tl.to(r.leaderHorizontal, { opacity: 0, duration: 0.05 }, step(2.2))

    // Step 5: Intersection glyphs radial reveal (center-first scale; preserve center position)
    tl.set(r.intersectionTop, { scale: 0, opacity: 0, xPercent: -50, yPercent: -50 })
    tl.set(r.intersectionMid, { scale: 0, opacity: 0, xPercent: -50, yPercent: -50 })
    tl.to(r.intersectionTop, { opacity: 1, scale: 1, duration: step(0.25), ease: 'back.out(1.2)' }, step(2.1))
    tl.to(r.intersectionMid, { opacity: 1, scale: 1, duration: step(0.25), ease: 'back.out(1.2)' }, step(2.1))

    // Step 6: Content fade in
    tl.to(contentRef.current, { opacity: 1, duration: step(0.5), ease: 'power2.out' }, step(2.2))
    return () => {
      tl.kill()
      timelineRun.current = false
    }
  }, [visited])

  const showFinal = visited

  return (
    <main className={`${styles.page} ${styles.root}`}>
      <GrainBackground />
      <AboutGridOverlay visible={showFinal} refs={gridRefs} />

      <div
        ref={contentRef}
        className={styles.contentReveal}
        style={showFinal ? { opacity: 1 } : undefined}
      >
        <div className={styles.leftColumn}>
          <section className={`${styles.section} ${styles.sectionAbout}`}>
            <h2 className={styles.sectionAboutTitle}>Interaction & product designer</h2>
            <p className={styles.sectionAboutText}>
              I work with strategy and interaction design, focusing on making complexity
              navigable. I clarify relationships, making information frictionless to navigate
              and decisions easier to understand.
            </p>
            <p className={styles.sectionAboutLocation}>Based in Norway</p>
          </section>
          <section className={`${styles.section} ${styles.sectionSkills}`}>
            <div className={styles.skillsCloud}>
              <h2 className={styles.skillsTitle}>INTERACTION DESIGNER</h2>
              <span className={styles.skillWord} style={{ top: '8%', left: '12%' }}>UX</span>
              <span className={styles.skillWord} style={{ top: '10%', right: '15%', left: 'auto' }}>Products</span>
              <span className={styles.skillWord} style={{ top: '45%', left: '8%' }}>Systems thinking</span>
              <span className={styles.skillWord} style={{ bottom: '35%', left: '10%' }}>Prototyping</span>
              <span className={styles.skillWord} style={{ bottom: '15%', left: '35%' }}>UI</span>
              <span className={styles.skillWord} style={{ top: '50%', right: '20%', left: 'auto' }}>Motion</span>
            </div>
          </section>
        </div>

        <aside className={styles.rightPanel}>
          <div className={styles.rightImageWrap}>
            <img
              src="https://placehold.co/600x800/1a1a1a/888"
              alt=""
              className={styles.rightImage}
            />
          </div>
          <div className={styles.contactBlock}>
            <h3 className={styles.contactHeading}>How to reach me</h3>
            <div className={styles.contactRow}>
              <img src="/Other/Name.glyph.svg" alt="" className={styles.contactIcon} aria-hidden />
              <a href="https://linkedin.com/in/jonasthommessen" target="_blank" rel="noopener noreferrer">in Jonas Thommessen</a>
            </div>
            <div className={styles.contactRow}>
              <img src="/Other/Name.glyph.svg" alt="" className={styles.contactIcon} aria-hidden />
              <a href="https://instagram.com/jonasthommessen" target="_blank" rel="noopener noreferrer">@jonasthommessen</a>
            </div>
            <div className={styles.contactRow}>
              <img src="/Other/Name.glyph.svg" alt="" className={styles.contactIcon} aria-hidden />
              <a href="mailto:jonas.thommessen@icloud.com">jonas.thommessen@icloud.com</a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
