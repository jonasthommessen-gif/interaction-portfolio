import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useMotionValue } from 'framer-motion'
import { archiveProjects } from '../content/archiveProjects'
import { ArchiveCard } from '../components/ArchiveCard'
import type { DepthLayer } from '../components/ArchiveCard'
import { FeedOverlay } from '../components/FeedOverlay'
import { useNavbarInvert } from '../contexts/NavbarInvertContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './ArchivePage.module.css'

const MOBILE_BREAKPOINT = '(max-width: 820px)'

function getInitialArchiveState(): { viewMode: 'gallery' | 'feed'; feedEntryId: string | null } {
  return { viewMode: 'gallery', feedEntryId: null }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECTS = archiveProjects
const TOTAL = PROJECTS.length
const LOOP_WIDTH = 4000
const FRICTION = 0.92

/** Idle auto-scroll: starts after 10s of no interaction */
const IDLE_TIMEOUT_MS = 10_000
/** Auto-scroll speed in px/frame (~0.3px at 60fps) */
const IDLE_SCROLL_SPEED = 0.35

// ─── Layout data ──────────────────────────────────────────────────────────────

type CardLayout = {
  xFraction: number
  yOffset: number
  depth: DepthLayer
  width: number
  height: number
  scale: number
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function buildLayouts(): CardLayout[] {
  const rng = seededRandom(42)
  const layouts: CardLayout[] = []
  const depthPattern: DepthLayer[] = [
    1, 3, 2, 1, 2, 3, 2, 1, 3, 1, 2, 3, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2,
  ]
  for (let i = 0; i < TOTAL; i++) {
    const depth = depthPattern[i % depthPattern.length]
    const scale = depth === 1 ? 1.0 : depth === 2 ? 0.88 : 0.76
    const baseW = 200 + Math.floor(rng() * 60) - 30
    const baseH = 240 + Math.floor(rng() * 70) - 35
    const yRange = depth === 1 ? 340 : depth === 2 ? 420 : 500
    const yOffset = (rng() - 0.5) * yRange
    const slotWidth = 1.0 / TOTAL
    const jitter = (rng() - 0.5) * slotWidth * 0.5
    const xFraction = i / TOTAL + jitter
    layouts.push({
      xFraction: ((xFraction % 1) + 1) % 1,
      yOffset,
      depth,
      width: baseW,
      height: baseH,
      scale,
    })
  }
  return layouts
}

const CARD_LAYOUTS = buildLayouts()

// ─── Component ────────────────────────────────────────────────────────────────

export function ArchivePage() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const { setInvertLogo } = useNavbarInvert()
  const initial = useMemo(getInitialArchiveState, [])

  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'gallery' | 'feed'>(initial.viewMode)

  // Feed state: null = gallery mode, string = feed open at that project id
  const [feedEntryId, setFeedEntryId] = useState<string | null>(initial.feedEntryId)
  // Whether feed was entered from a gallery card (true) or Feed button (false)
  const [feedFromGallery, setFeedFromGallery] = useState(false)

  const isFeedOpen = feedEntryId !== null

  // Reset logo invert when leaving Archive or closing Feed (invert is driven by FeedOverlay when Feed is open)
  useEffect(() => {
    if (!isMobile || !isFeedOpen) {
      setInvertLogo(false)
    }
    return () => setInvertLogo(false)
  }, [isMobile, isFeedOpen, setInvertLogo])

  // ── Momentum scroll ──────────────────────────────────────────────────────
  const offsetMV = useMotionValue(0)
  const recentDeltas = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const momentumVelocity = useRef(0)

  // ── Idle auto-scroll ─────────────────────────────────────────────────────
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleRafRef = useRef<number | null>(null)
  const isIdleScrolling = useRef(false)

  const stopIdleScroll = useCallback(() => {
    isIdleScrolling.current = false
    if (idleRafRef.current) {
      cancelAnimationFrame(idleRafRef.current)
      idleRafRef.current = null
    }
  }, [])

  const startIdleScroll = useCallback(() => {
    if (isIdleScrolling.current) return
    isIdleScrolling.current = true
    const tick = () => {
      if (!isIdleScrolling.current) return
      const current = offsetMV.get()
      const next = ((current + IDLE_SCROLL_SPEED) % LOOP_WIDTH + LOOP_WIDTH) % LOOP_WIDTH
      offsetMV.set(next)
      idleRafRef.current = requestAnimationFrame(tick)
    }
    idleRafRef.current = requestAnimationFrame(tick)
  }, [offsetMV])

  const resetIdleTimer = useCallback(() => {
    stopIdleScroll()
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (!isFeedOpen) {
      idleTimerRef.current = setTimeout(startIdleScroll, IDLE_TIMEOUT_MS)
    }
  }, [isFeedOpen, startIdleScroll, stopIdleScroll])

  // Start idle timer on mount, reset on any interaction
  useEffect(() => {
    resetIdleTimer()
    return () => {
      stopIdleScroll()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer, stopIdleScroll])

  // Stop idle scroll when feed opens
  useEffect(() => {
    if (isFeedOpen) {
      stopIdleScroll()
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    } else {
      resetIdleTimer()
    }
  }, [isFeedOpen, resetIdleTimer, stopIdleScroll])

  // ── Momentum scroll logic ─────────────────────────────────────────────────
  const runMomentum = useCallback(() => {
    momentumVelocity.current *= FRICTION
    if (Math.abs(momentumVelocity.current) < 0.15) {
      momentumVelocity.current = 0
      rafRef.current = null
      return
    }
    const current = offsetMV.get()
    const next = ((current + momentumVelocity.current) % LOOP_WIDTH + LOOP_WIDTH) % LOOP_WIDTH
    offsetMV.set(next)
    rafRef.current = requestAnimationFrame(runMomentum)
  }, [offsetMV])

  const containerRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Block gallery scroll when feed is open
      if (isFeedOpen) return
      e.preventDefault()

      resetIdleTimer()

      const delta = e.deltaY
      const current = offsetMV.get()
      const next = ((current + delta) % LOOP_WIDTH + LOOP_WIDTH) % LOOP_WIDTH
      offsetMV.set(next)

      recentDeltas.current.push(delta)
      if (recentDeltas.current.length > 5) recentDeltas.current.shift()

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        const avg =
          recentDeltas.current.length > 0
            ? recentDeltas.current.reduce((a, b) => a + b, 0) / recentDeltas.current.length
            : 0
        recentDeltas.current = []
        momentumVelocity.current = avg * 0.6
        if (Math.abs(momentumVelocity.current) > 0.15) {
          rafRef.current = requestAnimationFrame(runMomentum)
        }
      }, 60)
    },
    [isFeedOpen, offsetMV, resetIdleTimer, runMomentum],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Touch support
  const lastTouchX = useRef(0)
  const touchVelocityRef = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isFeedOpen) return
    lastTouchX.current = e.touches[0].clientX
    touchVelocityRef.current = 0
    resetIdleTimer()
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [isFeedOpen, resetIdleTimer])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isFeedOpen) return
      const dx = lastTouchX.current - e.touches[0].clientX
      touchVelocityRef.current = dx
      lastTouchX.current = e.touches[0].clientX
      const current = offsetMV.get()
      const next = ((current + dx) % LOOP_WIDTH + LOOP_WIDTH) % LOOP_WIDTH
      offsetMV.set(next)
    },
    [isFeedOpen, offsetMV],
  )

  const handleTouchEnd = useCallback(() => {
    if (isFeedOpen) return
    momentumVelocity.current = touchVelocityRef.current * 3
    rafRef.current = requestAnimationFrame(runMomentum)
  }, [isFeedOpen, runMomentum])

  // Mouse move resets idle timer
  const handleMouseMove = useCallback(() => {
    if (!isFeedOpen) resetIdleTimer()
  }, [isFeedOpen, resetIdleTimer])

  // ── Feed handlers ─────────────────────────────────────────────────────────

  const openFeedFromCard = useCallback((projectId: string) => {
    setFeedEntryId(projectId)
    setFeedFromGallery(true)
    setViewMode('feed')
  }, [])

  const closeFeed = useCallback(() => {
    setFeedEntryId(null)
    setViewMode('gallery')
  }, [])

  const sortedIndices = useMemo(() => {
    return Array.from({ length: TOTAL }, (_, i) => i).sort(
      (a, b) => CARD_LAYOUTS[b].depth - CARD_LAYOUTS[a].depth,
    )
  }, [])

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440

  return (
    <main
      className={styles.page}
      onMouseMove={handleMouseMove}
    >
      {/* ── Gallery / Feed pills (desktop only) ───────────────────────────────── */}
      {!isMobile && (
        <div className={styles.viewToggle}>
          <button
            type="button"
            className={viewMode === 'gallery' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => {
              closeFeed()
              setViewMode('gallery')
            }}
          >
            Gallery
          </button>
          <button
            type="button"
            className={viewMode === 'feed' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => {
              setViewMode('feed')
              setFeedEntryId(PROJECTS[0].id)
              setFeedFromGallery(false)
            }}
          >
            Feed
          </button>
        </div>
      )}

      {/* ── Gallery: mobile = 3-column grid, desktop = horizontal scroll ─────── */}
      {isMobile && viewMode === 'gallery' ? (
        <div className={styles.mobileGridWrap}>
          <div className={styles.mobileGrid}>
            {PROJECTS.map((project) => (
              <div key={project.id} className={styles.mobileGridCell}>
                <ArchiveCard
                  project={project}
                  depth={1}
                  isFocused={false}
                  anyFocused={isFeedOpen}
                  onHover={() => {}}
                  onClick={() => openFeedFromCard(project.id)}
                  layoutId={`archive-card-${project.id}`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {!isMobile ? (
        <div
          ref={containerRef}
          className={styles.scene}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ScrollCanvas
            offsetMV={offsetMV}
            sortedIndices={sortedIndices}
            isFeedOpen={isFeedOpen}
            onHover={setHoveredTitle}
            onCardClick={openFeedFromCard}
            viewportWidth={viewportWidth}
          />
        </div>
      ) : null}

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className={styles.statusBar}>
        <span className={styles.statusLeft}>Archive inventory: {TOTAL}</span>
        <span className={styles.statusRight}>{hoveredTitle ?? ''}</span>
      </div>

      {/* ── Feed overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFeedOpen && feedEntryId && (
          <FeedOverlay
            key="feed"
            entryProjectId={feedEntryId}
            fromGallery={feedFromGallery}
            onClose={closeFeed}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

// ─── ScrollCanvas ─────────────────────────────────────────────────────────────

function ScrollCanvas({
  offsetMV,
  sortedIndices,
  isFeedOpen,
  onHover,
  onCardClick,
  viewportWidth,
}: {
  offsetMV: ReturnType<typeof useMotionValue<number>>
  sortedIndices: number[]
  isFeedOpen: boolean
  onHover: (title: string | null) => void
  onCardClick: (id: string) => void
  viewportWidth: number
}) {
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const halfVW = viewportWidth / 2

  const PARALLAX_SPEED: Record<DepthLayer, number> = { 1: 1.0, 2: 0.82, 3: 0.65 }

  useEffect(() => {
    const updatePositions = (offset: number) => {
      sortedIndices.forEach((projectIndex) => {
        const project = PROJECTS[projectIndex]
        const layout = CARD_LAYOUTS[projectIndex]
        const el = slotRefs.current.get(project.id)
        if (!el) return

        const parallaxOffset = offset * PARALLAX_SPEED[layout.depth]
        const cardAbsX = layout.xFraction * LOOP_WIDTH
        let relX = ((cardAbsX - parallaxOffset) % LOOP_WIDTH + LOOP_WIDTH) % LOOP_WIDTH
        if (relX > LOOP_WIDTH / 2) relX -= LOOP_WIDTH

        const halfCard = (layout.width * layout.scale) / 2
        const visible = relX >= -(halfVW + halfCard + 50) && relX <= halfVW + halfCard + 50

        if (visible) {
          el.style.display = 'block'
          el.style.left = `calc(50% + ${relX}px)`
        } else {
          el.style.display = 'none'
        }
      })
    }

    updatePositions(offsetMV.get())
    const unsub = offsetMV.on('change', updatePositions)
    return unsub
  }, [offsetMV, sortedIndices, halfVW])

  return (
    <div className={styles.canvas}>
      {sortedIndices.map((projectIndex) => {
        const project = PROJECTS[projectIndex]
        const layout = CARD_LAYOUTS[projectIndex]
        const zIndex = layout.depth === 1 ? 30 : layout.depth === 2 ? 20 : 10

        return (
          <div
            key={project.id}
            ref={(el) => {
              if (el) slotRefs.current.set(project.id, el)
              else slotRefs.current.delete(project.id)
            }}
            className={styles.cardSlot}
            style={{
              left: '50%',
              top: `calc(50% + ${layout.yOffset}px)`,
              width: layout.width,
              height: layout.height,
              zIndex,
              transform: `translate(-50%, -50%) scale(${layout.scale})`,
            }}
          >
            <ArchiveCard
              project={project}
              depth={layout.depth}
              isFocused={false}
              anyFocused={isFeedOpen}
              onHover={onHover}
              onClick={() => onCardClick(project.id)}
              layoutId={`archive-card-${project.id}`}
            />
          </div>
        )
      })}
    </div>
  )
}
