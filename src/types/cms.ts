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

/** Content for a section; shape depends on layout (e.g. text + one image for text-left-media-right). */
export type SectionContent = {
  heading?: string
  body?: string
  media?: { type: 'image' | 'video'; src: string; alt?: string; poster?: string }
  gallery?: { src: string; alt?: string; caption?: string }[]
}

export type ProjectCoverMedia =
  | { type: 'video'; src: string; poster?: string }
  | { type: 'image'; src: string; alt: string }

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
  created_at: string
}

/** Normalized project for the public site (matches existing Project type + sections). */
export type Project = {
  slug: string
  title: string
  description?: string
  categories: string[]
  gradient: { from: `#${string}`; to: `#${string}` }
  cover: ProjectCoverMedia
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
  images: string[]
  media: { type: 'image' | 'video'; src: string; alt?: string }[]
}
