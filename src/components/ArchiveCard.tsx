import { useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import type { ArchiveProject } from '../types/cms'
import { VideoInView } from './VideoInView'
import styles from './ArchiveCard.module.css'

export type DepthLayer = 1 | 2 | 3

interface ArchiveCardProps {
  project: ArchiveProject
  /** Gallery instance title (may differ from project.title when post spawns multiple times). */
  displayTitle?: string
  /** Override cover src for this gallery instance. */
  coverSrc?: string
  coverType?: 'image' | 'video'
  /** 1 = foreground, 2 = mid, 3 = background */
  depth: DepthLayer
  /** Whether this card is currently focused */
  isFocused: boolean
  /** Whether any card is focused (suppresses interaction on non-focused cards) */
  anyFocused: boolean
  /** Hover name callback */
  onHover: (title: string | null) => void
  onClick: () => void
  /** Unique layoutId for shared element transition */
  layoutId: string
  /** When true, disables idle float animation (e.g. for mobile grid) */
  disableFloat?: boolean
}

export function ArchiveCard({
  project,
  displayTitle,
  coverSrc,
  coverType,
  isFocused,
  anyFocused,
  onHover,
  onClick,
  layoutId,
  disableFloat = false,
}: ArchiveCardProps) {
  const title = displayTitle ?? project.title
  const cover = coverSrc ?? project.cover
  const isVideo =
    coverType === 'video' ||
    (coverType == null &&
      project.media?.find((m) => m.src === cover)?.type === 'video')
  const controls = useAnimationControls()
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Idle float animation — gentle bob and tilt (±3px y, ±0.5deg)
  // Skipped when disableFloat (e.g. mobile grid) so photos stay still
  useEffect(() => {
    if (disableFloat) return
    mountedRef.current = true

    let cardNum = 0
    for (let i = 0; i < layoutId.length; i++) {
      cardNum = (cardNum + layoutId.charCodeAt(i)) % 1000
    }
    const staggerMs = cardNum * 28

    idleRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      controls.start({
        y: [0, -3, 0, 3, 0],
        rotate: [0, 0.5, 0, -0.5, 0],
        transition: {
          duration: 6 + (cardNum % 4),
          repeat: Infinity,
          ease: 'easeInOut',
        },
      })
    }, staggerMs)

    return () => {
      mountedRef.current = false
      if (idleRef.current) clearTimeout(idleRef.current)
      controls.stop()
    }
  }, [controls, layoutId, disableFloat])

  // Stop idle when any card is focused
  useEffect(() => {
    if (anyFocused) {
      controls.stop()
      controls.set({ y: 0, rotate: 0 })
    }
  }, [anyFocused, controls])

  const suppressedByFocus = anyFocused && !isFocused

  return (
    <motion.div
      layoutId={layoutId}
      className={styles.card}
      animate={controls}
      initial={{ y: 0, rotate: 0 }}
      style={{
        opacity: suppressedByFocus ? 0.15 : 1,
        pointerEvents: suppressedByFocus ? 'none' : 'auto',
        transition: 'opacity 400ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      whileHover={
        !anyFocused
          ? { scale: 1.04, transition: { duration: 0.2 } }
          : undefined
      }
      onClick={!anyFocused ? onClick : undefined}
      onHoverStart={() => !anyFocused && onHover(title)}
      onHoverEnd={() => onHover(null)}
    >
      {isVideo ? (
        <VideoInView
          src={cover}
          className={styles.image}
          width={800}
          height={600}
        />
      ) : (
        <img
          className={styles.image}
          src={cover}
          alt={title}
          width={800}
          height={600}
          loading="lazy"
          draggable={false}
        />
      )}
      <div className={styles.overlay} />
    </motion.div>
  )
}
