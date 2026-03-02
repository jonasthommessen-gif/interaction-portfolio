/**
 * Compute average luminance (0–255) of an image from its URL.
 * Used to decide whether to invert the navbar logo over Archive Feed images.
 * Returns a promise; rejects or returns 0 if image cannot be read (e.g. CORS).
 */
const LUMINANCE_THRESHOLD = 128

export function isImageBright(luminance: number): boolean {
  return luminance >= LUMINANCE_THRESHOLD
}

export function getImageAverageLuminance(url: string): Promise<number> {
  return new Promise<number>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 64
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(0)
          return
        }
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let sum = 0
        const len = data.length
        for (let i = 0; i < len; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          sum += 0.299 * r + 0.587 * g + 0.114 * b
        }
        const pixelCount = len / 4
        const avg = pixelCount > 0 ? sum / pixelCount : 0
        resolve(avg)
      } catch {
        resolve(0)
      }
    }
    img.onerror = () => resolve(0)
    img.src = url
  })
}
