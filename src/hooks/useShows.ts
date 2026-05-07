import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchShowDetails, extractEpisodesPerSeason, posterUrl } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../lib/database.types'

export type SortOption = 'added_at' | 'title' | 'manual'
export type GroupSortOption = 'added_at' | 'title'

type Show = Database['public']['Tables']['shows']['Row']

export function useShowGroups(sort: GroupSortOption = 'added_at') {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shows', user?.id, 'groups', sort],
    queryFn: async () => {
      let showQuery = supabase.from('shows').select('*')
      if (sort === 'title') {
        showQuery = showQuery.order('title', { ascending: true })
      } else {
        showQuery = showQuery.order('added_at', { ascending: false })
      }
      const [showsResult, rewatchesResult] = await Promise.all([
        showQuery,
        supabase.from('rewatches').select('id, show_id, status'),
      ])
      if (showsResult.error) throw showsResult.error
      if (rewatchesResult.error) throw rewatchesResult.error

      const shows: Show[] = showsResult.data
      const rewatches = rewatchesResult.data

      const inProgressIdByShow = new Map<string, string>()
      const hasCompletedByShow = new Set<string>()
      for (const r of rewatches) {
        if (r.status === 'in_progress') inProgressIdByShow.set(r.show_id, r.id)
        if (r.status === 'completed') hasCompletedByShow.add(r.show_id)
      }

      const inProgressIds = [...inProgressIdByShow.values()]
      const logCounts = new Map<string, number>()
      if (inProgressIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('progress_logs')
          .select('rewatch_id')
          .in('rewatch_id', inProgressIds)
        if (logsError) throw logsError
        for (const log of logs) {
          logCounts.set(log.rewatch_id, (logCounts.get(log.rewatch_id) ?? 0) + 1)
        }
      }

      const watching: Show[] = []
      const queue: Show[] = []
      const done: Show[] = []

      for (const show of shows) {
        const rewatchId = inProgressIdByShow.get(show.id)
        const count = rewatchId ? (logCounts.get(rewatchId) ?? 0) : 0
        const hasCompleted = hasCompletedByShow.has(show.id)

        if (count > 0) {
          watching.push(show)
        } else if (!hasCompleted) {
          queue.push(show)
        } else {
          done.push(show)
        }
      }

      queue.sort((a, b) => {
        const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER
        return aOrder - bOrder
      })

      return { watching, queue, done }
    },
    enabled: !!user,
  })
}

export function useShows(sort: SortOption = 'added_at') {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['shows', user?.id, sort],
    queryFn: async () => {
      let query = supabase.from('shows').select('*')
      if (sort === 'title') {
        query = query.order('title', { ascending: true })
      } else if (sort === 'manual') {
        query = query
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('added_at', { ascending: false })
      } else {
        query = query.order('added_at', { ascending: false })
      }
      const { data, error } = await query
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

export function useUpdateShowOrder() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from('shows').update({ sort_order }).eq('id', id)
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
    },
  })
}
