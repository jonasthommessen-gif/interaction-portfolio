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

function normalizeRotation(deg: number): number {
  let r = deg % 360
  if (r < 0) r += 360
  return r
}

const MIN_SCALE = 1
const MAX_SCALE = 3

interface AdjustCropModalProps {
  open: boolean
  onClose: () => void
  /** Second arg is scale when > 1; third arg is rotation in degrees when !== 0. Callers that don't support them can ignore. */
  onSave: (objectPosition: string, objectScale?: number, objectRotation?: number) => void
  src: string
  type: 'image' | 'video'
  initialObjectPosition?: string
  /** When true, show zoom slider and pass scale to onSave (project cover). */
  enableZoom?: boolean
  /** Initial zoom (1 = no zoom). Used when enableZoom is true. */
  initialScale?: number
  /** When true, show rotate buttons and pass rotation to onSave (project cover). */
  enableRotation?: boolean
  /** Initial rotation in degrees (0 = none). Used when enableRotation is true. */
  initialRotation?: number
  /** Aspect ratio of the frame (e.g. '16/10' for project card). Default '16/10'. */
  aspectRatio?: string
  /** Short label above the frame, e.g. "Project card on the site". */
  frameLabel?: string
}

export function AdjustCropModal({
  open,
  onClose,
  onSave,
  src,
  type,
  initialObjectPosition = '50% 50%',
  enableZoom = false,
  initialScale = 1,
  enableRotation = false,
  initialRotation = 0,
  aspectRatio = '16/10',
  frameLabel,
}: AdjustCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() => parseObjectPosition(initialObjectPosition))
  const [scale, setScale] = useState(() => Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale)))
  const [rotation, setRotation] = useState(() => normalizeRotation(initialRotation))
  const [dragging, setDragging] = useState(false)
  const lastClientRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (open) {
      setPosition(parseObjectPosition(initialObjectPosition))
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale)))
      setRotation(normalizeRotation(initialRotation))
    }
  }, [open, initialObjectPosition, initialScale, initialRotation])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    lastClientRef.current = { x: e.clientX, y: e.clientY }
    const frame = frameRef.current
    if (frame?.setPointerCapture) frame.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const frame = frameRef.current
    if (frame?.releasePointerCapture) frame.releasePointerCapture(e.pointerId)
    setDragging(false)
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
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragging])

  const handleSave = useCallback(() => {
    const posStr = formatObjectPosition(position.x, position.y)
    const scaleToSave = enableZoom && scale > 1 ? scale : undefined
    const rotationToSave = enableRotation && rotation !== 0 ? rotation : undefined
    onSave(posStr, scaleToSave, rotationToSave)
    onClose()
  }, [position, scale, rotation, enableZoom, enableRotation, onSave, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  if (!open) return null

  const positionStr = formatObjectPosition(position.x, position.y)
  const useTransform = (enableZoom && scale > 1) || (enableRotation && rotation !== 0)
  const mediaStyle = useTransform
    ? (() => {
        const rot = enableRotation && rotation !== 0 ? `rotate(${rotation}deg) ` : ''
        const scalePart = enableZoom && scale > 1 ? `scale(${scale}) ` : ''
        const translatePart =
          enableZoom && scale > 1
            ? `translate(${(50 - position.x) / scale}%, ${(50 - position.y) / scale}%)`
            : `translate(${50 - position.x}%, ${50 - position.y}%)`
        return {
          transformOrigin: '50% 50%',
          transform: `${rot}${scalePart}${translatePart}`.trim(),
        }
      })()
    : { objectPosition: positionStr }

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
        {frameLabel && <p className={styles.frameLabel}>{frameLabel}</p>}
        <div
          ref={frameRef}
          className={styles.frame}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: dragging ? 'grabbing' : 'grab', aspectRatio }}
        >
          {type === 'video' ? (
            <video
              src={src}
              muted
              playsInline
              className={styles.media}
              style={mediaStyle as React.CSSProperties}
            />
          ) : (
            <img
              src={src}
              alt=""
              className={styles.media}
              style={mediaStyle as React.CSSProperties}
              draggable={false}
            />
          )}
        </div>
        {enableZoom && (
          <div className={styles.zoomRow}>
            <label className={styles.zoomLabel} htmlFor="adjust-crop-zoom">
              Zoom
            </label>
            <input
              id="adjust-crop-zoom"
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.1}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className={styles.zoomSlider}
            />
            <span className={styles.zoomValue}>{scale.toFixed(1)}×</span>
          </div>
        )}
        {enableRotation && (
          <div className={styles.rotateRow}>
            <span className={styles.rotateLabel}>Rotate</span>
            <button
              type="button"
              className={styles.rotateBtn}
              onClick={() => setRotation((r) => normalizeRotation(r - 90))}
              aria-label="Rotate left 90°"
            >
              ↶ 90°
            </button>
            <button
              type="button"
              className={styles.rotateBtn}
              onClick={() => setRotation((r) => normalizeRotation(r + 90))}
              aria-label="Rotate right 90°"
            >
              90° ↷
            </button>
            <span className={styles.rotateValue}>{rotation}°</span>
          </div>
        )}
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
