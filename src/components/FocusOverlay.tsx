import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ArchiveProject } from '../content/archiveProjects'
import styles from './FocusOverlay.module.css'

interface FocusOverlayProps {
  project: ArchiveProject
  projectIndex: number
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
}

/**
 * FocusOverlay — the 3-step focus sequence:
 *
 * Step 1: Project elevation (card moves to center, background blurs)
 * Step 2: White card slides up from below (under the image)
 * Step 3: Shelf effect — image shifts up as if resting on the white card
 *
 * Exit reverses the sequence.
 */
export function FocusOverlay({
  project,
  projectIndex,
  onClose,
  onNavigate,
}: FocusOverlayProps) {
  // Which image in the carousel is active
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselDirection, setCarouselDirection] = useState<1 | -1>(1)

  // Animation step: 1 = elevation, 2 = white card emerging, 3 = shelf settled
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const whiteCardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Sequence the 3 steps on mount
  useEffect(() => {
    // Step 1 → Step 2 after 500ms
    const t1 = setTimeout(() => setStep(2), 500)
    // Step 2 → Step 3 after white card animation completes (~400ms more)
    const t2 = setTimeout(() => setStep(3), 950)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // Reset carousel when project changes
  useEffect(() => {
    setCarouselIndex(0)
  }, [project.id])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handleCarouselPrev()
      if (e.key === 'ArrowRight') handleCarouselNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, carouselIndex, project.images.length])

  const handleCarouselNext = useCallback(() => {
    setCarouselDirection(1)
    setCarouselIndex((i) => (i + 1) % project.images.length)
  }, [project.images.length])

  const handleCarouselPrev = useCallback(() => {
    setCarouselDirection(-1)
    setCarouselIndex((i) => (i - 1 + project.images.length) % project.images.length)
  }, [project.images.length])

  // Click outside white card to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (whiteCardRef.current && !whiteCardRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  // Image position based on step:
  // Step 1: centered, slightly scaled up
  // Step 2: same (white card slides under)
  // Step 3: shifted up (shelf effect)
  const imageVariants = {
    step1: { y: 0, scale: 1.07, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' },
    step2: { y: 0, scale: 1.07, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' },
    step3: { y: -20, scale: 1.0, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' },
  }

  const currentImageVariant = step === 3 ? 'step3' : step === 2 ? 'step2' : 'step1'

  return (
    <motion.div
      ref={overlayRef}
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleBackdropClick}
    >
      {/* Project navigation arrows (outside white card) */}
      <button
        className={`${styles.projectNav} ${styles.projectNavLeft}`}
        onClick={(e) => { e.stopPropagation(); onNavigate('prev') }}
        aria-label="Previous project"
      >
        ‹
      </button>
      <button
        className={`${styles.projectNav} ${styles.projectNavRight}`}
        onClick={(e) => { e.stopPropagation(); onNavigate('next') }}
        aria-label="Next project"
      >
        ›
      </button>

      {/* White card container */}
      <motion.div
        ref={whiteCardRef}
        className={styles.whiteCard}
        initial={{ y: '100%' }}
        animate={step >= 2 ? { y: 0 } : { y: '100%' }}
        exit={{ y: '100%' }}
        transition={{
          type: 'tween',
          ease: [0.22, 1, 0.36, 1],
          duration: 0.45,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image section — sits on top of white card, shifts up in step 3 */}
        <motion.div
          className={styles.imageSection}
          animate={imageVariants[currentImageVariant]}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 28,
          }}
        >
          {/* Carousel image with crossfade */}
          <div className={styles.carouselWrapper}>
            <AnimatePresence mode="wait" custom={carouselDirection}>
              <motion.img
                key={`${project.id}-${carouselIndex}`}
                className={styles.carouselImage}
                src={project.images[carouselIndex]}
                alt={`${project.title} — image ${carouselIndex + 1}`}
                custom={carouselDirection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                draggable={false}
              />
            </AnimatePresence>

            {/* Carousel arrows — inside the image, fade on hover */}
            {project.images.length > 1 && (
              <>
                <button
                  className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
                  onClick={handleCarouselPrev}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
                  onClick={handleCarouselNext}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            {/* Dot indicators */}
            {project.images.length > 1 && (
              <div className={styles.dots}>
                {project.images.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${i === carouselIndex ? styles.dotActive : ''}`}
                    onClick={() => {
                      setCarouselDirection(i > carouselIndex ? 1 : -1)
                      setCarouselIndex(i)
                    }}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Text content — visible in step 3 */}
        <motion.div
          className={styles.textSection}
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= 3 ? 1 : 0 }}
          transition={{ duration: 0.3, delay: step >= 3 ? 0.1 : 0 }}
        >
          <h2 className={styles.title}>{project.title}</h2>
          <p className={styles.description}>{project.description}</p>
          <div className={styles.tags}>
            {project.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Project counter */}
      <div className={styles.counter}>
        Archive project: nr {projectIndex + 1}
      </div>
    </motion.div>
  )
}
