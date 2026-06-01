import type { ArchiveProject } from '../types/cms'

/** One spawned card in the horizontal gallery (a post may appear up to 3 times). */
export type ArchiveGalleryEntry = {
  instanceId: string
  projectId: string
  displayTitle: string
  cover: string
  coverType: 'image' | 'video'
  objectFit?: string
  objectPosition?: string
}

const MAX_SPAWNS_PER_POST = 3
const MIN_CARD_GAP_PX = 160

type MediaItem = {
  type: 'image' | 'video'
  src: string
  alt?: string
  objectFit?: string
  objectPosition?: string
}

function pickUniqueTitle(
  project: ArchiveProject,
  media: MediaItem,
  index: number,
  used: Set<string>,
): string {
  const candidates: string[] = []
  if (media.alt?.trim()) candidates.push(media.alt.trim())
  if (project.tags[index]?.trim()) candidates.push(project.tags[index].trim())
  if (project.categories[index]?.trim()) candidates.push(project.categories[index].trim())
  for (const t of [...project.tags, ...project.categories]) {
    if (t?.trim()) candidates.push(t.trim())
  }
  if (index === 0) candidates.push(project.title)
  candidates.push(`${project.title} · ${index + 1}`)
  candidates.push(`${project.title} (${['I', 'II', 'III'][index] ?? index + 1})`)

  for (const c of candidates) {
    if (!used.has(c)) return c
  }
  let n = index + 1
  while (used.has(`${project.title} ${n}`)) n++
  return `${project.title} ${n}`
}

function collectUniqueMedia(project: ArchiveProject): MediaItem[] {
  const pool: MediaItem[] = []
  const seen = new Set<string>()

  const add = (item?: MediaItem) => {
    if (!item?.src || seen.has(item.src)) return
    seen.add(item.src)
    pool.push(item)
  }

  const coverFromMedia = project.media?.find((m) => m.src === project.cover)
  add(coverFromMedia ?? { type: 'image', src: project.cover })
  for (const m of project.media ?? []) add(m)

  return pool
}

/** Expand archive posts into gallery cards (up to 3 per post, unique cover + title each). */
export function buildArchiveGalleryEntries(projects: ArchiveProject[]): ArchiveGalleryEntry[] {
  const entries: ArchiveGalleryEntry[] = []

  for (const project of projects) {
    if (project.visible === false) continue

    const mediaPool = collectUniqueMedia(project)
    const variants = mediaPool.slice(0, MAX_SPAWNS_PER_POST)
    const usedTitles = new Set<string>()

    variants.forEach((media, i) => {
      const displayTitle = pickUniqueTitle(project, media, i, usedTitles)
      usedTitles.add(displayTitle)
      entries.push({
        instanceId: `${project.id}--${i}`,
        projectId: project.id,
        displayTitle,
        cover: media.src,
        coverType: media.type,
        objectFit: media.objectFit,
        objectPosition: media.objectPosition,
      })
    })
  }

  return entries
}

/** Loop width scales with card count so spacing stays scrollable. */
export function getArchiveLoopWidth(cardCount: number): number {
  if (cardCount <= 0) return 4000
  return Math.max(4000, cardCount * MIN_CARD_GAP_PX * 1.15)
}
