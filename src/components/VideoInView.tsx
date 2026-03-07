import { useEffect, useRef } from 'react'

interface VideoInViewProps {
  src: string
  className?: string
  poster?: string
  /** Optional width/height for layout (e.g. 800, 600) */
  width?: number
  height?: number
}

/**
 * Video that autoplays (muted, loop) when in viewport and pauses when out.
 * Use for gallery/project card covers.
 */
export function VideoInView({ src, className, poster, width, height }: VideoInViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== video) continue
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        }
      },
      { threshold: 0.25, rootMargin: '50px' }
    )
    io.observe(video)
    return () => io.disconnect()
  }, [src])

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      width={width}
      height={height}
      draggable={false}
      aria-hidden
    />
  )
}
