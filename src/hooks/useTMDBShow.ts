import { useQuery } from '@tanstack/react-query'
import { fetchShowDetails } from '../lib/tmdb'

export function useTMDBShow(tmdbId: string | null | undefined) {
  return useQuery({
    queryKey: ['tmdb-show', tmdbId],
    queryFn: () => fetchShowDetails(Number(tmdbId)),
    enabled: !!tmdbId,
    staleTime: 24 * 60 * 60 * 1000,
  })
}
