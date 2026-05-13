import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { fetchSimilarShows } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { useShowGroups } from './useShows'

export interface Suggestion {
  result: TMDBSearchResult
  becauseOf: string
}

const MAX_SOURCE_SHOWS = 5
const MAX_SUGGESTIONS = 20

export function useSuggestions() {
  const { user } = useAuth()
  const { data: groups } = useShowGroups()

  // Build the set of tmdb_ids already in the user's collection
  const allShows = [
    ...(groups?.watching ?? []),
    ...(groups?.queue ?? []),
    ...(groups?.done ?? []),
  ]
  const ownedTmdbIds = new Set(allShows.map(s => s.tmdb_id))

  // Source shows: prefer done (completed rewatches), then watching
  const sourceShows = [
    ...(groups?.done ?? []),
    ...(groups?.watching ?? []),
  ].slice(0, MAX_SOURCE_SHOWS)

  const enabled = !!user && sourceShows.length > 0

  return useQuery({
    queryKey: ['suggestions', user?.id, sourceShows.map(s => s.tmdb_id).join(',')],
    queryFn: async (): Promise<Suggestion[]> => {
      const results = await Promise.allSettled(
        sourceShows.map(show =>
          fetchSimilarShows(Number(show.tmdb_id)).then(similar => ({
            show,
            similar,
          }))
        )
      )

      const seen = new Set<string>()
      const suggestions: Suggestion[] = []

      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const { show, similar } = result.value
        for (const s of similar) {
          const id = String(s.id)
          if (seen.has(id)) continue
          seen.add(id)
          if (ownedTmdbIds.has(id)) continue
          suggestions.push({ result: s, becauseOf: show.title })
          if (suggestions.length >= MAX_SUGGESTIONS) return suggestions
        }
      }

      return suggestions
    },
    enabled,
    staleTime: 1000 * 60 * 30,
  })
}
