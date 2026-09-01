import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Json } from '../lib/database.types'
import { useAuth } from './AuthContext'

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

/** localStorage key — a per-device cache for instant/offline first paint. */
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

function readCache(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (raw) return { ...DEFAULT_PREFERENCES, ...sanitize(JSON.parse(raw)) }
  } catch {
    // localStorage unavailable (private mode / SSR) or malformed JSON — use defaults
  }
  return DEFAULT_PREFERENCES
}

function writeCache(prefs: Preferences) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // caching is best-effort; the in-memory preference still applies
  }
}

/** Write-through to the user's row. Best-effort — the local cache already holds
 * the change, so a failed sync recovers on the next successful load. */
async function persist(userId: string, prefs: Preferences) {
  try {
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: prefs as unknown as Json,
        updated_at: new Date().toISOString(),
      })
  } catch {
    // ignore — will re-sync later
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [preferences, setPreferences] = useState<Preferences>(readCache)
  // Once the user changes something locally, don't let a slower server load
  // clobber their fresh choice.
  const editedRef = useRef(false)

  // On sign-in, pull this user's saved preferences. If the server has none yet
  // (new user, or first run since this feature shipped), seed it from the local
  // cache so their existing device's choice becomes the synced baseline.
  useEffect(() => {
    if (!userId) return
    editedRef.current = false
    let cancelled = false

    void (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled || error) return

      if (data?.preferences) {
        const merged = { ...DEFAULT_PREFERENCES, ...sanitize(data.preferences as Partial<Preferences>) }
        writeCache(merged)
        if (!editedRef.current) setPreferences(merged)
      } else {
        void persist(userId, readCache())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      editedRef.current = true
      setPreferences(prev => {
        const next = { ...prev, [key]: value }
        writeCache(next)
        if (userId) void persist(userId, next)
        return next
      })
    },
    [userId],
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
