import type { SectionSideInfoParticipant } from '../types/cms'

/** Normalize legacy string or array participants from section JSON. */
export function normalizeParticipants(
  raw: string | SectionSideInfoParticipant[] | undefined,
): SectionSideInfoParticipant[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((p) => ({
        name: String(p?.name ?? '').trim(),
        url: p?.url?.trim() ? p.url.trim() : undefined,
      }))
      .filter((p) => p.name)
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }))
  }
  return []
}

export function participantsHasData(
  raw: string | SectionSideInfoParticipant[] | undefined,
): boolean {
  return normalizeParticipants(raw).length > 0
}

/** Admin editor: keep in-progress empty rows; migrate legacy string to named entries. */
export function participantsForEdit(
  raw: string | SectionSideInfoParticipant[] | undefined,
): SectionSideInfoParticipant[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((p) => ({
      name: String(p?.name ?? ''),
      url: p?.url?.trim() ? p.url.trim() : undefined,
    }))
  }
  return normalizeParticipants(raw)
}
