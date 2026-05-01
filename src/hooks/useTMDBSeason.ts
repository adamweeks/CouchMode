import { useQuery } from '@tanstack/react-query'
import { fetchSeasonDetails } from '../lib/tmdb'
import type { TMDBEpisode } from '../lib/tmdb'

export function useTMDBSeason(tmdbId: string | null | undefined, season: number) {
  return useQuery({
    queryKey: ['tmdb-season', tmdbId, season],
    queryFn: () => fetchSeasonDetails(tmdbId!, season),
    enabled: !!tmdbId && season >= 1,
    staleTime: 24 * 60 * 60 * 1000, // 24h — episode metadata rarely changes
  })
}

export function getEpisodeDetails(
  episodes: TMDBEpisode[] | undefined,
  episodeNumber: number,
): TMDBEpisode | undefined {
  return episodes?.find(e => e.episode_number === episodeNumber)
}
