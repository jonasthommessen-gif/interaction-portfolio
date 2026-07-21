import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useMotionValue } from 'framer-motion'
import { fetchArchiveProjects } from '../lib/cms'
import { preloadMedia } from '../lib/preloadMedia'
import {
  buildArchiveGalleryEntries,
  getArchiveLoopWidth,
  type ArchiveGalleryEntry,
} from '../lib/archiveGallery'
import type { ArchiveProject } from '../types/cms'
import { ArchiveCard } from '../components/ArchiveCard'
import type { DepthLayer } from '../components/ArchiveCard'
import { FeedOverlay } from '../components/FeedOverlay'
import { InlinePageLoader } from '../components/InlinePageLoader'
import { useNavbarInvert } from '../contexts/NavbarInvertContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './ArchivePage.module.css'

const MOBILE_BREAKPOINT = '(max-width: 820px)'

function getInitialArchiveState(): { viewMode: 'gallery' | 'feed'; feedEntryId: string | null } {
  return { viewMode: 'gallery', feedEntryId: null }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FRICTION = 0.94
/** Idle auto-scroll: starts after 10s of no interaction */
const IDLE_TIMEOUT_MS = 10_000
/** Auto-scroll speed in px/frame (~0.3px at 60fps) */
const IDLE_SCROLL_SPEED = 0.35

/** Lerp factor for smooth scroll: display follows target by this fraction per frame */
const SMOOTH_LERP = 0.12

/** Minimum center-to-center spacing between cards along the loop (px). */
const MIN_CARD_GAP_PX = 160

/** Max wheel delta per event so target does not jump too far and break smoothness */
const MAX_WHEEL_DELTA = 48

/** Snap to target when within this distance (avoids drift and micro-jitter) */
const SNAP_THRESHOLD = 0.4

function normalizeWheelDelta(e: WheelEvent): number {
  let dx = e.deltaX
  let dy = e.deltaY
  if (e.deltaMode === 1) {
    dx *= 16
    dy *= 16
  } else if (e.deltaMode === 2) {
    const page = typeof window !== 'undefined' ? window.innerHeight : 800
    dx *= page
    dy *= page
  }
  return Math.abs(dx) > Math.abs(dy) ? dx : dy
}

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

/** Minimum horizontal gap between cards as a fraction of the loop (avoids overlap) */
function buildLayouts(total: number, loopWidth: number): CardLayout[] {
  if (total <= 0) return []
  const MIN_X_GAP_FRACTION = MIN_CARD_GAP_PX / loopWidth
  const rng = seededRandom(42)
  const layouts: CardLayout[] = []
  const depthPattern: DepthLayer[] = [
    1, 3, 2, 1, 2, 3, 2, 1, 3, 1, 2, 3, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2,
  ]
  for (let i = 0; i < total; i++) {
    const depth = depthPattern[i % depthPattern.length]
    const scale = depth === 1 ? 1.0 : depth === 2 ? 0.88 : 0.76
    const baseW = 200 + Math.floor(rng() * 60) - 30
    const baseH = 240 + Math.floor(rng() * 70) - 35
    const yRange = depth === 1 ? 340 : depth === 2 ? 420 : 500
    const yOffset = (rng() - 0.5) * yRange
    const slotWidth = 1.0 / total
    const jitter = (rng() - 0.5) * slotWidth * 0.5
    const xFraction = i / total + jitter
    layouts.push({
      xFraction: ((xFraction % 1) + 1) % 1,
      yOffset,
      depth,
      width: baseW,
      height: baseH,
      scale,
    })
  }

  // Enforce minimum x spacing so cards don't overlap (no doubled/tripled look)
  const byX = layouts
    .map((layout, index) => ({ index, xFraction: layout.xFraction }))
    .sort((a, b) => a.xFraction - b.xFraction)
  for (let k = 1; k < byX.length; k++) {
    const prev = byX[k - 1].xFraction
    const minNext = prev + MIN_X_GAP_FRACTION
    const current = layouts[byX[k].index].xFraction
    if (current < minNext) {
      layouts[byX[k].index] = {
        ...layouts[byX[k].index],
        xFraction: minNext,
      }
      byX[k].xFraction = minNext
    }
  }
  // Normalize any xFraction that ended up >= 1 back into [0, 1)
  for (const layout of layouts) {
    layout.xFraction = ((layout.xFraction % 1) + 1) % 1
  }

  return layouts
}


// ─── Component ────────────────────────────────────────────────────────────────

export function ArchivePage() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const { setInvertLogo } = useNavbarInvert()
  const initial = useMemo(getInitialArchiveState, [])

  const [projects, setProjects] = useState<ArchiveProject[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchArchiveProjects()
        if (cancelled) return
        // Prefetch before committing projects — setProjects rebuilds gallery layouts.
        const covers = buildArchiveGalleryEntries(data).map((entry) => ({
          src: entry.cover,
          type: entry.coverType,
        }))
        await preloadMedia(covers)
        if (cancelled) return
        setProjects(data)
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const TOTAL = projects.length
  const galleryEntries = useMemo(
    () => buildArchiveGalleryEntries(projects),
    [projects],
  )
  const CARD_COUNT = galleryEntries.length
  const LOOP_WIDTH = useMemo(() => getArchiveLoopWidth(CARD_COUNT), [CARD_COUNT])
  const CARD_LAYOUTS = useMemo(
    () => buildLayouts(CARD_COUNT, LOOP_WIDTH),
    [CARD_COUNT, LOOP_WIDTH],
  )

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
  const targetOffsetRef = useRef(0)
  const smoothRafRef = useRef<number | null>(null)
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
      targetOffsetRef.current += IDLE_SCROLL_SPEED
      idleRafRef.current = requestAnimationFrame(tick)
    }
    idleRafRef.current = requestAnimationFrame(tick)
  }, [])

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
    if (Math.abs(momentumVelocity.current) < 0.09) {
      momentumVelocity.current = 0
      rafRef.current = null
      return
    }
    targetOffsetRef.current += momentumVelocity.current
    rafRef.current = requestAnimationFrame(runMomentum)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLElement>(null)

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (isFeedOpen || isMobile) return
      e.preventDefault()

      resetIdleTimer()

      const rawDelta = normalizeWheelDelta(e)
      const delta =
        Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), MAX_WHEEL_DELTA)
      targetOffsetRef.current += delta

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
        if (Math.abs(momentumVelocity.current) > 0.09) {
          rafRef.current = requestAnimationFrame(runMomentum)
        }
      }, 60)
    },
    [isFeedOpen, isMobile, resetIdleTimer, runMomentum],
  )

  const handleWheelRef = useRef(handleWheel)
  handleWheelRef.current = handleWheel

  // Attach after gallery mounts (scene ref is null while loading). Window capture
  // ensures trackpad/mouse wheel works even when hovering cards or overlays.
  useEffect(() => {
    if (loading || isMobile) return

    const onWheel = (e: WheelEvent) => {
      handleWheelRef.current(e)
    }

    const scene = containerRef.current
    const page = pageRef.current
    const targets: Array<HTMLElement | Window> = []
    if (scene) targets.push(scene)
    if (page) targets.push(page)
    targets.push(window)

    targets.forEach((target) => {
      target.addEventListener('wheel', onWheel as EventListener, {
        passive: false,
        capture: true,
      })
    })

    return () => {
      targets.forEach((target) => {
        target.removeEventListener('wheel', onWheel as EventListener, { capture: true })
      })
    }
  }, [loading, isMobile])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (smoothRafRef.current) cancelAnimationFrame(smoothRafRef.current)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Smooth scroll: lerp display offset toward target every frame (unbounded; no wrap so crossing 0/LOOP_WIDTH doesn't jump)
  useEffect(() => {
    const tick = () => {
      const current = offsetMV.get()
      const target = targetOffsetRef.current
      const d = target - current
      const next =
        Math.abs(d) <= SNAP_THRESHOLD ? target : current + d * SMOOTH_LERP
      offsetMV.set(next)
      smoothRafRef.current = requestAnimationFrame(tick)
    }
    smoothRafRef.current = requestAnimationFrame(tick)
    return () => {
      if (smoothRafRef.current) cancelAnimationFrame(smoothRafRef.current)
    }
  }, [offsetMV])

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
      targetOffsetRef.current += dx
    },
    [isFeedOpen],
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
    return Array.from({ length: CARD_COUNT }, (_, i) => i).sort(
      (a, b) => CARD_LAYOUTS[b].depth - CARD_LAYOUTS[a].depth,
    )
  }, [CARD_COUNT, CARD_LAYOUTS])

  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1440),
  )
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (loading) {
    return (
      <main ref={pageRef} className={styles.page}>
        <InlinePageLoader label="Loading archive" />
      </main>
    )
  }

  return (
    <main
      ref={pageRef}
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
              setFeedEntryId(projects[0]?.id ?? null)
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
            {galleryEntries.map((entry) => {
              const project = projects.find((p) => p.id === entry.projectId)
              if (!project) return null
              return (
                <div key={entry.instanceId} className={styles.mobileGridCell}>
                  <ArchiveCard
                    project={project}
                    displayTitle={entry.displayTitle}
                    coverSrc={entry.cover}
                    coverType={entry.coverType}
                    depth={1}
                    isFocused={false}
                    anyFocused={isFeedOpen}
                    onHover={() => {}}
                    onClick={() => openFeedFromCard(entry.projectId)}
                    layoutId={`archive-card-${entry.instanceId}`}
                    disableFloat
                  />
                </div>
              )
            })}
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
            entries={galleryEntries}
            projects={projects}
            cardLayouts={CARD_LAYOUTS}
            loopWidth={LOOP_WIDTH}
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
        <span className={styles.statusLeft}>
          Archive inventory: {TOTAL}
          {CARD_COUNT > TOTAL ? ` · ${CARD_COUNT} cards` : ''}
        </span>
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
            projects={projects}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

// ─── ScrollCanvas ─────────────────────────────────────────────────────────────

function ScrollCanvas({
  entries,
  projects,
  cardLayouts,
  loopWidth,
  offsetMV,
  sortedIndices,
  isFeedOpen,
  onHover,
  onCardClick,
  viewportWidth,
}: {
  entries: ArchiveGalleryEntry[]
  projects: ArchiveProject[]
  cardLayouts: CardLayout[]
  loopWidth: number
  offsetMV: ReturnType<typeof useMotionValue<number>>
  sortedIndices: number[]
  isFeedOpen: boolean
  onHover: (title: string | null) => void
  onCardClick: (id: string) => void
  viewportWidth: number
}) {
  const slotRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const halfVW = viewportWidth / 2
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  const PARALLAX_SPEED: Record<DepthLayer, number> = { 1: 1.0, 2: 0.82, 3: 0.65 }

  useEffect(() => {
    const updatePositions = (offset: number) => {
      sortedIndices.forEach((entryIndex) => {
        const entry = entries[entryIndex]
        const layout = cardLayouts[entryIndex]
        const el = slotRefs.current.get(entry.instanceId)
        if (!el) return

        const parallaxOffset = offset * PARALLAX_SPEED[layout.depth]
        const cardAbsX = layout.xFraction * loopWidth
        const relXUnwrapped = cardAbsX - parallaxOffset
        let relX = ((relXUnwrapped % loopWidth) + loopWidth) % loopWidth
        if (relX > loopWidth / 2) relX -= loopWidth

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
  }, [offsetMV, sortedIndices, halfVW, entries, cardLayouts, loopWidth])

  return (
    <div className={styles.canvas}>
      {sortedIndices.map((entryIndex) => {
        const entry = entries[entryIndex]
        const project = projectById.get(entry.projectId)
        if (!project) return null
        const layout = cardLayouts[entryIndex]
        const zIndex = layout.depth === 1 ? 30 : layout.depth === 2 ? 20 : 10

        return (
          <div
            key={entry.instanceId}
            ref={(el) => {
              if (el) slotRefs.current.set(entry.instanceId, el)
              else slotRefs.current.delete(entry.instanceId)
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
              displayTitle={entry.displayTitle}
              coverSrc={entry.cover}
              coverType={entry.coverType}
              depth={layout.depth}
              isFocused={false}
              anyFocused={isFeedOpen}
              onHover={onHover}
              onClick={() => onCardClick(entry.projectId)}
              layoutId={`archive-card-${entry.instanceId}`}
            />
          </div>
        )
      })}
    </div>
  )
}
