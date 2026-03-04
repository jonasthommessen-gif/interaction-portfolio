import { useLayoutEffect, useRef, useState } from 'react'
import styles from './AboutGridOverlay.module.css'

export interface AboutGridOverlayRefs {
  trailLine: SVGLineElement | null
  topLine: SVGLineElement | null
  splitLine: SVGLineElement | null
  midLine: SVGLineElement | null
  nameText: HTMLElement | null
  chevronLeft: HTMLElement | null
  chevronRight: HTMLElement | null
  leaderVertical: HTMLElement | null
  leaderHorizontal: HTMLElement | null
  intersectionTop: HTMLElement | null
  intersectionMid: HTMLElement | null
  trailGlyph: HTMLElement | null
  leftEdge: SVGLineElement | null
  rightEdge: SVGLineElement | null
}

interface AboutGridOverlayProps {
  /** If true, render in final visible state (no animation). */
  visible?: boolean
  /** Refs for GSAP to animate. Parent creates the ref object and passes it. */
  refs: React.MutableRefObject<AboutGridOverlayRefs | null>
}

function getInitialDimensions() {
  if (typeof window === 'undefined') return { w: 0, h: 0, topY: 150, midY: 560, splitX: 800 }
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    topY: 150,
    midY: 560,
    splitX: window.innerWidth * 0.71,
  }
}

export function AboutGridOverlay({ visible = false, refs }: AboutGridOverlayProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState(getInitialDimensions)

  useLayoutEffect(() => {
    const update = () => {
      const el = wrapperRef.current
      if (!el) return
      const topEl = el.querySelector('[data-measure="top-y"]') as HTMLElement
      const midEl = el.querySelector('[data-measure="mid-y"]') as HTMLElement
      const splitEl = el.querySelector('[data-measure="split-x"]') as HTMLElement
      const topY = topEl?.getBoundingClientRect?.()?.top ?? 150
      const midY = midEl?.getBoundingClientRect?.()?.top ?? 560
      const splitX = splitEl?.getBoundingClientRect?.()?.left ?? window.innerWidth * 0.71
      setDimensions({
        w: window.innerWidth,
        h: window.innerHeight,
        topY,
        midY,
        splitX,
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(document.documentElement)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const { w, h, topY, midY, splitX } = dimensions
  if (w === 0 || h === 0) return null

  const topLineLength = w
  const splitLineLength = h - topY
  const midLineLength = w
  const leftEdgeLength = h
  const rightEdgeLength = h
  const trailLength = Math.min(120, w - splitX - 40)

  return (
    <div ref={wrapperRef} className={styles.overlay} aria-hidden>
      {/* Hidden measure elements to resolve CSS var positions */}
      <div data-measure="top-y" style={{ position: 'absolute', top: 'var(--top-y)', left: 0, width: 0, height: 0, pointerEvents: 'none', visibility: 'hidden' }} />
      <div data-measure="mid-y" style={{ position: 'absolute', top: 'var(--mid-y)', left: 0, width: 0, height: 0, pointerEvents: 'none', visibility: 'hidden' }} />
      <div data-measure="split-x" style={{ position: 'absolute', left: 'var(--split-x)', top: 0, width: 0, height: 0, pointerEvents: 'none', visibility: 'hidden' }} />
      <svg
        className={styles.svg}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={{ overflow: 'visible' }}
      >
        {/* Left edge */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.leftEdge = el
          }}
          x1={0}
          y1={0}
          x2={0}
          y2={h}
          className={styles.line}
          strokeDasharray={leftEdgeLength}
          strokeDashoffset={visible ? 0 : leftEdgeLength}
        />
        {/* Right edge */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.rightEdge = el
          }}
          x1={w}
          y1={0}
          x2={w}
          y2={h}
          className={styles.line}
          strokeDasharray={rightEdgeLength}
          strokeDashoffset={visible ? 0 : rightEdgeLength}
        />
        {/* Trail (top right, step 1) - short segment */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.trailLine = el
          }}
          x1={w - trailLength - 20}
          y1={topY}
          x2={w - 20}
          y2={topY}
          className={styles.trailLine}
          strokeDasharray={trailLength}
          strokeDashoffset={visible ? 0 : trailLength}
        />
        {/* Top horizontal */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.topLine = el
          }}
          x1={0}
          y1={topY}
          x2={w}
          y2={topY}
          className={styles.line}
          strokeDasharray={topLineLength}
          strokeDashoffset={visible ? 0 : topLineLength}
        />
        {/* Split vertical */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.splitLine = el
          }}
          x1={splitX}
          y1={topY}
          x2={splitX}
          y2={h}
          className={styles.line}
          strokeDasharray={splitLineLength}
          strokeDashoffset={visible ? 0 : splitLineLength}
        />
        {/* Mid horizontal */}
        <line
          ref={(el) => {
            if (refs.current) refs.current.midLine = el
          }}
          x1={0}
          y1={midY}
          x2={w}
          y2={midY}
          className={styles.line}
          strokeDasharray={midLineLength}
          strokeDashoffset={visible ? 0 : midLineLength}
        />
      </svg>

      {/* Trail glyph (top right, step 1) */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.trailGlyph = el
        }}
        className={styles.trailGlyph}
        style={{
          left: w - 20,
          top: topY,
          transform: 'translate(-50%, -50%)',
          opacity: visible ? 1 : 0,
        }}
      >
        <img src="/Other/Name.glyph.svg" alt="" />
      </div>

      {/* Leader during vertical draw (step 3) */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.leaderVertical = el
        }}
        className={styles.leader}
        style={{
          left: splitX,
          top: topY,
          transform: 'translate(-50%, -50%)',
          opacity: visible ? 0 : 0,
        }}
      >
        <img src="/Other/Intsection.glyph.svg" alt="" />
      </div>

      {/* Leader during horizontal draw (step 4) */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.leaderHorizontal = el
        }}
        className={styles.leader}
        style={{
          left: splitX,
          top: midY,
          transform: 'translate(-50%, -50%)',
          opacity: visible ? 0 : 0,
        }}
      >
        <img src="/Other/Intsection.glyph.svg" alt="" />
      </div>

      {/* Intersection glyph - top */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.intersectionTop = el
        }}
        className={styles.intersection}
        style={{
          left: splitX,
          top: topY,
          opacity: visible ? 1 : 0,
          transform: 'translate(-50%, -50%) scale(0)',
        }}
      >
        <img src="/Other/Intsection.glyph.svg" alt="" />
      </div>

      {/* Intersection glyph - mid */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.intersectionMid = el
        }}
        className={styles.intersection}
        style={{
          left: splitX,
          top: midY,
          opacity: visible ? 1 : 0,
          transform: 'translate(-50%, -50%) scale(0)',
        }}
      >
        <img src="/Other/Intsection.glyph.svg" alt="" />
      </div>

      {/* Name text (step 2) — header of first content area, just below the top line */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.nameText = el
        }}
        style={{
          position: 'absolute',
          left: 120,
          top: topY + 12,
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.92)',
          opacity: visible ? 1 : 0,
          whiteSpace: 'nowrap',
        }}
      >
        JONAS THOMMESSEN
      </div>

      {/* Chevron cluster left of name — points left */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.chevronLeft = el
        }}
        style={{
          position: 'absolute',
          left: 40,
          top: topY,
          transform: 'translate(-50%, -50%) scaleX(-1)',
          width: 28,
          height: 28,
          opacity: visible ? 1 : 0,
        }}
      >
        <img src="/Other/Name.glyph.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
      </div>

      {/* Chevron cluster right of name (before split) — points right */}
      <div
        ref={(el) => {
          if (refs.current) refs.current.chevronRight = el
        }}
        style={{
          position: 'absolute',
          left: splitX - 60,
          top: topY,
          transform: 'translate(-50%, -50%)',
          width: 28,
          height: 28,
          opacity: visible ? 1 : 0,
        }}
      >
        <img src="/Other/Name.glyph.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
      </div>
    </div>
  )
}
