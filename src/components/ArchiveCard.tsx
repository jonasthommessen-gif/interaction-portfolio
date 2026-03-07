import { useEffect, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import type { ArchiveProject } from '../types/cms'
import { VideoInView } from './VideoInView'
import styles from './ArchiveCard.module.css'

export type DepthLayer = 1 | 2 | 3

interface ArchiveCardProps {
  project: ArchiveProject
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
  isFocused,
  anyFocused,
  onHover,
  onClick,
  layoutId,
  disableFloat = false,
}: ArchiveCardProps) {
  const controls = useAnimationControls()
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  // Idle float animation — gentle bob and tilt (±3px y, ±0.5deg)
  // Skipped when disableFloat (e.g. mobile grid) so photos stay still
  useEffect(() => {
    if (disableFloat) return
    mountedRef.current = true

    const cardNum = parseInt(project.id.replace('arc-', ''), 10) - 1
    const staggerMs = cardNum * 280

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
  }, [controls, project.id, disableFloat])

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
      onHoverStart={() => !anyFocused && onHover(project.title)}
      onHoverEnd={() => onHover(null)}
    >
      {project.media?.[0]?.src === project.cover && project.media[0].type === 'video' ? (
        <VideoInView
          src={project.cover}
          className={styles.image}
          width={800}
          height={600}
        />
      ) : (
        <img
          className={styles.image}
          src={project.cover}
          alt={project.title}
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
