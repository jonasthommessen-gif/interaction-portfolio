/** Prefetch image/video URLs before dismissing page loaders. */

export type PreloadTarget = {
  src: string
  type?: 'image' | 'video'
  /** Prefer poster for video covers when available. */
  poster?: string
}

const DEFAULT_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      () => {
        window.clearTimeout(timer)
        resolve(undefined)
      },
    )
  })
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve(), () => resolve())
      } else {
        resolve()
      }
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function preloadVideo(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      video.remove()
    }

    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`Failed to load video: ${src}`))
    }

    video.addEventListener('loadeddata', onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.src = src
    video.load()
  })
}

async function preloadOne(target: PreloadTarget): Promise<void> {
  const src = target.src?.trim()
  if (!src) return

  if (target.type === 'video') {
    const poster = target.poster?.trim()
    if (poster) {
      await preloadImage(poster)
      return
    }
    await preloadVideo(src)
    return
  }

  await preloadImage(src)
}

/**
 * Wait until the given media URLs are ready (or timeout).
 * Failures are ignored so one bad asset cannot trap the loader.
 */
export async function preloadMedia(
  targets: PreloadTarget[],
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const seen = new Set<string>()
  const unique: PreloadTarget[] = []

  for (const target of targets) {
    const key = `${target.type ?? 'image'}|${target.poster?.trim() || target.src.trim()}`
    if (!target.src?.trim() && !target.poster?.trim()) continue
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(target)
  }

  if (unique.length === 0) return

  await withTimeout(
    Promise.allSettled(unique.map((t) => preloadOne(t))).then(() => undefined),
    timeoutMs,
  )
}
