import type { MotionParams } from '../params'
import type { MotionMode, Dims, ModeContext } from '../types'
import type { MotionDerivedState } from '../../state/types'
import { clamp01, damp, lerp } from '../../utils/lerp'

/**
 * Reference-texture field for `.speedCardParticleField`.
 * Seven strips — aligned joins, opacity-layered seams, single merged stack.
 */

const BASE = import.meta.env.BASE_URL
const STRIP_URLS = [
  `${BASE}motion/charging-field-strip-01.png`,
  `${BASE}motion/charging-field-strip-02.png`,
  `${BASE}motion/charging-field-strip-03.png`,
  `${BASE}motion/charging-field-strip-04.png`,
  `${BASE}motion/charging-field-strip-05.png`,
  `${BASE}motion/charging-field-strip-06.png`,
  `${BASE}motion/charging-field-strip-07.png`,
] as const

const VISUALLY_IDLE_INTENSITY = 0.06

const STRIP_SEGMENT_H = 1024
const STRIP_TARGET_W = 677
const VERTICAL_STRETCH = 7
const STRETCHED_SEGMENT_H = Math.floor(STRIP_SEGMENT_H * VERTICAL_STRETCH)

const KNOCKOUT_LUM_MIN = 0.04
const KNOCKOUT_LUM_MAX = 0.3

/** Large overlap + alignment — seams from mismatched AI strips must not read as lines. */
const JOIN_BLEND_FRAC = 0.45
const LOOP_BLEND_FRAC = 0.28
const ALIGN_SHIFT_MAX = 28

const BRIGHT_LUM_MIN = 0.2
const BRIGHT_LUM_MAX = 0.42

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function pixelLuminance(r: number, g: number, b: number) {
  return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
}


function knockOutDarkBackground(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const lum = pixelLuminance(data[i]!, data[i + 1]!, data[i + 2]!)
    const filamentAlpha = smoothstep(KNOCKOUT_LUM_MIN, KNOCKOUT_LUM_MAX, lum)
    const deepVeil = smoothstep(0, 0.14, lum) * 0.2
    data[i + 3] = Math.round(Math.min(1, filamentAlpha + deepVeil) * 255)
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function extractBrightLayer(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d')
  if (!ctx) return source

  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, out.width, out.height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const lum = pixelLuminance(data[i]!, data[i + 1]!, data[i + 2]!)
    const keep = smoothstep(BRIGHT_LUM_MIN, BRIGHT_LUM_MAX, lum)
    data[i + 3] = Math.round(data[i + 3]! * keep)
  }

  ctx.putImageData(imageData, 0, 0)
  return out
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}

function stretchAndFitWidth(strip: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = STRIP_TARGET_W
  out.height = STRETCHED_SEGMENT_H
  const ctx = out.getContext('2d')
  if (!ctx) return strip

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(strip, 0, 0, strip.width, strip.height, 0, 0, out.width, out.height)
  return out
}

function findAlignShift(
  bottom: Uint8ClampedArray,
  bottomH: number,
  top: Uint8ClampedArray,
  w: number,
  overlap: number,
): number {
  let bestShift = 0
  let bestScore = Infinity

  for (let shift = -ALIGN_SHIFT_MAX; shift <= ALIGN_SHIFT_MAX; shift++) {
    let score = 0
    let count = 0

    for (let y = 0; y < overlap; y++) {
      const by = bottomH - overlap + y
      for (let x = 0; x < w; x++) {
        const tx = (x + shift + w) % w
        const bi = (by * w + x) * 4
        const ti = (y * w + tx) * 4

        const lb = pixelLuminance(bottom[bi]!, bottom[bi + 1]!, bottom[bi + 2]!)
        const lt = pixelLuminance(top[ti]!, top[ti + 1]!, top[ti + 2]!)
        const wa = Math.max(bottom[bi + 3]!, top[ti + 3]!) / 255
        if (wa < 0.04) continue

        score += ((lb - lt) ** 2) * wa
        count++
      }
    }

    if (count > 0) {
      const avg = score / count
      if (avg < bestScore) {
        bestScore = avg
        bestShift = shift
      }
    }
  }

  return bestShift
}

function topIndex(w: number, y: number, x: number, shift: number) {
  const tx = (x + shift + w) % w
  return (y * w + tx) * 4
}

function seamLayerOpacities(t: number): { bottom: number; top: number } {
  const top = smoothstep(0.06, 0.94, t)
  const bottom = 1 - smoothstep(0.06, 0.94, t)
  return { bottom, top }
}

/** Stack both layers in the overlap — each at its own opacity, additively (lighter). */
function layerOverlapPixel(
  d: Uint8ClampedArray,
  td: Uint8ClampedArray,
  oi: number,
  ti: number,
  t: number,
) {
  const { bottom: botW, top: topW } = seamLayerOpacities(t)

  for (let c = 0; c < 3; c++) {
    const bot = d[oi + c]! * botW
    const top = td[ti + c]! * topW
    d[oi + c] = Math.round(Math.min(255, bot + top - (bot * top) / 255))
  }

  const botA = (d[oi + 3]! / 255) * botW
  const topA = (td[ti + 3]! / 255) * topW
  d[oi + 3] = Math.round(Math.min(1, botA + topA) * 255)
}

function softenOverlapRows(d: Uint8ClampedArray, w: number, y0: number, y1: number) {
  const copy = new Uint8ClampedArray(d)

  for (let y = y0; y <= y1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 4; c++) {
        d[i + c] = Math.round(
          (copy[i - 4 + c]! + copy[i + c]! * 2 + copy[i + 4 + c]!) / 4,
        )
      }
    }
  }
}

function appendWithBlend(
  bottom: HTMLCanvasElement,
  top: HTMLCanvasElement,
  blendPx: number,
): HTMLCanvasElement {
  const w = bottom.width
  const overlap = Math.min(blendPx, bottom.height, top.height)
  const outH = bottom.height + top.height - overlap

  const out = document.createElement('canvas')
  out.width = w
  out.height = outH
  const octx = out.getContext('2d')
  if (!octx) return bottom

  octx.drawImage(bottom, 0, 0)
  const outData = octx.getImageData(0, 0, w, outH)
  const d = outData.data

  const tctx = top.getContext('2d')
  if (!tctx) return bottom
  const tFull = tctx.getImageData(0, 0, w, top.height)
  const td = tFull.data

  const shift = findAlignShift(d, bottom.height, td, w, overlap)
  const startY = bottom.height - overlap

  for (let y = 0; y < top.height; y++) {
    const outY = startY + y
    const t = y < overlap ? smoothstep(0, 1, y / overlap) : 1

    for (let x = 0; x < w; x++) {
      const oi = (outY * w + x) * 4
      const ti = topIndex(w, y, x, shift)

      if (y < overlap) {
        layerOverlapPixel(d, td, oi, ti, t)
      } else {
        for (let c = 0; c < 4; c++) {
          d[oi + c] = td[ti + c]!
        }
      }
    }
  }

  softenOverlapRows(d, w, startY, startY + overlap - 1)
  octx.putImageData(outData, 0, 0)
  return out
}

function buildSeamlessWrap(strip: HTMLCanvasElement, blendPx: number): HTMLCanvasElement {
  const srcW = strip.width
  const srcH = strip.height
  const overlap = Math.min(blendPx, Math.floor(srcH / 2))

  const loop = document.createElement('canvas')
  loop.width = srcW
  loop.height = srcH
  const lctx = loop.getContext('2d')
  if (!lctx) return strip

  lctx.drawImage(strip, 0, 0)
  const imageData = lctx.getImageData(0, 0, srcW, srcH)
  const d = imageData.data

  for (let y = 0; y < overlap; y++) {
    const t = smoothstep(0, 1, y / overlap)
    const botRow = srcH - overlap + y
    for (let x = 0; x < srcW; x++) {
      const ti = (y * srcW + x) * 4
      const bi = (botRow * srcW + x) * 4
      layerOverlapPixel(d, d, ti, bi, t)
    }
  }

  softenOverlapRows(d, srcW, 0, overlap - 1)
  softenOverlapRows(d, srcW, srcH - overlap, srcH - 1)

  lctx.putImageData(imageData, 0, 0)
  return loop
}

function buildStackedStrip(strips: HTMLCanvasElement[]): HTMLCanvasElement {
  if (strips.length === 0) {
    const empty = document.createElement('canvas')
    empty.width = STRIP_TARGET_W
    empty.height = 1
    return empty
  }

  const prepared = strips.map(stretchAndFitWidth)
  const segmentH = prepared[0]!.height
  const joinBlend = Math.max(128, Math.floor(segmentH * JOIN_BLEND_FRAC))
  const loopBlend = Math.max(96, Math.floor(segmentH * LOOP_BLEND_FRAC))

  let stack = prepared[0]!
  for (let i = 1; i < prepared.length; i++) {
    stack = appendWithBlend(stack, prepared[i]!, joinBlend)
  }

  return buildSeamlessWrap(stack, loopBlend)
}

type FieldTextures = {
  base: HTMLCanvasElement
  bright: HTMLCanvasElement
}

async function buildFieldTextures(): Promise<FieldTextures> {
  const images = await Promise.all(STRIP_URLS.map(loadImage))
  const knocked = images.map(knockOutDarkBackground)
  const base = buildStackedStrip(knocked)

  return {
    base,
    bright: extractBrightLayer(base),
  }
}

type TextureGrade = {
  alpha: number
  brightness: number
  contrast: number
  saturation: number
  scrollSpeed: number
  brightAlpha: number
}

type DensityLayer = {
  scrollMul: number
  phase: number
  alpha: number
  brightMul: number
}

function densityLayers(intensity: number): DensityLayer[] {
  const t = smoothstep(0.04, 0.92, intensity)
  const layers: DensityLayer[] = [{ scrollMul: 1, phase: 0, alpha: 1, brightMul: 1 }]

  if (t < 0.32) return layers

  const boost = smoothstep(0.32, 0.94, t)
  const extras: DensityLayer[] = [
    { scrollMul: 1.2, phase: 42, alpha: 0.52, brightMul: 1.12 },
    { scrollMul: 1.42, phase: 96, alpha: 0.4, brightMul: 1.26 },
    { scrollMul: 1.68, phase: 158, alpha: 0.3, brightMul: 1.42 },
    { scrollMul: 2.05, phase: 228, alpha: 0.22, brightMul: 1.65 },
  ]

  const count = Math.round(lerp(1, extras.length, boost))
  return [...layers, ...extras.slice(0, count)]
}

function textureGrade(intensity: number, speed: number): TextureGrade {
  const t = smoothstep(0.04, 0.92, intensity)
  const hi = Math.pow(t, 0.62)

  return {
    alpha: Math.max(0.34, lerp(0.3, 1.08, t)),
    brightness: lerp(0.8, 1.0, t),
    contrast: lerp(1.24, 1.62, t),
    saturation: lerp(0.84, 1.1, t),
    scrollSpeed:
      Math.max(90, lerp(90, 500, hi)) * lerp(0.95, 1.75, speed),
    brightAlpha: lerp(0.38, 0.92, hi),
  }
}

function drawFieldLayer(
  ctx: CanvasRenderingContext2D,
  dims: Dims,
  stackCanvas: HTMLCanvasElement,
  scrollY: number,
  grade: TextureGrade,
  alphaMul: number,
) {
  const alpha = grade.alpha * alphaMul
  if (alpha < 0.01) return

  const srcW = stackCanvas.width
  const srcH = stackCanvas.height
  const scale = Math.max(dims.w / srcW, dims.h / STRETCHED_SEGMENT_H)
  const sx = Math.max(0, (srcW - dims.w / scale) / 2)
  const sw = dims.w / scale
  const sh = dims.h / scale

  let sy = ((scrollY / scale) % srcH + srcH) % srcH

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  ctx.filter = `brightness(${grade.brightness}) contrast(${grade.contrast}) saturate(${grade.saturation})`

  let remaining = sh
  let destY = 0

  while (remaining > 0.001) {
    const sliceH = Math.min(remaining, srcH - sy)
    const destSliceH = sliceH * scale

    ctx.drawImage(stackCanvas, sx, sy, sw, sliceH, 0, destY, dims.w, destSliceH)

    remaining -= sliceH
    destY += destSliceH
    sy = 0
  }

  ctx.restore()
}

function drawDensityStack(
  ctx: CanvasRenderingContext2D,
  dims: Dims,
  textures: FieldTextures,
  scrollY: number,
  grade: TextureGrade,
  presence: number,
  intensity: number,
) {
  const layers = densityLayers(intensity)

  for (const layer of layers) {
    const layerScroll = scrollY * layer.scrollMul + layer.phase
    const layerPresence = presence * layer.alpha

    drawFieldLayer(ctx, dims, textures.base, layerScroll, grade, layerPresence)
    drawFieldLayer(
      ctx,
      dims,
      textures.bright,
      layerScroll * layer.brightMul,
      grade,
      grade.brightAlpha * layerPresence,
    )
  }
}

export function chargingFlowMode(): MotionMode<MotionParams, MotionDerivedState> {
  let fieldTextures: FieldTextures | null = null
  let loadStarted = false
  let scrollY = 0
  let smoothIntensity = 0.5
  let smoothSpeed = 0.5
  let smoothBrightness = 0.5

  const startTextureLoad = () => {
    if (loadStarted || typeof document === 'undefined') return
    loadStarted = true

    void buildFieldTextures()
      .then((textures) => {
        fieldTextures = textures
      })
      .catch(() => {
        loadStarted = false
      })
  }

  return {
    id: 'chargingFlow',
    init: () => {
      fieldTextures = null
      loadStarted = false
      scrollY = 0
      smoothIntensity = 0.5
      smoothSpeed = 0.5
      smoothBrightness = 0.5
      startTextureLoad()
    },

    update: (dt, params, derived) => {
      if (!fieldTextures && !loadStarted) startTextureLoad()

      smoothIntensity = damp(smoothIntensity, derived.intensity, 15, dt)
      smoothSpeed = damp(smoothSpeed, derived.speed, 16, dt)
      smoothBrightness = damp(smoothBrightness, derived.brightness, 14, dt)

      if (smoothIntensity < VISUALLY_IDLE_INTENSITY) return

      const grade = textureGrade(smoothIntensity, smoothSpeed)
      scrollY += grade.scrollSpeed * dt * (0.85 + params.motionSpeed * 0.45)
    },

    render: (ctx, dims, params, _derived, _modeCtx: ModeContext) => {
      ctx.clearRect(0, 0, dims.w, dims.h)

      if (!fieldTextures) {
        if (!loadStarted) startTextureLoad()
        return
      }

      const isVisuallyIdle = smoothIntensity < VISUALLY_IDLE_INTENSITY
      if (isVisuallyIdle) return

      const grade = textureGrade(smoothIntensity, smoothSpeed)
      const presence = lerp(0.88, 1, clamp01(params.brightness)) * lerp(0.86, 1, smoothBrightness)

      drawDensityStack(ctx, dims, fieldTextures, scrollY, grade, presence, smoothIntensity)

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.filter = 'none'
    },
  }
}
