import { useQuery } from '@tanstack/react-query'
import { fetchSeasonDetails } from '../lib/tmdb'

export function useTMDBSeason(tmdbId: string | null | undefined, season: number) {
  return useQuery({
    queryKey: ['tmdb-season', tmdbId, season],
    queryFn: () => fetchSeasonDetails(tmdbId!, season),
    enabled: !!tmdbId && season >= 1,
    staleTime: 24 * 60 * 60 * 1000,
  })
}
