import type { SessionContextTag, SessionReportState } from '../model/sessionReportTypes'

const STORAGE_KEY = 'kinmetrix-prototype-v1'

export type PersistedSlice = {
  plan: SessionReportState['plan']
  note: string
  sessionContextTag: SessionContextTag
}

export function loadPersistedSession(): Partial<PersistedSlice> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<PersistedSlice>
    return parsed
  } catch {
    return null
  }
}

export function savePersistedSession(slice: PersistedSlice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice))
  } catch {
    // prototype-only persistence
  }
}
