import { useEffect, useRef, useState } from 'react'
import type { AboutSkill } from '../lib/aboutContent'
import {
  buildOrbitParams,
  orbitPosition,
  zenithProximity,
  zenithSpeedFactor,
  type OrbitParams,
} from '../lib/aboutOrbitMath'
import styles from './AboutSkillsOrbit.module.css'

const SAT_SRC = '/Other/Base.satelite.svg'
const ZENITH_HOLD_MS = 3000
const LABEL_FADE_MS = 400

type SatState = {
  theta: number
  params: OrbitParams
  zenithHoldUntil: number
  zenithArmed: boolean
  labelOpacity: number
}

type Props = {
  skills: AboutSkill[]
}

export function AboutSkillsOrbit({ skills }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [revealed, setRevealed] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const statesRef = useRef<SatState[]>([])
  const revealedProgressRef = useRef(0)
  const [, tick] = useState(0)
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const labels = skills.map((s) => s.label)

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

  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return
    statesRef.current = labels.map((_, i) => ({
      theta: buildOrbitParams(i, labels.length, size.w, size.h).phase,
      params: buildOrbitParams(i, labels.length, size.w, size.h),
      zenithHoldUntil: 0,
      zenithArmed: true,
      labelOpacity: 0,
    }))
  }, [size.w, size.h, labels.length])

  useEffect(() => {
    if (reducedMotion.current || revealed) return
    let raf = 0
    let last = 0

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016
      last = now
      const states = statesRef.current
      const nowMs = now

      for (let i = 0; i < states.length; i++) {
        const s = states[i]!
        const holding = nowMs < s.zenithHoldUntil
        if (!holding) {
          const speed = zenithSpeedFactor(s.theta) * s.params.omega
          s.theta += speed * dt
        }
        const prox = zenithProximity(s.theta)
        const showZenith = prox > 0.72
        const showHover = hoverIndex === i
        const targetOpacity = showZenith || showHover || holding ? 1 : 0
        s.labelOpacity += (targetOpacity - s.labelOpacity) * Math.min(1, dt * (1 / (LABEL_FADE_MS / 1000)))

        if (showZenith && s.zenithArmed && !holding) {
          s.zenithHoldUntil = nowMs + ZENITH_HOLD_MS
          s.zenithArmed = false
        }
        if (!showZenith && prox < 0.35 && nowMs >= s.zenithHoldUntil) {
          s.zenithArmed = true
        }
      }
      tick((n) => n + 1)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [revealed, hoverIndex, labels.length])

  useEffect(() => {
    if (!revealed) {
      revealedProgressRef.current = 0
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 500
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      revealedProgressRef.current = t
      tick((n) => n + 1)
      if (t < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [revealed])

  const renderPositions = () => {
    const states = statesRef.current
    if (size.w <= 0 || size.h <= 0) return []
    return labels.map((label, i) => {
      const s = states[i]
      if (!s) {
        const params = buildOrbitParams(i, labels.length, size.w, size.h)
        const p = orbitPosition(params, params.phase)
        return { label, x: p.x, y: p.y, labelOpacity: revealed ? 1 : 0 }
      }
      if (revealed || reducedMotion.current) {
        const cols = Math.ceil(Math.sqrt(labels.length))
        const col = i % cols
        const row = Math.floor(i / cols)
        const cellW = size.w / cols
        const cellH = size.h / Math.ceil(labels.length / cols)
        const tx = cellW * col + cellW * 0.2
        const ty = cellH * row + cellH * 0.35
        const orb = orbitPosition(s.params, s.theta)
        const t = revealedProgressRef.current
        return {
          label,
          x: orb.x + (tx - orb.x) * t,
          y: orb.y + (ty - orb.y) * t,
          labelOpacity: Math.max(s.labelOpacity, t),
        }
      }
      const p = orbitPosition(s.params, s.theta)
      return { label, x: p.x, y: p.y, labelOpacity: s.labelOpacity }
    })
  }

  const positions = renderPositions()
  const orbitRx = size.w > 0 ? size.w * 0.42 : 0
  const orbitRy = size.h > 0 ? size.h * 0.32 : 0

  return (
    <div ref={containerRef} className={styles.orbitRoot}>
      {orbitRx > 0 && (
        <svg className={styles.orbitSvg} aria-hidden>
          <ellipse
            cx="50%"
            cy="50%"
            rx={orbitRx}
            ry={orbitRy}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      )}
      {positions.map((p, i) => (
        <div
          key={`${p.label}-${i}`}
          className={styles.satWrap}
          style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <img src={SAT_SRC} alt="" className={styles.satIcon} width={61} height={33} draggable={false} />
          <span
            className={styles.skillLabel}
            style={{ opacity: p.labelOpacity }}
            aria-hidden={p.labelOpacity < 0.1}
          >
            {p.label}
          </span>
        </div>
      ))}
      <button
        type="button"
        className={styles.revealBtn}
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? 'Back to orbit' : 'Reveal all skills'}
      </button>
    </div>
  )
}
