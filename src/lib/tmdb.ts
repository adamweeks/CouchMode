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

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300'

export function posterUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder-poster.svg'
  if (path.startsWith('http')) return path
  return `${TMDB_IMAGE_BASE}${path}`
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export async function searchShows(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('TMDB search failed')
  const data = await res.json()
  return data.results ?? []
}

export async function fetchShowDetails(tmdbId: number): Promise<TMDBShowDetails> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?tmdb_id=${tmdbId}`)
  if (!res.ok) throw new Error('TMDB fetch failed')
  return res.json()
}

export async function fetchSeasonDetails(tmdbId: string, season: number): Promise<TMDBSeasonDetails> {
  const res = await fetch(`${FUNCTIONS_URL}/tmdb-search?tmdb_id=${tmdbId}&season=${season}`)
  if (!res.ok) throw new Error('TMDB season fetch failed')
  return res.json()
}

export function extractEpisodesPerSeason(details: TMDBShowDetails): number[] {
  return details.seasons
    .filter(s => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .map(s => s.episode_count)
}
