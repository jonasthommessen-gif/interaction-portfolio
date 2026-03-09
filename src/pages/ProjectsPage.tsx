import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVisibleProjects } from '../lib/cms'
import type { Project } from '../types/cms'
import { VideoInView } from '../components/VideoInView'
import styles from './ProjectsPage.module.css'

type RGB = readonly [number, number, number]

function hexToRgb(hex: string): RGB {
  const raw = hex.replace('#', '').trim()
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return [r, g, b]
}

function rgbToHex([r, g, b]: RGB): `#${string}` {
  const to2 = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t)
  return [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])] as const
}

function relativeLuminance([r, g, b]: RGB) {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const rl = toLinear(r)
  const gl = toLinear(g)
  const bl = toLinear(b)
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function pickTextColor(bgHex: string) {
  const lum = relativeLuminance(hexToRgb(bgHex))
  return lum > 0.58 ? '#0b0c10' : '#ffffff'
}

function parseObjectPosition(s: string | undefined): [number, number] {
  if (!s?.trim()) return [50, 50]
  const parts = s.trim().split(/\s+/)
  const x = parseFloat(parts[0])
  const y = parseFloat(parts[1])
  if (Number.isFinite(x) && Number.isFinite(y)) return [x, y]
  return [50, 50]
}

function coverMediaStyle(cover: Project['cover']): React.CSSProperties {
  const scale = cover.objectScale ?? 1
  const rotation = cover.objectRotation ?? 0
  const pos = cover.objectPosition ?? '50% 50%'
  const [x, y] = parseObjectPosition(pos)
  if (scale > 1 || rotation !== 0) {
    const rot = rotation !== 0 ? `rotate(${rotation}deg) ` : ''
    const scalePart = scale > 1 ? `scale(${scale}) ` : ''
    const div = scale > 1 ? scale : 1
    const tx = (50 - x) / div
    const ty = (50 - y) / div
    return {
      transformOrigin: '50% 50%',
      transform: `${rot}${scalePart}translate(${tx}%, ${ty}%)`.trim(),
    }
  }
  return { objectPosition: pos }
}

function derivePillBg(fromHex: string, toHex: string) {
  const from = hexToRgb(fromHex)
  const to = hexToRgb(toHex)
  const base = mixRgb(from, to, 0.5)
  const lum = relativeLuminance(base)

  // If base is dark, lighten. If base is light, darken.
  const target = lum < 0.35 ? ([255, 255, 255] as const) : ([0, 0, 0] as const)
  const strength = lum < 0.35 ? 0.3 : 0.35
  return rgbToHex(mixRgb(base, target, strength))
}

type PillTheme = {
  bg: string
  fg: string
}

function getImageAverageRgb(src: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }

        // Sample a tiny version for speed
        const w = 12
        const h = 12
        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)

        let r = 0
        let g = 0
        let b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 8) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count += 1
        }

        if (!count) {
          resolve(null)
          return
        }

        resolve([Math.round(r / count), Math.round(g / count), Math.round(b / count)] as const)
      } catch {
        resolve(null)
      }
    }

    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [pillThemes, setPillThemes] = useState<Record<string, PillTheme>>({})

  useEffect(() => {
    fetchVisibleProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  const columns = 3
  const rows = Math.ceil(projects.length / columns)

  const activeIndex = useMemo(() => {
    if (!activeSlug) return -1
    return projects.findIndex((p) => p.slug === activeSlug)
  }, [activeSlug, projects])

  const activeRow = activeIndex >= 0 ? Math.floor(activeIndex / columns) : null
  const activeCol = activeIndex >= 0 ? activeIndex % columns : null
  const hasActive = activeRow !== null && activeCol !== null

  // Derive pill colors from each cover image (placeholder approach)
  useEffect(() => {
    let cancelled = false

    async function run() {
      const entries = await Promise.all(
        projects.map(async (p) => {
          if (p.cover.type !== 'image') return [p.slug, null] as const

          const avg = await getImageAverageRgb(p.cover.src)
          if (!avg) return [p.slug, null] as const

          // Create a pill bg slightly nudged toward black/white for contrast
          const lum = relativeLuminance(avg)
          const target = lum < 0.35 ? ([255, 255, 255] as const) : ([0, 0, 0] as const)
          const strength = lum < 0.35 ? 0.26 : 0.34
          const pillBg = rgbToHex(mixRgb(avg, target, strength))
          const pillFg = pickTextColor(pillBg)

          return [p.slug, { bg: pillBg, fg: pillFg }] as const
        }),
      )

      if (cancelled) return

      const map: Record<string, PillTheme> = {}
      for (const [slug, theme] of entries) {
        if (theme) map[slug] = theme
      }

      setPillThemes(map)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [projects])

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <h1 className="title">Projects</h1>
          <p className={styles.skeleton}>Loading projects…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="title">Projects</h1>
        <p className={styles.intro}>
          A selection of larger projects developed through extended research and
          design work.
        </p>

        <div
          className={styles.mosaic}
          data-has-active={hasActive}
          onPointerLeave={() => setActiveSlug(null)}
          onBlurCapture={(e) => {
            const next = e.relatedTarget
            if (!next) return
            if (!(e.currentTarget instanceof HTMLElement)) return
            if (!e.currentTarget.contains(next as Node)) setActiveSlug(null)
          }}
        >
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const rowProjects = projects.slice(
              rowIndex * columns,
              rowIndex * columns + columns,
            )

            const rowKey = rowProjects.map((p) => p.slug).join('|')

            const rowGrow = !hasActive ? 1 : rowIndex === activeRow ? 1.35 : 0.65

            return (
              <div
                key={rowKey}
                className={styles.row}
                style={{
                  ['--row-grow' as string]: rowGrow,
                }}
              >
                {rowProjects.map((project, colIndex) => {
                  const isFirstCard = rowIndex === 0 && colIndex === 0
                  const isActive = project.slug === activeSlug
                  const inActiveRow = hasActive && rowIndex === activeRow

                  const cardGrow = !hasActive
                    ? 1
                    : inActiveRow
                      ? colIndex === activeCol
                        ? 2.2
                        : 0.8
                      : 1

                  const fallbackPillBg = derivePillBg(
                    project.gradient.from,
                    project.gradient.to,
                  )

                  const pillBg = pillThemes[project.slug]?.bg ?? fallbackPillBg
                  const pillFg = pillThemes[project.slug]?.fg ?? pickTextColor(pillBg)

                  const cardStyle = {
                    ['--card-grow' as string]: cardGrow,
                    ['--card-gradient' as string]: `linear-gradient(135deg, ${project.gradient.from}, ${project.gradient.to})`,
                    ['--pill-bg' as string]: pillBg,
                    ['--pill-fg' as string]: pillFg,
                  } as React.CSSProperties

                  return (
                    <Link
                      key={project.slug}
                      to={`/projects/${project.slug}`}
                      className={styles.card}
                      data-active={isActive}
                      style={cardStyle}
                      onPointerEnter={() => setActiveSlug(project.slug)}
                      onFocus={() => setActiveSlug(project.slug)}
                      aria-label={`Open project: ${project.title}`}
                    >
                      <div className={styles.cardInner}>
                        {project.cover.type === 'video' ? (
                          <VideoInView
                            src={project.cover.src}
                            poster={project.cover.poster}
                            className={styles.media}
                            style={coverMediaStyle(project.cover)}
                          />
                        ) : (
                          <img
                            className={styles.media}
                            src={project.cover.src}
                            alt={project.cover.alt}
                            width={800}
                            height={600}
                            loading={isFirstCard ? 'eager' : 'lazy'}
                            fetchPriority={isFirstCard ? 'high' : undefined}
                            style={coverMediaStyle(project.cover)}
                          />
                        )}

                        <div className={styles.meta}>
                          <div className={styles.pills}>
                            {project.categories.map((c) => (
                              <span key={c} className={styles.pill}>
                                {c}
                              </span>
                            ))}
                          </div>
                          <h2 className={styles.title}>{project.title}</h2>
                          <p className={styles.categoriesLine}>
                            {project.categories.join(' · ')}
                          </p>
                        </div>
                      </div>

                      <div className={styles.metaBelow}>
                        <h2 className={styles.metaBelowTitle}>
                          {project.title}
                        </h2>
                        <p className={styles.metaBelowCategories}>
                          {project.categories.join(' · ')}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
