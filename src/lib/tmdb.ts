import { supabase } from './supabase'
import type { AirEpisode, AirStatus } from './progressLogic'

export interface TMDBSearchResult {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string
  overview: string
}

export interface TMDBSeason {
  season_number: number
  episode_count: number
}

export interface TMDBAirEpisode {
  season_number: number
  episode_number: number
  air_date: string | null
  name?: string
}

export interface TMDBShowDetails {
  id: number
  name: string
  poster_path: string | null
  number_of_seasons: number
  seasons: TMDBSeason[]
  overview: string
  first_air_date: string
  status: string
  genres: { id: number; name: string }[]
  last_episode_to_air?: TMDBAirEpisode | null
  next_episode_to_air?: TMDBAirEpisode | null
}

export interface TMDBEpisode {
  episode_number: number
  name: string
  still_path: string | null
  overview: string
}

export interface TMDBSeasonDetails {
  season_number: number
  episodes: TMDBEpisode[]
}

export interface TMDBWatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300'
const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w45'

export function providerLogoUrl(logoPath: string): string {
  return `${TMDB_LOGO_BASE}${logoPath}`
}

export function posterUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder-poster.svg'
  if (path.startsWith('http')) return path
  return `${TMDB_IMAGE_BASE}${path}`
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// Deduplicate concurrent getSession() calls so parallel TMDB hooks on the
// same page share one lock acquisition rather than queuing sequentially.
let pendingSession: Promise<string | null> | null = null

async function getAuthToken(): Promise<string | null> {
  if (!pendingSession) {
    pendingSession = supabase.auth.getSession()
      .then(({ data: { session } }) => session?.access_token ?? null)
      .finally(() => { pendingSession = null })
  }
  return pendingSession
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  if (!token) throw new Error('Session expired — please log in again.')
  return { Authorization: `Bearer ${token}` }
}

export async function searchShows(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?query=${encodeURIComponent(query)}`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('TMDB search failed')
  const data = await res.json()
  return data.results ?? []
}

export async function fetchShowDetails(tmdbId: number): Promise<TMDBShowDetails> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?tmdb_id=${tmdbId}`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('TMDB fetch failed')
  return res.json()
}

export async function fetchSeasonDetails(tmdbId: string, season: number): Promise<TMDBSeasonDetails> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?tmdb_id=${tmdbId}&season=${season}`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('TMDB season fetch failed')
  return res.json()
}

export async function fetchWatchProviders(tmdbId: number): Promise<TMDBWatchProvider[]> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?tmdb_id=${tmdbId}&providers=1`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('TMDB providers fetch failed')
  const data = await res.json()
  return data?.results?.US?.flatrate ?? []
}

export async function fetchAISuggestions(
  showTitles: string[]
): Promise<Array<{ tmdb: TMDBSearchResult; reason: string }>> {
  const res = await fetch(`${FUNCTIONS_URL}/suggest-shows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ shows: showTitles }),
  })
  if (!res.ok) throw new Error('AI suggestions fetch failed')
  const data = await res.json()
  return data.suggestions ?? []
}

export function extractEpisodesPerSeason(details: TMDBShowDetails): number[] {
  return details.seasons
    .filter(s => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .map(s => s.episode_count)
}

function toAirEpisode(ep: TMDBAirEpisode | null | undefined): AirEpisode | null {
  if (!ep) return null
  return { season: ep.season_number, episode: ep.episode_number, air_date: ep.air_date ?? null }
}

export function extractAirStatus(details: TMDBShowDetails): AirStatus {
  return {
    status: details.status ?? null,
    last_aired: toAirEpisode(details.last_episode_to_air),
    next_episode: toAirEpisode(details.next_episode_to_air),
  }
}
