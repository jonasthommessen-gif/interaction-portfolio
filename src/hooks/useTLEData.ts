/**
 * useTLEData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches TLE data from CelesTrak GROUP endpoints (CORS: *), parses it,
 * and caches it in memory. Refreshes every `refreshHours` hours (default 6).
 *
 * Fetch strategy (all have CORS: * confirmed):
 *   1. GROUP=stations  — ISS + space stations (~34 sats, tiny, always works)
 *   2. GROUP=weather   — weather/met sats (~70 sats, includes NOAA/Metop/Suomi)
 *   Both are fetched and merged for a good mix of visible satellites.
 *
 * NOTE: The CATNR= endpoint does NOT support comma-separated IDs (returns
 * "not an integer" error). Only single-ID CATNR works. We use GROUP= instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react'
import { parseTLEText } from '../lib/satelliteMath'
import { getCategoryForName } from '../lib/curatedSats'

// ─── Extended ParsedSat with category ────────────────────────────────────────

export interface ParsedSatWithMeta {
  name: string
  satrec: import('../lib/satelliteMath').ParsedSat['satrec']
  category: string
}

// ─── Module-level cache ───────────────────────────────────────────────────────

interface TLECache {
  sats: ParsedSatWithMeta[]
  fetchedAt: number
}

let _cache: TLECache | null = null
let _inflight: Promise<ParsedSatWithMeta[]> | null = null

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTLEDataOptions {
  /** Override the TLE endpoint URL (not used — kept for API compat) */
  tleUrl?: string
  /** How many hours before the cache is considered stale */
  refreshHours?: number
}

export interface UseTLEDataResult {
  sats: ParsedSatWithMeta[]
  loading: boolean
  error: string | null
}

const DEFAULT_REFRESH_HOURS = 6

// CelesTrak GROUP endpoints — all return CORS: * (confirmed)
const STATIONS_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=TLE'
const WEATHER_URL  = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=TLE'
const STARLINK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=TLE'
const VISUAL_URL   = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE'

const STARLINK_MERGE_CAP = 200

async function tryFetch(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const text = await res.text()
  if (text.trim().length < 50 || text.trim().startsWith('No GP data') || text.trim().startsWith('Invalid')) {
    throw new Error(`CelesTrak returned invalid data: ${text.slice(0, 80)}`)
  }
  return text
}

function parseWithMeta(text: string): ParsedSatWithMeta[] {
  return parseTLEText(text).map(sat => ({
    name: sat.name,
    satrec: sat.satrec,
    category: getCategoryForName(sat.name),
  }))
}

async function fetchAll(): Promise<ParsedSatWithMeta[]> {
  const results: ParsedSatWithMeta[] = []
  const seen = new Set<string>()

  // Fetch stations (ISS etc.) — small, fast, always works
  try {
    const text = await tryFetch(STATIONS_URL)
    const sats = parseWithMeta(text)
    for (const s of sats) {
      if (!seen.has(s.name)) { seen.add(s.name); results.push(s) }
    }
    console.debug(`[useTLEData] stations: ${sats.length} sats`)
  } catch (e) {
    console.warn('[useTLEData] stations fetch failed:', e)
  }

  // Fetch weather sats — NOAA, Metop, Suomi NPP, etc.
  try {
    const text = await tryFetch(WEATHER_URL)
    const sats = parseWithMeta(text)
    for (const s of sats) {
      if (!seen.has(s.name)) { seen.add(s.name); results.push(s) }
    }
    console.debug(`[useTLEData] weather: ${sats.length} sats`)
  } catch (e) {
    console.warn('[useTLEData] weather fetch failed:', e)
  }

  // Fetch Starlink — cap merge to keep list size and recompute performant
  try {
    const text = await tryFetch(STARLINK_URL)
    const sats = parseWithMeta(text)
    let merged = 0
    for (const s of sats) {
      if (merged >= STARLINK_MERGE_CAP) break
      if (!seen.has(s.name)) { seen.add(s.name); results.push(s); merged++ }
    }
    console.debug(`[useTLEData] starlink: ${merged} merged (cap ${STARLINK_MERGE_CAP})`)
  } catch (e) {
    console.warn('[useTLEData] starlink fetch failed:', e)
  }

  // Fetch 100 (or so) Brightest — naked-eye visible
  try {
    const text = await tryFetch(VISUAL_URL)
    const sats = parseWithMeta(text)
    for (const s of sats) {
      if (!seen.has(s.name)) { seen.add(s.name); results.push(s) }
    }
    console.debug(`[useTLEData] visual: ${sats.length} sats`)
  } catch (e) {
    console.warn('[useTLEData] visual fetch failed:', e)
  }

  if (results.length === 0) {
    throw new Error('All TLE fetches failed — no satellite data available')
  }

  console.debug(`[useTLEData] total: ${results.length} satellites loaded`)
  return results
}

export function useTLEData(options: UseTLEDataOptions = {}): UseTLEDataResult {
  const refreshMs = (options.refreshHours ?? DEFAULT_REFRESH_HOURS) * 3600 * 1000

  const [sats, setSats] = useState<ParsedSatWithMeta[]>(_cache?.sats ?? [])
  const [loading, setLoading] = useState<boolean>(_cache === null)
  const [error, setError] = useState<string | null>(null)

  const refreshMsRef = useRef(refreshMs)
  refreshMsRef.current = refreshMs

  useEffect(() => {
    let cancelled = false

    const load = async (force = false) => {
      const now = Date.now()
      const cacheValid =
        _cache !== null &&
        now - _cache.fetchedAt < refreshMsRef.current

      if (cacheValid && !force) {
        setSats(_cache!.sats)
        setLoading(false)
        return
      }

      if (!_inflight) {
        _inflight = fetchAll().then(result => {
          _cache = { sats: result, fetchedAt: Date.now() }
          _inflight = null
          return result
        }).catch(err => {
          _inflight = null
          throw err
        })
      }

      try {
        setLoading(true)
        const result = await _inflight
        if (!cancelled) {
          setSats(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          console.error('[useTLEData] Failed to load TLEs:', msg)
          if (_cache) setSats(_cache.sats)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const interval = setInterval(() => void load(true), refreshMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [refreshMs])

  return { sats, loading, error }
}
