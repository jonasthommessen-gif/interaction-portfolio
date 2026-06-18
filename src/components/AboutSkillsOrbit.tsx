import { useEffect, useRef, useState } from 'react'
import type { AboutSkill } from '../lib/aboutContent'
import {
  buildOrbitParams,
  easeInOutCubic,
  orbitPosition,
  zenithProximity,
} from '../lib/aboutOrbitMath'
import styles from './AboutSkillsOrbit.module.css'

const SAT_SRC = '/Other/Base.satelite.svg'
const ZENITH_THRESHOLD = 0.88
const TRANSITION_MS = 2000

type Phase = 'orbit' | 'to-reveal' | 'revealed' | 'to-orbit'

/** Mutable per-satellite state — lives in a ref, never triggers React renders. */
type SatState = {
  theta: number
  omega: number
  currentX: number    // viewport coords
  currentY: number
  snapX: number
  snapY: number
  targetX: number
  targetY: number
  revX: number
  revY: number
}

/**
 * Returns satellite positions in VIEWPORT coords (x measured from leftColumn x=0),
 * using effectiveW (= w + xOffset = full leftColumn usable width) so the grid is
 * centred within the visible section rather than within the narrower orbitRoot box.
 */
function buildRevealedLayout(count: number, effectiveW: number) {
  const cols = count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const padX = effectiveW * 0.06
  const padY = 16                                   // small fixed top/bottom margin
  const cellW = (effectiveW - padX * 2) / cols
  const cellH = 80                                  // fixed 80 px row spacing
  return Array.from({ length: count }, (_, i) => ({
    // Satellite sits at 25% into the cell — leaves 75% room for label to the right.
    x: padX + (i % cols) * cellW + cellW * 0.25,
    y: padY + Math.floor(i / cols) * cellH + cellH * 0.5,
  }))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type Props = { skills: AboutSkill[] }

export function AboutSkillsOrbit({ skills }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // sizeRef is updated synchronously in the ResizeObserver callback so the
  // RAF loop always reads the latest dimensions without needing to restart.
  const sizeRef = useRef({ w: 0, h: 0, xOffset: 0 })

  // size state is kept only to trigger the init effect when dimensions first
  // become available or when skill count changes. The RAF never closes over it.
  const [size, setSize] = useState({ w: 0, h: 0, xOffset: 0 })

  const [revealedUI, setRevealedUI] = useState(false)

  // Mutable animation state — never touches React state
  const statesRef = useRef<SatState[]>([])
  const phaseRef = useRef<Phase>('orbit')
  const transitionStartRef = useRef(0)
  const hoverIndexRef = useRef<number | null>(null)
  const activeZenithRef = useRef<number>(-1)

  // Direct DOM refs — positions and opacities written without React renders
  const satDivRefs = useRef<(HTMLDivElement | null)[]>([])
  const labelSpanRefs = useRef<(HTMLSpanElement | null)[]>([])

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const labels = skills.map((s) => s.label)

  // ── Observe container size + viewport offset ───────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const next = { w: rect.width, h: rect.height, xOffset: rect.left }
      // Update ref immediately so the running RAF loop sees the new values
      // without needing to restart.
      sizeRef.current = next
      setSize(next)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Initialise satellite states ────────────────────────────────────────────
  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return
    const { w, h, xOffset } = size
    const effectiveW = w + xOffset
    // buildRevealedLayout now returns viewport coords (from x=0 of leftColumn)
    const layout = buildRevealedLayout(labels.length, effectiveW)
    statesRef.current = labels.map((_, i) => {
      const params = buildOrbitParams(i, labels.length, effectiveW, h)
      const pos = orbitPosition(params, params.phase)
      return {
        theta: params.phase,
        omega: params.omega,
        currentX: pos.x,
        currentY: pos.y,
        snapX: pos.x,
        snapY: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        revX: layout[i]!.x,   // already viewport coords — no xOffset addition
        revY: layout[i]!.y,
      }
    })
    activeZenithRef.current = -1
    phaseRef.current = 'orbit'
    setRevealedUI(false)

    // Set initial transforms immediately so satellites never flash at origin.
    for (let i = 0; i < statesRef.current.length; i++) {
      const s = statesRef.current[i]!
      const renderX = s.currentX - xOffset
      const div = satDivRefs.current[i]
      if (div) div.style.transform = `translate(${renderX}px, ${s.currentY}px)`
    }

    // Ensure all labels start hidden
    for (const span of labelSpanRefs.current) {
      if (span) span.style.opacity = '0'
    }
  }, [size.w, size.h, size.xOffset, labels.length])

  // ── RAF loop ───────────────────────────────────────────────────────────────
  // Depends only on labels.length — never restarts due to resize.
  // Reads sizeRef.current every frame for always-current dimensions.
  useEffect(() => {
    if (reducedMotion.current) {
      // Reduced motion: static constellation, labels hidden until hover
      const { w, h, xOffset } = sizeRef.current
      if (w <= 0 || h <= 0) return
      for (let i = 0; i < statesRef.current.length; i++) {
        const s = statesRef.current[i]!
        const renderX = s.revX - xOffset    // viewport → container coords
        const div = satDivRefs.current[i]
        if (div) div.style.transform = `translate(${renderX}px, ${s.revY}px)`
      }
      return
    }

    let raf = 0
    let last = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)

      // Read current size every frame — no closure, no restart needed.
      const { w, h, xOffset } = sizeRef.current
      if (w <= 0 || h <= 0) return

      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016
      last = now

      const effectiveW = w + xOffset
      const params0 = buildOrbitParams(0, 1, effectiveW, h)
      const oCx = params0.cx       // viewport coords
      const oCy = params0.cy
      const oR = params0.rx

      const states = statesRef.current
      const phase = phaseRef.current
      const hi = hoverIndexRef.current
      const az = activeZenithRef

      if (phase === 'orbit') {
        // Zone-based zenith release
        if (az.current >= 0 && zenithProximity(states[az.current]!.theta) < ZENITH_THRESHOLD) {
          az.current = -1
        }
        // Claim slot for the deepest-in-zone satellite
        if (az.current < 0) {
          let maxProx = 0
          let candidate = -1
          for (let i = 0; i < states.length; i++) {
            const p = zenithProximity(states[i]!.theta)
            if (p > maxProx) { maxProx = p; candidate = i }
          }
          if (candidate >= 0 && maxProx > ZENITH_THRESHOLD) az.current = candidate
        }

        for (let i = 0; i < states.length; i++) {
          const s = states[i]!
          s.theta += s.omega * dt
          s.currentX = oCx + oR * Math.cos(s.theta)
          s.currentY = oCy + oR * Math.sin(s.theta)

          const renderX = s.currentX - xOffset
          const div = satDivRefs.current[i]
          if (div) div.style.transform = `translate(${renderX}px, ${s.currentY}px)`

          // Label: visible only in zenith zone or on hover — CSS transition handles smoothing
          const inZone = i === az.current && zenithProximity(s.theta) > ZENITH_THRESHOLD
          const targetOp = inZone || hi === i ? '1' : '0'
          const span = labelSpanRefs.current[i]
          if (span && span.style.opacity !== targetOp) span.style.opacity = targetOp
        }

      } else if (phase === 'to-reveal') {
        const t = easeInOutCubic(Math.min(1, (now - transitionStartRef.current) / TRANSITION_MS))
        for (let i = 0; i < states.length; i++) {
          const s = states[i]!
          const vpX = lerp(s.snapX, s.revX, t)
          const vpY = lerp(s.snapY, s.revY, t)
          s.currentX = vpX
          s.currentY = vpY
          const div = satDivRefs.current[i]
          if (div) div.style.transform = `translate(${vpX - xOffset}px, ${vpY}px)`
          // Labels stay hidden during movement (staged reveal)
          const span = labelSpanRefs.current[i]
          if (span && span.style.opacity !== '0') span.style.opacity = '0'
        }
        if (t >= 1) {
          phaseRef.current = 'revealed'
          // Satellites have settled — now reveal labels (CSS 200ms transition)
          for (const span of labelSpanRefs.current) {
            if (span) span.style.opacity = '1'
          }
        }

      } else if (phase === 'revealed') {
        // Static — nothing to update per frame

      } else {
        // 'to-orbit'
        const t = easeInOutCubic(Math.min(1, (now - transitionStartRef.current) / TRANSITION_MS))
        for (let i = 0; i < states.length; i++) {
          const s = states[i]!
          const vpX = lerp(s.snapX, s.targetX, t)
          const vpY = lerp(s.snapY, s.targetY, t)
          s.currentX = vpX
          s.currentY = vpY
          const div = satDivRefs.current[i]
          if (div) div.style.transform = `translate(${vpX - xOffset}px, ${vpY}px)`
        }
        if (t >= 1) {
          for (const s of states) {
            s.currentX = s.targetX
            s.currentY = s.targetY
          }
          activeZenithRef.current = -1
          phaseRef.current = 'orbit'
        }
      }
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [labels.length])   // ← no size dependency: RAF never restarts on resize

  // ── Button handler ─────────────────────────────────────────────────────────
  const handleToggle = () => {
    const now = performance.now()
    const phase = phaseRef.current
    const { w, h, xOffset } = sizeRef.current
    const effectiveW = w + xOffset

    if (phase === 'orbit' || phase === 'to-orbit') {
      const layout = buildRevealedLayout(labels.length, effectiveW)
      for (let i = 0; i < statesRef.current.length; i++) {
        const s = statesRef.current[i]!
        s.snapX = s.currentX
        s.snapY = s.currentY
        s.revX = layout[i]!.x   // already viewport coords — no xOffset addition
        s.revY = layout[i]!.y
      }
      // Hide all labels immediately before satellite movement starts
      for (const span of labelSpanRefs.current) {
        if (span) span.style.opacity = '0'
      }
      phaseRef.current = 'to-reveal'
      transitionStartRef.current = now
      setRevealedUI(true)
    } else {
      const sp = buildOrbitParams(0, 1, effectiveW, h)
      for (const s of statesRef.current) {
        s.snapX = s.currentX
        s.snapY = s.currentY
        s.targetX = sp.cx + sp.rx * Math.cos(s.theta)
        s.targetY = sp.cy + sp.ry * Math.sin(s.theta)
      }
      // Hide labels immediately — satellites move after labels are gone (CSS 200ms fade)
      for (const span of labelSpanRefs.current) {
        if (span) span.style.opacity = '0'
      }
      phaseRef.current = 'to-orbit'
      transitionStartRef.current = now
      setRevealedUI(false)
    }
  }

  // ── Hover handlers ─────────────────────────────────────────────────────────
  const onEnter = (i: number) => {
    hoverIndexRef.current = i
    if (reducedMotion.current) {
      const span = labelSpanRefs.current[i]
      if (span) span.style.opacity = '1'
    }
  }
  const onLeave = (i: number) => {
    if (hoverIndexRef.current === i) hoverIndexRef.current = null
    if (reducedMotion.current) {
      const span = labelSpanRefs.current[i]
      if (span) span.style.opacity = '0'
    }
  }

  return (
    <div ref={containerRef} className={styles.orbitRoot}>
      {labels.map((label, i) => (
        <div
          key={`sat-${i}`}
          ref={el => { satDivRefs.current[i] = el }}
          className={styles.satWrap}
          onMouseEnter={() => onEnter(i)}
          onMouseLeave={() => onLeave(i)}
        >
          <img
            src={SAT_SRC}
            alt=""
            className={styles.satIcon}
            width={61}
            height={33}
            draggable={false}
          />
          <span
            ref={el => { labelSpanRefs.current[i] = el }}
            className={styles.skillLabel}
          >
            {label}
          </span>
        </div>
      ))}
      <button type="button" className={styles.revealBtn} onClick={handleToggle}>
        {revealedUI ? 'Back to orbit' : 'Reveal all skills'}
      </button>
    </div>
  )
}
