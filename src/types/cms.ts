/**
 * Types for CMS data (Supabase). Used by admin and public site when reading from API.
 */

export const SECTION_LAYOUTS = [
  'text-only',
  'text-left-media-right',
  'media-left-text-right',
  'full-bleed-media',
  'media-above-text',
  'gallery-strip',
] as const

export type SectionLayoutKey = (typeof SECTION_LAYOUTS)[number]

/** Optional presentation flags stored in section `content` jsonb (no migration). */
export type SectionDisplayOptions = {
  /** When true, show the section nav label in the main column (sidebar label unchanged). Default false. */
  showSectionTitle?: boolean
  /**
   * When true with showSectionTitle, and the section is media-only (no body/heading),
   * show the section name above media/gallery. Otherwise in-content title stays with text or is hidden.
   */
  sectionTitleAboveMedia?: boolean
  /**
   * When true and `sideInfo` has content, show facts beside narrow body (desktop) or under it (mobile).
   * Supported layouts: `media-above-text`, `full-bleed-media`.
   */
  showSideInfo?: boolean
}

/** Partner / org logo row for section side info (URLs from storage or external). */
export type SectionSideInfoCollaborator = {
  logoSrc: string
  logoAlt: string
  name?: string
  url?: string
}

export type SectionSideInfoLink = {
  label: string
  href: string
}

/** Structured facts for the optional project section side column. */
export type SectionSideInfo = {
  overview?: string
  timeframe?: string
  /** Multiline or comma-separated; rendered as a list when possible. */
  participants?: string
  collaborators?: SectionSideInfoCollaborator[]
  role?: string
  tools?: string
  methods?: string
  location?: string
  links?: SectionSideInfoLink[]
}

/** Single image/video slot used for `media` and optional `mediaMobile`. */
export type SectionMediaAsset = {
  type: 'image' | 'video'
  src: string
  alt?: string
  poster?: string
  objectPosition?: string
  objectScale?: number
  objectRotation?: number
}

/** Content for a section; shape depends on layout (e.g. text + one image for text-left-media-right). */
export type SectionContent = {
  heading?: string
  body?: string
  media?: SectionMediaAsset
  /** Optional portrait-friendly asset; shown below 819px when set, instead of `media`. */
  mediaMobile?: SectionMediaAsset
  gallery?: { src: string; alt?: string; caption?: string }[]
  display?: SectionDisplayOptions
  sideInfo?: SectionSideInfo
}

export type ProjectCoverMedia =
  | { type: 'video'; src: string; poster?: string; objectPosition?: string; objectScale?: number; objectRotation?: number }
  | { type: 'image'; src: string; alt: string; objectPosition?: string; objectScale?: number; objectRotation?: number }

export type ProjectRow = {
  id: string
  slug: string
  title: string
  description: string | null
  categories: string[]
  gradient_from: string
  gradient_to: string
  cover_type: 'image' | 'video'
  cover_src: string
  cover_poster: string | null
  cover_alt: string
  cover_object_position: string | null
  cover_object_scale: number | null
  cover_object_rotation: number | null
  /** Hex e.g. #1a1a1a; mosaic overlay title. Null/omit = default light text. */
  card_title_color?: string | null
  /** Hex pill background on project cards. Null/omit = derive from cover/gradient. */
  card_pill_background?: string | null
  visible: boolean
  order: number
  created_at: string
  updated_at: string
}

export type ProjectSectionRow = {
  id: string
  project_id: string
  order: number
  label: string
  layout: SectionLayoutKey
  content: SectionContent
  created_at: string
  updated_at: string
}

export type ArchivePostRow = {
  id: string
  title: string
  description: string
  tags: string[]
  categories: string[]
  duration: string
  cover_src: string
  visible?: boolean
  order?: number
  created_at: string
  updated_at: string
}

export type ArchiveMediaRow = {
  id: string
  archive_id: string
  order: number
  type: 'image' | 'video'
  src: string
  alt: string | null
  object_fit: string | null
  object_position: string | null
  created_at: string
}

/** Normalized project for the public site (matches existing Project type + sections). */
export type Project = {
  /** Present when loaded from DB (admin); absent for static fallback. */
  id?: string
  slug: string
  title: string
  description?: string
  categories: string[]
  gradient: { from: `#${string}`; to: `#${string}` }
  cover: ProjectCoverMedia
  /** Normalized #RRGGBB when set. */
  cardTitleColor?: string
  cardPillBackground?: string
  visible: boolean
  order: number
  sections: {
    id: string
    label: string
    layout: SectionLayoutKey
    content: SectionContent
    order: number
  }[]
}

/** Normalized archive item for the public site (matches existing ArchiveProject + categories + typed media). */
export type ArchiveProject = {
  id: string
  title: string
  description: string
  tags: string[]
  categories: string[]
  duration: string
  cover: string
  visible: boolean
  order: number
  images: string[]
  media: { type: 'image' | 'video'; src: string; alt?: string; objectFit?: string; objectPosition?: string }[]
}
