/**
 * curatedSats.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A curated list of satellites that are interesting to watch over Norway.
 * Each entry has a NORAD catalog ID and a human-readable category label.
 *
 * The TLE fetch URL is built from these IDs:
 *   https://celestrak.org/NORAD/elements/gp.php?CATNR=25544,40697,...&FORMAT=TLE
 *
 * This keeps the payload tiny (~5KB) vs the full active catalog (~1.5MB).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CuratedSat {
  noradId: number
  label: string       // Short display name shown in tooltip
  category: string    // Category shown in tooltip (ISS, Starlink, Weather, etc.)
}

export const CURATED_SATS: CuratedSat[] = [
  // ── Space Station ──────────────────────────────────────────────────────────
  { noradId: 25544, label: 'ISS',           category: 'Space Station' },
  { noradId: 54216, label: 'CSS (Tiangong)', category: 'Space Station' },

  // ── Weather / Meteorology ──────────────────────────────────────────────────
  { noradId: 28654, label: 'NOAA-18',       category: 'Weather' },
  { noradId: 33591, label: 'NOAA-19',       category: 'Weather' },
  { noradId: 38771, label: 'Metop-B',       category: 'Weather' },
  { noradId: 43689, label: 'Metop-C',       category: 'Weather' },
  { noradId: 37849, label: 'Suomi NPP',     category: 'Weather' },
  { noradId: 43013, label: 'JPSS-1 (NOAA-20)', category: 'Weather' },

  // ── Earth Observation ─────────────────────────────────────────────────────
  { noradId: 40697, label: 'Sentinel-2A',   category: 'Earth Obs' },
  { noradId: 42063, label: 'Sentinel-2B',   category: 'Earth Obs' },
  { noradId: 44013, label: 'Sentinel-3A',   category: 'Earth Obs' },
  { noradId: 41335, label: 'Sentinel-3B',   category: 'Earth Obs' },
  { noradId: 39084, label: 'Landsat-8',     category: 'Earth Obs' },
  { noradId: 49260, label: 'Landsat-9',     category: 'Earth Obs' },
  { noradId: 27424, label: 'Aqua',          category: 'Earth Obs' },
  { noradId: 25994, label: 'Terra',         category: 'Earth Obs' },
  { noradId: 43600, label: 'ICESat-2',      category: 'Earth Obs' },

  // ── Navigation ────────────────────────────────────────────────────────────
  { noradId: 28474, label: 'GPS IIR-14',    category: 'Navigation' },
  { noradId: 37846, label: 'Galileo-5',     category: 'Navigation' },
  { noradId: 38857, label: 'Galileo-6',     category: 'Navigation' },

  // ── Starlink (representative batch visible from high latitudes) ────────────
  { noradId: 44713, label: 'Starlink-1',    category: 'Starlink' },
  { noradId: 44714, label: 'Starlink-2',    category: 'Starlink' },
  { noradId: 44715, label: 'Starlink-3',    category: 'Starlink' },
  { noradId: 44716, label: 'Starlink-4',    category: 'Starlink' },
  { noradId: 44717, label: 'Starlink-5',    category: 'Starlink' },
  { noradId: 44718, label: 'Starlink-6',    category: 'Starlink' },
  { noradId: 44719, label: 'Starlink-7',    category: 'Starlink' },
  { noradId: 44720, label: 'Starlink-8',    category: 'Starlink' },
  { noradId: 44721, label: 'Starlink-9',    category: 'Starlink' },
  { noradId: 44722, label: 'Starlink-10',   category: 'Starlink' },
  { noradId: 44723, label: 'Starlink-11',   category: 'Starlink' },
  { noradId: 44724, label: 'Starlink-12',   category: 'Starlink' },

  // ── Science / Research ────────────────────────────────────────────────────
  { noradId: 25338, label: 'HST (Hubble)',  category: 'Science' },
  { noradId: 43205, label: 'GRACE-FO 1',   category: 'Science' },
  { noradId: 43206, label: 'GRACE-FO 2',   category: 'Science' },

  // ── Amateur / Ham ─────────────────────────────────────────────────────────
  { noradId: 25397, label: 'ISS (AOS)',     category: 'Amateur' },
  { noradId: 43017, label: 'Fox-1D',        category: 'Amateur' },
]

/**
 * Build the CelesTrak GP fetch URL for the curated satellite list.
 */
export function buildCuratedTLEUrl(): string {
  const ids = CURATED_SATS.map(s => s.noradId).join(',')
  return `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ids}&FORMAT=TLE`
}

/**
 * Look up the category label for a satellite by its name or NORAD ID string.
 * Falls back to 'Satellite' if not found.
 */
export function getCategoryForName(name: string): string {
  // TLE names from CelesTrak often match our label or contain the NORAD ID
  const upper = name.toUpperCase()
  for (const sat of CURATED_SATS) {
    if (upper.includes(sat.label.toUpperCase())) return sat.category
    if (upper.includes(String(sat.noradId))) return sat.category
  }
  // Try matching by common keywords
  if (upper.includes('STARLINK')) return 'Starlink'
  if (upper.includes('ISS') || upper.includes('ZARYA')) return 'Space Station'
  if (upper.includes('NOAA') || upper.includes('METOP') || upper.includes('NPP')) return 'Weather'
  if (upper.includes('SENTINEL') || upper.includes('LANDSAT')) return 'Earth Obs'
  if (upper.includes('GPS') || upper.includes('GALILEO') || upper.includes('GLONASS')) return 'Navigation'
  return 'Satellite'
}
