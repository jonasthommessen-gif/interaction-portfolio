import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './AdjustCropModal.module.css'

function parseObjectPosition(s: string | undefined): { x: number; y: number } {
  if (!s?.trim()) return { x: 50, y: 50 }
  const parts = s.trim().split(/\s+/)
  const x = parseFloat(parts[0])
  const y = parseFloat(parts[1])
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  return { x: 50, y: 50 }
}

function formatObjectPosition(x: number, y: number): string {
  return `${Math.round(Math.max(0, Math.min(100, x)))}% ${Math.round(Math.max(0, Math.min(100, y)))}%`
}

interface AdjustCropModalProps {
  open: boolean
  onClose: () => void
  onSave: (objectPosition: string) => void
  src: string
  type: 'image' | 'video'
  initialObjectPosition?: string
}

export function AdjustCropModal({
  open,
  onClose,
  onSave,
  src,
  type,
  initialObjectPosition = '50% 50%',
}: AdjustCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() => parseObjectPosition(initialObjectPosition))
  const [dragging, setDragging] = useState(false)
  const lastClientRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (open) setPosition(parseObjectPosition(initialObjectPosition))
  }, [open, initialObjectPosition])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    lastClientRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: PointerEvent) => {
      const frame = frameRef.current
      if (!frame) return
      const dx = e.clientX - lastClientRef.current.x
      const dy = e.clientY - lastClientRef.current.y
      lastClientRef.current = { x: e.clientX, y: e.clientY }
      setPosition((prev) => {
        const rect = frame.getBoundingClientRect()
        const percentPerPxX = 100 / rect.width
        const percentPerPxY = 100 / rect.height
        return {
          x: prev.x + dx * percentPerPxX,
          y: prev.y + dy * percentPerPxY,
        }
      })
    }
    const handleUp = () => setDragging(false)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragging])

  const handleSave = useCallback(() => {
    onSave(formatObjectPosition(position.x, position.y))
    onClose()
  }, [position, onSave, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  if (!open) return null

  const positionStr = formatObjectPosition(position.x, position.y)

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-crop-title"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.modal}>
        <h3 id="adjust-crop-title" className={styles.title}>
          Adjust position
        </h3>
        <p className={styles.hint}>
          Drag the image or video inside the frame to choose how it will be cropped in the feed.
        </p>
        <div
          ref={frameRef}
          className={styles.frame}
          onPointerDown={handlePointerDown}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          {type === 'video' ? (
            <video
              src={src}
              muted
              playsInline
              className={styles.media}
              style={{ objectPosition: positionStr }}
            />
          ) : (
            <img
              src={src}
              alt=""
              className={styles.media}
              style={{ objectPosition: positionStr }}
              draggable={false}
            />
          )}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
