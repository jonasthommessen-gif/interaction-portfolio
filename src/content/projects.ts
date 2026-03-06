export type ProjectCoverMedia =
  | { type: 'video'; src: string; poster?: string }
  | { type: 'image'; src: string; alt: string }

export type Project = {
  slug: string
  title: string
  categories: string[]
  /**
   * Two colors used to theme the project card (and later, the project detail).
   * Keep them as hex strings.
   */
  gradient: {
    from: `#${string}`
    to: `#${string}`
  }
  cover: ProjectCoverMedia
}

export const projects: Project[] = [
  {
    slug: 'kinetic-cards',
    title: 'Kinetic Cards',
    categories: ['Motion', 'UI', 'Prototype'],
    gradient: { from: '#6D28D9', to: '#22D3EE' },
    cover: { type: 'image', src: '/images/placeholders/DSCF0184.JPG', alt: '' },
  },
  {
    slug: 'micro-interactions',
    title: 'Micro Interactions',
    categories: ['Interaction', 'System', 'Motion'],
    gradient: { from: '#F97316', to: '#F43F5E' },
    cover: { type: 'image', src: '/images/placeholders/IMG_1596.JPG', alt: '' },
  },
  {
    slug: 'case-study-template',
    title: 'Case Study Template',
    categories: ['Narrative', 'Layout', 'UX'],
    gradient: { from: '#10B981', to: '#A3E635' },
    cover: { type: 'image', src: '/images/placeholders/IMG_0045.JPG', alt: '' },
  },
  {
    slug: 'responsive-mosaic',
    title: 'Responsive Mosaic',
    categories: ['Grid', 'CSS', 'Interaction'],
    gradient: { from: '#38BDF8', to: '#A78BFA' },
    cover: { type: 'image', src: '/images/placeholders/IMG_0115.JPG', alt: '' },
  },
  {
    slug: 'frictionless-navigation',
    title: 'Frictionless Navigation',
    categories: ['Navigation', 'IA', 'UX'],
    gradient: { from: '#F43F5E', to: '#FBBF24' },
    cover: { type: 'image', src: '/images/placeholders/IMG_0259.jpeg', alt: '' },
  },
  {
    slug: 'visual-language',
    title: 'Visual Language',
    categories: ['Brand', 'Typography', 'Motion'],
    gradient: { from: '#22C55E', to: '#14B8A6' },
    cover: { type: 'image', src: '/images/placeholders/IMG_1484.JPG', alt: '' },
  },
]

/**
 * Returns the project with the given slug, or undefined if not found.
 * @param slug - URL-safe project identifier (e.g. `'kinetic-cards'`)
 * @returns The project object or undefined
 */
export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}
