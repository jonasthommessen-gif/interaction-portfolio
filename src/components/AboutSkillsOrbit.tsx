import { useEffect, useRef, useState } from 'react'
import type { AboutSkill } from '../lib/aboutContent'
import {
  buildOrbitParams,
  easeInOutCubic,
  orbitPosition,
  zenithProximity,
  zenithSpeedFactor,
  ZENITH_Y_FRACTION,
} from '../lib/aboutOrbitMath'
import styles from './AboutSkillsOrbit.module.css'

const SAT_SRC = '/Other/Base.satelite.svg'
const ZENITH_HOLD_MS = 3000
const ZENITH_THRESHOLD = 0.88
const TRANSITION_MS = 2000

type Phase = 'orbit' | 'to-reveal' | 'revealed' | 'to-orbit'

type SatState = {
  theta: number
  omega: number
  labelOpacity: number
  zenithHoldUntil: number
  zenithArmed: boolean
  // rendered position (updated every RAF frame)
  currentX: number
  currentY: number
  // snapshot at transition start
  snapX: number
  snapY: number
  // fixed orbit target position for to-orbit (θ frozen at button click)
  targetX: number
  targetY: number
  // constellation target position
  revX: number
  revY: number
}

// Deterministic constellation offsets (fraction of grid cell) — keeps the
// revealed layout from looking like a strict grid/menu.
const CONSTELLATION_OFFSETS = [
  { dx: 0.08, dy: -0.10 },
  { dx: -0.05, dy: 0.12 },
  { dx: 0.10, dy: 0.06 },
  { dx: -0.08, dy: -0.13 },
  { dx: 0.06, dy: 0.11 },
  { dx: -0.09, dy: -0.05 },
  { dx: 0.04, dy: 0.13 },
  { dx: -0.03, dy: -0.08 },
]

function buildRevealedLayout(count: number, w: number, h: number) {
  const rows = count <= 4 ? 1 : count <= 8 ? 2 : 3
  const cols = Math.ceil(count / rows)
  const padX = w * 0.07
  const padY = h * 0.14
  const cellW = (w - padX * 2) / cols
  const cellH = (h - padY * 2) / rows
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const off = CONSTELLATION_OFFSETS[i % CONSTELLATION_OFFSETS.length]!
    return {
      x: padX + col * cellW + cellW * 0.15 + off.dx * cellW,
      y: padY + row * cellH + cellH * 0.35 + off.dy * cellH,
    }
  })
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type Props = { skills: AboutSkill[] }

export function AboutSkillsOrbit({ skills }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  // Only used for button label — avoids re-rendering the whole loop on state changes
  const [revealedUI, setRevealedUI] = useState(false)
  const [, tick] = useState(0)

  const statesRef = useRef<SatState[]>([])
  const phaseRef = useRef<Phase>('orbit')
  const transitionStartRef = useRef(0)
  // Ref-based hover: no effect restart on hover, no flicker
  const hoverIndexRef = useRef<number | null>(null)

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const labels = skills.map((s) => s.label)

  // ── Observe container size ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect()
      setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Initialise satellite states ────────────────────────────────────────────
  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return
    const layout = buildRevealedLayout(labels.length, size.w, size.h)
    statesRef.current = labels.map((_, i) => {
      const params = buildOrbitParams(i, labels.length, size.w, size.h)
      const pos = orbitPosition(params, params.phase)
      return {
        theta: params.phase,
        omega: params.omega,
        labelOpacity: 0,
        zenithHoldUntil: 0,
        zenithArmed: true,
        currentX: pos.x,
        currentY: pos.y,
        snapX: pos.x,
        snapY: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        revX: layout[i]!.x,
        revY: layout[i]!.y,
      }
    })
    phaseRef.current = 'orbit'
    setRevealedUI(false)
  }, [size.w, size.h, labels.length])

  // ── Single RAF loop — all phases ───────────────────────────────────────────
  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return

    // Shared orbit geometry (all satellites use the same circle)
    const sharedParams = buildOrbitParams(0, 1, size.w, size.h)
    const oCx = sharedParams.cx
    const oCy = sharedParams.cy
    const oR = sharedParams.rx

    if (reducedMotion.current) {
      // Static constellation; labels shown on hover only (see handlers below)
      for (const s of statesRef.current) {
        s.currentX = s.revX
        s.currentY = s.revY
        s.labelOpacity = 0
      }
      tick((n) => n + 1)
      return
    }

    let raf = 0
    let last = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016
      last = now

      const states = statesRef.current
      const phase = phaseRef.current
      const t = easeInOutCubic(
        Math.min(1, (now - transitionStartRef.current) / TRANSITION_MS),
      )
      const hi = hoverIndexRef.current

      if (phase === 'orbit') {
        // ── Find satellite closest to zenith (explicit single-reveal coordination)
        let maxProx = 0
        let maxIdx = -1
        for (let i = 0; i < states.length; i++) {
          const p = zenithProximity(states[i]!.theta)
          if (p > maxProx) {
            maxProx = p
            maxIdx = i
          }
        }

        for (let i = 0; i < states.length; i++) {
          const s = states[i]!
          const holding = now < s.zenithHoldUntil

          // Advance angle (paused while holding)
          if (!holding) {
            s.theta += zenithSpeedFactor(s.theta) * s.omega * dt
          }

          // Update rendered position from orbit math
          s.currentX = oCx + oR * Math.cos(s.theta)
          s.currentY = oCy + oR * Math.sin(s.theta)

          // Only the single closest satellite may auto-reveal
          const isLeader = i === maxIdx && maxProx > ZENITH_THRESHOLD
          const targetOp = isLeader || holding || hi === i ? 1 : 0
          s.labelOpacity += (targetOp - s.labelOpacity) * Math.min(1, dt * 2.5)

          // Trigger zenith hold
          if (isLeader && s.zenithArmed && !holding) {
            s.zenithHoldUntil = now + ZENITH_HOLD_MS
            s.zenithArmed = false
          }
          // Re-arm when clearly past zenith zone
          if (zenithProximity(s.theta) < 0.12 && now >= s.zenithHoldUntil) {
            s.zenithArmed = true
          }
        }
      } else if (phase === 'to-reveal') {
        for (const s of states) {
          s.currentX = lerp(s.snapX, s.revX, t)
          s.currentY = lerp(s.snapY, s.revY, t)
          s.labelOpacity = t
        }
        if (t >= 1) phaseRef.current = 'revealed'
      } else if (phase === 'revealed') {
        for (const s of states) {
          s.currentX = s.revX
          s.currentY = s.revY
          s.labelOpacity = 1
        }
      } else {
        // 'to-orbit' — interpolate to the fixed orbit target captured at click time
        for (const s of states) {
          s.currentX = lerp(s.snapX, s.targetX, t)
          s.currentY = lerp(s.snapY, s.targetY, t)
          s.labelOpacity = 1 - t
        }
        if (t >= 1) {
          for (const s of states) s.labelOpacity = 0
          phaseRef.current = 'orbit'
        }
      }

      tick((n) => n + 1)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h, labels.length])

  // ── Button handler ─────────────────────────────────────────────────────────
  const handleToggle = () => {
    const now = performance.now()
    const phase = phaseRef.current

    if (phase === 'orbit' || phase === 'to-orbit') {
      // → reveal: snapshot current positions, compute constellation targets
      const layout = buildRevealedLayout(labels.length, size.w, size.h)
      for (let i = 0; i < statesRef.current.length; i++) {
        const s = statesRef.current[i]!
        s.snapX = s.currentX
        s.snapY = s.currentY
        s.revX = layout[i]!.x
        s.revY = layout[i]!.y
      }
      phaseRef.current = 'to-reveal'
      transitionStartRef.current = now
      setRevealedUI(true)
    } else {
      // → orbit: capture fixed orbit targets at current frozen θ
      const sharedParams = buildOrbitParams(0, 1, size.w, size.h)
      const cx = sharedParams.cx
      const cy = sharedParams.cy
      const R = sharedParams.rx
      for (const s of statesRef.current) {
        s.snapX = s.currentX
        s.snapY = s.currentY
        s.targetX = cx + R * Math.cos(s.theta)
        s.targetY = cy + R * Math.sin(s.theta)
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
      const s = statesRef.current[i]
      if (s) {
        s.labelOpacity = 1
        tick((n) => n + 1)
      }
    }
  }
  const onLeave = (i: number) => {
    if (hoverIndexRef.current === i) hoverIndexRef.current = null
    if (reducedMotion.current) {
      const s = statesRef.current[i]
      if (s) {
        s.labelOpacity = 0
        tick((n) => n + 1)
      }
    }
  }

  // ── SVG orbit ring ─────────────────────────────────────────────────────────
  // Derived from buildOrbitParams so the ring always matches the actual orbit.
  const { cx: orbitCx, cy: orbitCy, rx: orbitR } =
    size.w > 0 ? buildOrbitParams(0, 1, size.w, size.h) : { cx: 0, cy: 0, rx: 0 }

  return (
    <div ref={containerRef} className={styles.orbitRoot}>
      {orbitR > 0 && (
        <svg className={styles.orbitSvg} aria-hidden>
          <circle
            cx={orbitCx}
            cy={orbitCy}
            r={orbitR}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      )}
      {statesRef.current.map((s, i) => (
        <div
          key={`sat-${i}`}
          className={styles.satWrap}
          style={{ transform: `translate(${s.currentX}px, ${s.currentY}px)` }}
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
            className={styles.skillLabel}
            style={{
              opacity: s.labelOpacity,
              transform: `translateY(${(1 - s.labelOpacity) * 5}px)`,
            }}
            aria-hidden={s.labelOpacity < 0.1}
          >
            {labels[i]}
          </span>
        </div>
      ))}
      <button type="button" className={styles.revealBtn} onClick={handleToggle}>
        {revealedUI ? 'Back to orbit' : 'Reveal all skills'}
      </button>
    </div>
  )
}
