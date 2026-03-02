/**
 * Archive project data — 23 items.
 * Each card shows one cover image in the gallery.
 * When focused, the carousel cycles through `images[]` (reusing placeholders).
 */

export type ArchiveProject = {
  id: string
  title: string
  description: string
  tags: string[]
  duration: string
  /** Cover image shown in the gallery card */
  cover: string
  /** Images shown in the focus carousel (3–5 per project) */
  images: string[]
}

const P = '/images/placeholders/'

export const archiveProjects: ArchiveProject[] = [
  {
    id: 'arc-01',
    title: 'Spatial Threshold',
    description:
      'An exploration of liminal space through layered photography and motion. Each frame captures the moment between two states.',
    tags: ['Photography', 'Motion', '4 days'],
    duration: '4 days',
    cover: `${P}IMG_7355.JPG`,
    images: [
      `${P}IMG_7355.JPG`,
      `${P}IMG_7261.jpeg`,
      `${P}IMG_7240.JPG`,
      `${P}IMG_7129.jpeg`,
    ],
  },
  {
    id: 'arc-02',
    title: 'Overgrowth Study',
    description:
      'Nature reclaiming structure. A series documenting the tension between built form and organic expansion.',
    tags: ['Documentary', 'UI', 'Redesign'],
    duration: '6 days',
    cover: `${P}IMG_6504.JPG`,
    images: [
      `${P}IMG_6504.JPG`,
      `${P}IMG_4758.JPG`,
      `${P}IMG_4440.JPG`,
      `${P}IMG_0259.jpeg`,
    ],
  },
  {
    id: 'arc-03',
    title: 'Kinetic Residue',
    description:
      'Long-exposure studies of movement in urban environments. Blur as a design material.',
    tags: ['Motion', 'Experiment'],
    duration: '3 days',
    cover: `${P}IMG_4758.JPG`,
    images: [
      `${P}IMG_4758.JPG`,
      `${P}IMG_4440.JPG`,
      `${P}IMG_1596.JPG`,
      `${P}IMG_1484.JPG`,
    ],
  },
  {
    id: 'arc-04',
    title: 'Material Archive',
    description:
      'Cataloguing surface textures found in transitional spaces — airports, stations, corridors.',
    tags: ['Research', 'Texture', 'Archive'],
    duration: '2 weeks',
    cover: `${P}IMG_4440.JPG`,
    images: [
      `${P}IMG_4440.JPG`,
      `${P}IMG_0142.JPG`,
      `${P}IMG_0168.JPG`,
      `${P}IMG_0170.JPG`,
    ],
  },
  {
    id: 'arc-05',
    title: 'Soft Infrastructure',
    description:
      'Invisible systems made visible. A visual essay on the hidden networks that sustain daily life.',
    tags: ['Essay', 'Systems', 'UI'],
    duration: '5 days',
    cover: `${P}IMG_1596.JPG`,
    images: [
      `${P}IMG_1596.JPG`,
      `${P}IMG_1484.JPG`,
      `${P}DSCF0184.JPG`,
      `${P}IMG_0045.JPG`,
    ],
  },
  {
    id: 'arc-06',
    title: 'Peripheral Vision',
    description:
      'What exists at the edge of attention. Photographs taken without looking through the viewfinder.',
    tags: ['Photography', 'Chance'],
    duration: '1 week',
    cover: `${P}IMG_1484.JPG`,
    images: [
      `${P}IMG_1484.JPG`,
      `${P}IMG_0115.JPG`,
      `${P}IMG_0045.JPG`,
      `${P}DSCF0184.JPG`,
    ],
  },
  {
    id: 'arc-07',
    title: 'Depth Cue',
    description:
      'A study in atmospheric perspective. How distance transforms color, contrast, and meaning.',
    tags: ['Visual Research', 'Color'],
    duration: '3 days',
    cover: `${P}DSCF0184.JPG`,
    images: [
      `${P}DSCF0184.JPG`,
      `${P}IMG_7355.JPG`,
      `${P}IMG_6504.JPG`,
      `${P}IMG_4758.JPG`,
    ],
  },
  {
    id: 'arc-08',
    title: 'Ground Plane',
    description:
      'Surfaces underfoot as a record of use. Worn paths, stained concrete, eroded stone.',
    tags: ['Documentary', 'Texture'],
    duration: '4 days',
    cover: `${P}IMG_0045.JPG`,
    images: [
      `${P}IMG_0045.JPG`,
      `${P}IMG_0115.JPG`,
      `${P}IMG_0142.JPG`,
      `${P}IMG_0168.JPG`,
    ],
  },
  {
    id: 'arc-09',
    title: 'Interval',
    description:
      'The space between events. A meditation on pause, waiting, and the productive void.',
    tags: ['Concept', 'Motion', 'UI'],
    duration: '2 days',
    cover: `${P}IMG_0115.JPG`,
    images: [
      `${P}IMG_0115.JPG`,
      `${P}IMG_0170.JPG`,
      `${P}IMG_0259.jpeg`,
      `${P}IMG_1596.JPG`,
    ],
  },
  {
    id: 'arc-10',
    title: 'Structural Echo',
    description:
      'Repetition as rhythm. Architectural patterns that create visual music across facades.',
    tags: ['Architecture', 'Pattern'],
    duration: '1 week',
    cover: `${P}IMG_0142.JPG`,
    images: [
      `${P}IMG_0142.JPG`,
      `${P}IMG_0168.JPG`,
      `${P}IMG_0170.JPG`,
      `${P}IMG_4440.JPG`,
    ],
  },
  {
    id: 'arc-11',
    title: 'Ambient Notation',
    description:
      'Translating environmental sound into visual form. A synesthetic mapping project.',
    tags: ['Synesthesia', 'Data', 'Experiment'],
    duration: '3 days',
    cover: `${P}IMG_0168.JPG`,
    images: [
      `${P}IMG_0168.JPG`,
      `${P}IMG_0170.JPG`,
      `${P}IMG_0259.jpeg`,
      `${P}IMG_7129.jpeg`,
    ],
  },
  {
    id: 'arc-12',
    title: 'Fog Index',
    description:
      'For he lives in a pineapple under the sea! Sponge Bob Square Pants! He is a swamap and he likes to swamp.',
    tags: ['4 days', 'UI', 'Redesign'],
    duration: '4 days',
    cover: `${P}IMG_0170.JPG`,
    images: [
      `${P}IMG_0170.JPG`,
      `${P}IMG_7261.jpeg`,
      `${P}IMG_7240.JPG`,
      `${P}IMG_6504.JPG`,
      `${P}IMG_4758.JPG`,
    ],
  },
  {
    id: 'arc-13',
    title: 'Trace Evidence',
    description:
      'Marks left by human activity on neutral surfaces. A forensic approach to everyday space.',
    tags: ['Documentary', 'Research'],
    duration: '5 days',
    cover: `${P}IMG_0259.jpeg`,
    images: [
      `${P}IMG_0259.jpeg`,
      `${P}IMG_1484.JPG`,
      `${P}IMG_1596.JPG`,
      `${P}DSCF0184.JPG`,
    ],
  },
  {
    id: 'arc-14',
    title: 'Canopy Logic',
    description:
      'The geometry of trees. How branching structures encode growth, time, and decision.',
    tags: ['Nature', 'Systems', 'Photography'],
    duration: '2 days',
    cover: `${P}IMG_7129.jpeg`,
    images: [
      `${P}IMG_7129.jpeg`,
      `${P}IMG_7240.JPG`,
      `${P}IMG_7261.jpeg`,
      `${P}IMG_7355.JPG`,
    ],
  },
  {
    id: 'arc-15',
    title: 'Vertical Grammar',
    description:
      'Reading buildings as text. The syntax of windows, floors, and facades as language.',
    tags: ['Architecture', 'Typography'],
    duration: '1 week',
    cover: `${P}IMG_7240.JPG`,
    images: [
      `${P}IMG_7240.JPG`,
      `${P}IMG_7355.JPG`,
      `${P}IMG_6504.JPG`,
      `${P}IMG_4440.JPG`,
    ],
  },
  {
    id: 'arc-16',
    title: 'Soft Boundary',
    description:
      'Where public becomes private. The negotiated edges of shared and personal space.',
    tags: ['Sociology', 'Photography', 'Essay'],
    duration: '3 days',
    cover: `${P}IMG_7261.jpeg`,
    images: [
      `${P}IMG_7261.jpeg`,
      `${P}IMG_7129.jpeg`,
      `${P}IMG_0259.jpeg`,
      `${P}IMG_0170.JPG`,
    ],
  },
  {
    id: 'arc-17',
    title: 'Residual Heat',
    description:
      'Thermal imaging as aesthetic. The invisible warmth left behind by bodies and machines.',
    tags: ['Experiment', 'Data', 'Motion'],
    duration: '4 days',
    cover: `${P}IMG_4440.JPG`,
    images: [
      `${P}IMG_4440.JPG`,
      `${P}IMG_4758.JPG`,
      `${P}IMG_1596.JPG`,
      `${P}IMG_0115.JPG`,
    ],
  },
  {
    id: 'arc-18',
    title: 'Compression Study',
    description:
      'What survives lossy encoding. Beauty in artifact, noise, and degraded signal.',
    tags: ['Digital', 'Glitch', 'Experiment'],
    duration: '2 days',
    cover: `${P}IMG_6504.JPG`,
    images: [
      `${P}IMG_6504.JPG`,
      `${P}IMG_7355.JPG`,
      `${P}IMG_7240.JPG`,
      `${P}DSCF0184.JPG`,
    ],
  },
  {
    id: 'arc-19',
    title: 'Slow Accumulation',
    description:
      'Time-based photography of gradual change. Rust, moss, sediment, and patina as narrative.',
    tags: ['Time', 'Photography', 'Archive'],
    duration: '3 weeks',
    cover: `${P}IMG_0142.JPG`,
    images: [
      `${P}IMG_0142.JPG`,
      `${P}IMG_0045.JPG`,
      `${P}IMG_0115.JPG`,
      `${P}IMG_1484.JPG`,
    ],
  },
  {
    id: 'arc-20',
    title: 'Negative Space',
    description:
      'The shape of absence. Compositions built entirely from what is not there.',
    tags: ['Composition', 'Concept'],
    duration: '1 day',
    cover: `${P}IMG_0168.JPG`,
    images: [
      `${P}IMG_0168.JPG`,
      `${P}IMG_0142.JPG`,
      `${P}IMG_0170.JPG`,
      `${P}IMG_7129.jpeg`,
    ],
  },
  {
    id: 'arc-21',
    title: 'Field Notes',
    description:
      'Raw observations from three months of walking the same route daily. Difference within repetition.',
    tags: ['Documentary', 'Research', 'Walking'],
    duration: '3 months',
    cover: `${P}IMG_1596.JPG`,
    images: [
      `${P}IMG_1596.JPG`,
      `${P}IMG_0259.jpeg`,
      `${P}IMG_4758.JPG`,
      `${P}IMG_6504.JPG`,
    ],
  },
  {
    id: 'arc-22',
    title: 'Horizon Protocol',
    description:
      'A systematic study of skylines across 12 cities. The horizon as cultural artifact.',
    tags: ['Urban', 'Series', 'Photography'],
    duration: '6 months',
    cover: `${P}DSCF0184.JPG`,
    images: [
      `${P}DSCF0184.JPG`,
      `${P}IMG_7355.JPG`,
      `${P}IMG_7261.jpeg`,
      `${P}IMG_4440.JPG`,
    ],
  },
  {
    id: 'arc-23',
    title: 'Contact Sheet',
    description:
      'The unedited roll. All frames, including the mistakes, the blinks, the almost-images.',
    tags: ['Process', 'Photography', 'Archive'],
    duration: '2 days',
    cover: `${P}IMG_0045.JPG`,
    images: [
      `${P}IMG_0045.JPG`,
      `${P}IMG_1484.JPG`,
      `${P}IMG_0115.JPG`,
      `${P}IMG_0168.JPG`,
      `${P}IMG_7240.JPG`,
    ],
  },
]
