/** Prefetch image/video URLs before dismissing page loaders. */

export type PreloadTarget = {
  src: string
  type?: 'image' | 'video'
  /** Prefer poster for video covers when available. */
  poster?: string
}

const DEFAULT_TIMEOUT_MS = 8000
/** Keep Rive/canvas responsive — never open the floodgates. */
const DEFAULT_CONCURRENCY = 2

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

/** Yield so the browser can paint / run the Rive rAF loop. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 0)
      })
      return
    }
    window.setTimeout(resolve, 0)
  })
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Avoid img.decode() — it can stall the main thread while Rive is animating.
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function preloadVideo(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      try {
        video.load()
      } catch {
        /* ignore */
      }
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

    // metadata is enough to prove the asset is reachable without decoding frames.
    video.addEventListener('loadedmetadata', onReady, { once: true })
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

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return
  const limit = Math.max(1, Math.min(concurrency, items.length))
  let next = 0

  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        await worker(items[index]!)
      } catch {
        /* ignore individual failures */
      }
      await yieldToBrowser()
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()))
}

/**
 * Wait until the given media URLs are ready (or timeout).
 * Failures are ignored so one bad asset cannot trap the loader.
 * Concurrency is capped so the loading animation stays smooth.
 */
export async function preloadMedia(
  targets: PreloadTarget[],
  options?: { timeoutMs?: number; concurrency?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
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

  await withTimeout(mapPool(unique, concurrency, preloadOne), timeoutMs)
}
