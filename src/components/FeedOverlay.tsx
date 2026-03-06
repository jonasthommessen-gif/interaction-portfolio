import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { archiveProjects } from '../content/archiveProjects'
import type { ArchiveProject } from '../content/archiveProjects'
import { useNavbarInvert } from '../contexts/NavbarInvertContext'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getImageAverageLuminance, isImageBright } from '../utils/imageLuminance'
import styles from './FeedOverlay.module.css'

interface FeedOverlayProps {
  /** The project to scroll to initially */
  entryProjectId: string
  /** Whether the entry was from a gallery card (true) or the Feed button (false) */
  fromGallery: boolean
  onClose: () => void
}

// ─── FeedItem ─────────────────────────────────────────────────────────────────

function FeedItem({
  project,
  isEntry,
  fromGallery,
  onEntryImageChange,
  isMobile,
}: {
  project: ArchiveProject
  isEntry: boolean
  fromGallery: boolean
  onEntryImageChange?: (url: string) => void
  isMobile?: boolean
}) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Animation step for the entry item only
  // step 1: image floating in, step 2: white card rising, step 3: shelf settled
  const [step, setStep] = useState<1 | 2 | 3>(isEntry ? 1 : 3)

  useEffect(() => {
    if (!isEntry) return
    // Phase 1 → 2: image in place, white card starts rising
    const t1 = setTimeout(() => setStep(2), 420)
    // Phase 2 → 3: shelf effect
    const t2 = setTimeout(() => setStep(3), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isEntry])

  // Mobile: track visible slide index from scroll (for logo invert)
  const [mobileVisibleIndex, setMobileVisibleIndex] = useState(0)
  const updateVisibleIndex = useCallback(() => {
    const el = scrollRef.current
    if (!el || !isMobile) return
    const w = el.clientWidth
    if (w <= 0) return
    const i = Math.round(el.scrollLeft / w)
    const clamped = Math.max(0, Math.min(i, project.images.length - 1))
    setMobileVisibleIndex(clamped)
  }, [isMobile, project.images.length])

  useEffect(() => {
    if (!isMobile) return
    const el = scrollRef.current
    if (!el) return
    updateVisibleIndex()
    el.addEventListener('scroll', updateVisibleIndex)
    const ro = new ResizeObserver(updateVisibleIndex)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateVisibleIndex)
      ro.disconnect()
    }
  }, [isMobile, updateVisibleIndex])

  const effectiveIndex = isMobile ? mobileVisibleIndex : carouselIndex
  useEffect(() => {
    if (isEntry && onEntryImageChange && project.images[effectiveIndex]) {
      onEntryImageChange(project.images[effectiveIndex])
    }
  }, [isEntry, onEntryImageChange, project.images, effectiveIndex])

  const handlePrev = useCallback(() => {
    setCarouselIndex((i) => (i - 1 + project.images.length) % project.images.length)
  }, [project.images.length])

  const handleNext = useCallback(() => {
    setCarouselIndex((i) => (i + 1) % project.images.length)
  }, [project.images.length])

  const handleMobileDotClick = useCallback(
    (index: number) => {
      const el = scrollRef.current
      if (!el) return
      const w = el.clientWidth
      el.scrollTo({ left: index * w, behavior: 'smooth' })
    },
    []
  )

  const hasMultiple = project.images.length > 1

  // For the entry item, animate the image floating in from off-screen or from gallery
  const imageInitial = isEntry
    ? fromGallery
      ? { opacity: 0, scale: 0.85, y: 40 }
      : { opacity: 0, x: 80, scale: 0.9 }
    : { opacity: 1, scale: 1, y: 0 }

  const imageAnimate =
    step === 1
      ? { opacity: 1, scale: 1.04, y: 0, x: 0 }
      : step === 2
      ? { opacity: 1, scale: 1.04, y: 0, x: 0 }
      : { opacity: 1, scale: 1.0, y: 0, x: 0 }

  return (
    <div className={styles.feedItem}>
      {/* ── Media frame ─────────────────────────────────────────────────── */}
      <motion.div
        className={styles.mediaFrame}
        initial={imageInitial}
        animate={imageAnimate}
        transition={{ type: 'spring', stiffness: 180, damping: 26 }}
      >
        <div
          ref={scrollRef}
          className={`${styles.carouselWrapper} ${isMobile ? styles.carouselScroll : ''}`}
        >
          {isMobile ? (
            <>
              <div
                className={styles.carouselScrollTrack}
                style={{ '--slide-count': project.images.length } as React.CSSProperties}
              >
                {project.images.map((src, i) => (
                  <div key={i} className={styles.carouselSlide}>
                    <img
                      className={styles.carouselImage}
                      src={src}
                      alt={`${project.title} — image ${i + 1}`}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <AnimatePresence mode="sync">
                <motion.img
                  key={`${project.id}-${carouselIndex}`}
                  className={styles.carouselImage}
                  src={project.images[carouselIndex]}
                  alt={`${project.title} — image ${carouselIndex + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  draggable={false}
                />
              </AnimatePresence>

              {hasMultiple && (
                <>
                  <button
                    className={`${styles.arrow} ${styles.arrowLeft}`}
                    onClick={handlePrev}
                    aria-label="Previous image"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.arrow} ${styles.arrowRight}`}
                    onClick={handleNext}
                    aria-label="Next image"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>

      {hasMultiple && (
        <div className={styles.dotsWrap}>
          <div className={styles.dots}>
            {project.images.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === (isMobile ? mobileVisibleIndex : carouselIndex) ? styles.dotActive : ''}`}
                onClick={() => (isMobile ? handleMobileDotClick(i) : setCarouselIndex(i))}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Text shelf ──────────────────────────────────────────────────── */}
      <motion.div
        className={styles.textShelf}
        initial={isEntry ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
        animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h2 className={styles.title}>{project.title}</h2>
        <p className={styles.description}>{project.description}</p>
        <div className={styles.tags}>
          {project.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ─── FeedOverlay ──────────────────────────────────────────────────────────────

export function FeedOverlay({ entryProjectId, fromGallery, onClose }: FeedOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const { setInvertLogo } = useNavbarInvert()
  const [currentEntryImageUrl, setCurrentEntryImageUrl] = useState<string | null>(null)
  const isMobile = useMediaQuery('(max-width: 820px)')
  const reduceMotion = useReducedMotion()

  useFocusTrap(backdropRef, true)

  // Invert logo when the current entry (first) Feed image is bright (Option C)
  useEffect(() => {
    if (!currentEntryImageUrl) {
      setInvertLogo(false)
      return
    }
    let cancelled = false
    getImageAverageLuminance(currentEntryImageUrl).then((avg) => {
      if (!cancelled) setInvertLogo(isImageBright(avg))
    }).catch(() => {
      if (!cancelled) setInvertLogo(false)
    })
    return () => { cancelled = true; setInvertLogo(false) }
  }, [currentEntryImageUrl, setInvertLogo])

  // Build ordered project list starting from entry project
  const orderedProjects: ArchiveProject[] = (() => {
    const idx = archiveProjects.findIndex((p) => p.id === entryProjectId)
    if (idx === -1) return archiveProjects
    return [
      ...archiveProjects.slice(idx),
      ...archiveProjects.slice(0, idx),
    ]
  })()

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Click outside panel → close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  // Prevent feed scroll from propagating to gallery
  const handleFeedWheel = (e: React.WheelEvent) => {
    e.stopPropagation()
  }

  const backdropTransition = reduceMotion ? { duration: 0 } : { duration: 0.35 }
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, ease: [0.22, 1, 0.36, 1] as const, duration: 0.5, delay: 0.18 }

  return (
    <motion.div
      ref={backdropRef}
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={backdropTransition}
      onClick={handleBackdropClick}
    >
      {/* White feed panel — slides up from below */}
      <motion.div
        ref={panelRef}
        className={styles.panel}
        initial={{ y: reduceMotion ? 0 : '100%' }}
        animate={{ y: 0 }}
        exit={{ y: reduceMotion ? 0 : '100%' }}
        transition={panelTransition}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable feed — native scroll, isolated from gallery */}
        <div
          ref={feedRef}
          className={styles.feed}
          onWheel={handleFeedWheel}
        >
          {orderedProjects.map((project, i) => (
            <FeedItem
              key={project.id}
              project={project}
              isEntry={i === 0}
              fromGallery={fromGallery}
              onEntryImageChange={i === 0 ? setCurrentEntryImageUrl : undefined}
              isMobile={isMobile}
            />
          ))}
        </div>
      </motion.div>

      {/* Back to Gallery — fixed bottom-right */}
      <button
        type="button"
        className={styles.backToGallery}
        onClick={onClose}
        aria-label="Back to Gallery"
      >
        <span className={styles.backToGalleryArrow} aria-hidden>←</span>
      </button>
    </motion.div>
  )
}
