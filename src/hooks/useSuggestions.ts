import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { fetchAISuggestions } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { useShowGroups } from './useShows'

export interface Suggestion {
  result: TMDBSearchResult
  reason: string
}

export function useSuggestions() {
  const { user } = useAuth()
  const { data: groups } = useShowGroups()

  const allShows = [
    ...(groups?.watching ?? []),
    ...(groups?.queue ?? []),
    ...(groups?.done ?? []),
  ]

  const ownedTmdbIds = new Set(allShows.map(s => s.tmdb_id))
  const showTitles = allShows.map(s => s.title)

  const enabled = !!user && showTitles.length > 0

  return useQuery({
    queryKey: ['suggestions', user?.id, showTitles.join(',')],
    queryFn: async (): Promise<Suggestion[]> => {
      const aiSuggestions = await fetchAISuggestions(showTitles)
      return aiSuggestions
        .filter(s => !ownedTmdbIds.has(String(s.tmdb.id)))
        .map(s => ({ result: s.tmdb, reason: s.reason }))
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  })
}
