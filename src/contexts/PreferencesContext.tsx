import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * What the "Continue Watching" card on the main index highlights:
 * - `up-next` — the next episode to watch (the default).
 * - `last-watched` — the most recently logged episode.
 */
export type ResumeCardMode = 'up-next' | 'last-watched'

export interface Preferences {
  /** Whether the "Continue Watching" card appears at the top of the main list. */
  showResumeCard: boolean
  /** Whether that card highlights the next episode to watch, or the last one watched. */
  resumeCardMode: ResumeCardMode
  /** Whether finished shows appear in a "Done" group on the main list. */
  showDoneSection: boolean
}

export const PREFERENCES_STORAGE_KEY = 'couchmode-preferences'

export const DEFAULT_PREFERENCES: Preferences = {
  showResumeCard: true,
  resumeCardMode: 'up-next',
  showDoneSection: true,
}

interface PreferencesContextValue {
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

/** Keep only well-typed, known keys so a corrupt/old blob can't poison the app. */
function sanitize(raw: Partial<Preferences>): Partial<Preferences> {
  const out: Partial<Preferences> = {}
  if (typeof raw.showResumeCard === 'boolean') out.showResumeCard = raw.showResumeCard
  if (raw.resumeCardMode === 'up-next' || raw.resumeCardMode === 'last-watched') {
    out.resumeCardMode = raw.resumeCardMode
  }
  if (typeof raw.showDoneSection === 'boolean') out.showDoneSection = raw.showDoneSection
  return out
}

function getStoredPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (raw) return { ...DEFAULT_PREFERENCES, ...sanitize(JSON.parse(raw)) }
  } catch {
    // localStorage unavailable (private mode / SSR) or malformed JSON — use defaults
  }
  return DEFAULT_PREFERENCES
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(getStoredPreferences)

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences(prev => {
        const next = { ...prev, [key]: value }
        try {
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // persisting is best-effort; the in-memory preference still applies
        }
        return next
      })
    },
    [],
  )

  return (
    <PreferencesContext.Provider value={{ preferences, setPreference }}>
      {children}
    </PreferencesContext.Provider>
  )
}

/**
 * Read and update user preferences. Outside a provider (e.g. isolated unit
 * tests that don't exercise settings) this returns the defaults with no-op
 * setters, so consumers render normally without extra wiring.
 */
export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) return { preferences: DEFAULT_PREFERENCES, setPreference: () => {} }
  return ctx
}
