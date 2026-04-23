import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchShowDetails, extractEpisodesPerSeason, posterUrl } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { useAuth } from '../contexts/AuthContext'

export function useShows() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .order('added_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })
}

export function useShow(id: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shows', user?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user && !!id,
  })
}

export function useAddShow() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (result: TMDBSearchResult) => {
      if (!user) throw new Error('Not authenticated')

      const details = await fetchShowDetails(result.id)
      const episodesPerSeason = extractEpisodesPerSeason(details)

      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert({
          tmdb_id: String(result.id),
          user_id: user.id,
          title: result.name,
          poster_url: posterUrl(result.poster_path),
          total_seasons: details.number_of_seasons,
          episodes_per_season: episodesPerSeason,
        })
        .select()
        .single()
      if (showError) throw showError

      const { error: rewatchError } = await supabase
        .from('rewatches')
        .insert({
          show_id: show.id,
          user_id: user.id,
          status: 'in_progress',
        })
      if (rewatchError) throw rewatchError

      return show
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
    },
  })
}

export function useRemoveShow() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (showId: string) => {
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', showId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
    },
  })
}
