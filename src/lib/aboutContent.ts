export type AboutPortrait = {
  src: string
  alt?: string
  order: number
}

export type AboutSkill = {
  label: string
  order: number
}

export const DEFAULT_ABOUT_TITLE =
  "Hi, I'm Jonas Thommessen, an interaction and product designer based in Norway."

export const DEFAULT_ABOUT_BODY: string[] = [
  'I work across strategy and interaction design, focusing on making complexity navigable.',
  "Interfaces don't exist on their own. They're shaped by context, limitations, and the way people make sense of what they see. My practice is about clarifying those relationships, making information frictionless to navigate and decisions easier to understand.",
]

export const DEFAULT_ABOUT_SKILLS: AboutSkill[] = [
  { label: 'Systems thinking', order: 0 },
  { label: 'UX', order: 1 },
  { label: 'UI', order: 2 },
  { label: 'Products', order: 3 },
  { label: 'Prototyping', order: 4 },
  { label: 'Motion', order: 5 },
]

function isPortrait(v: unknown): v is AboutPortrait {
  if (!v || typeof v !== 'object') return false
  const o = v as AboutPortrait
  return typeof o.src === 'string' && typeof o.order === 'number'
}

function isSkill(v: unknown): v is AboutSkill {
  if (!v || typeof v !== 'object') return false
  const o = v as AboutSkill
  return typeof o.label === 'string' && typeof o.order === 'number'
}

export function normalizeAboutPortraits(
  raw: unknown,
  legacySrc?: string | null,
  legacyAlt?: string | null,
): AboutPortrait[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .filter(isPortrait)
      .map((p) => ({ src: p.src.trim(), alt: p.alt?.trim() || undefined, order: p.order }))
      .filter((p) => p.src)
      .sort((a, b) => a.order - b.order)
  }
  const src = legacySrc?.trim()
  if (src) {
    return [{ src, alt: legacyAlt?.trim() || undefined, order: 0 }]
  }
  return []
}

export function normalizeAboutSkills(raw: unknown): AboutSkill[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_ABOUT_SKILLS]
  const skills = raw
    .filter(isSkill)
    .map((s) => ({ label: s.label.trim(), order: s.order }))
    .filter((s) => s.label)
    .sort((a, b) => a.order - b.order)
  return skills.length ? skills : [...DEFAULT_ABOUT_SKILLS]
}

export function normalizeAboutBody(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_ABOUT_BODY]
  const paragraphs = raw.map((p) => String(p).trim()).filter(Boolean)
  return paragraphs.length ? paragraphs : [...DEFAULT_ABOUT_BODY]
}

export function normalizeAboutTitle(raw: string | null | undefined): string {
  const t = raw?.trim()
  return t || DEFAULT_ABOUT_TITLE
}
