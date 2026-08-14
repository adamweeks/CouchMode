import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { fetchShowDetails, extractEpisodesPerSeason, extractAirStatus, posterUrl, fetchWatchProviders } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { comparePosition, isCaughtUp } from '../lib/progressLogic'
import type { AirStatus } from '../lib/progressLogic'
import { useAuth } from '../contexts/AuthContext'
import type { Database, Json } from '../lib/database.types'

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
        supabase.from('rewatches').select('id, show_id, status, completed_at'),
      ])
      if (showsResult.error) throw showsResult.error
      if (rewatchesResult.error) throw rewatchesResult.error

      const shows: Show[] = showsResult.data
      const rewatches = rewatchesResult.data

      const inProgressIdByShow = new Map<string, string>()
      const hasCompletedByShow = new Set<string>()
      const lastCompletedByShow = new Map<string, string>()
      for (const r of rewatches) {
        if (r.status === 'in_progress') inProgressIdByShow.set(r.show_id, r.id)
        if (r.status === 'completed') {
          hasCompletedByShow.add(r.show_id)
          if (r.completed_at) {
            const current = lastCompletedByShow.get(r.show_id)
            if (!current || r.completed_at > current) {
              lastCompletedByShow.set(r.show_id, r.completed_at)
            }
          }
        }
      }

      const inProgressIds = [...inProgressIdByShow.values()]
      const logCounts = new Map<string, number>()
      const maxPosByRewatch = new Map<string, { season: number; episode: number }>()
      if (inProgressIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('progress_logs')
          .select('rewatch_id, season, episode')
          .in('rewatch_id', inProgressIds)
        if (logsError) throw logsError
        for (const log of logs) {
          logCounts.set(log.rewatch_id, (logCounts.get(log.rewatch_id) ?? 0) + 1)
          const current = maxPosByRewatch.get(log.rewatch_id)
          if (!current || comparePosition(log, current) > 0) {
            maxPosByRewatch.set(log.rewatch_id, { season: log.season, episode: log.episode })
          }
        }
      }

      const watching: Show[] = []
      const caughtUp: Show[] = []
      const queue: Show[] = []
      const done: Show[] = []

      for (const show of shows) {
        const rewatchId = inProgressIdByShow.get(show.id)
        const count = rewatchId ? (logCounts.get(rewatchId) ?? 0) : 0
        const hasCompleted = hasCompletedByShow.has(show.id)

        if (count > 0) {
          const position = rewatchId ? maxPosByRewatch.get(rewatchId) ?? null : null
          const air = (show.air_status as AirStatus | null) ?? null
          if (isCaughtUp(position, air)) {
            caughtUp.push(show)
          } else {
            watching.push(show)
          }
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

      done.sort((a, b) => {
        const aDate = lastCompletedByShow.get(a.id) ?? ''
        const bDate = lastCompletedByShow.get(b.id) ?? ''
        if (aDate === bDate) return 0
        return aDate > bDate ? -1 : 1
      })

      return { watching, caughtUp, queue, done }
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
    mutationFn: async (result: TMDBSearchResult & { service?: string }) => {
      if (!user) throw new Error('Not authenticated')

      const [details, providers] = await Promise.all([
        fetchShowDetails(result.id),
        fetchWatchProviders(result.id).catch(() => []),
      ])
      const episodesPerSeason = extractEpisodesPerSeason(details)
      const now = new Date().toISOString()

      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert({
          tmdb_id: String(result.id),
          user_id: user.id,
          title: result.name,
          poster_url: posterUrl(result.poster_path),
          total_seasons: details.number_of_seasons,
          episodes_per_season: episodesPerSeason,
          streaming_providers: providers.length > 0 ? (providers as unknown as Json) : null,
          providers_updated_at: now,
          air_status: extractAirStatus(details) as unknown as Json,
          air_status_updated_at: now,
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
          service: result.service ?? null,
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

const PROVIDERS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * On mount of the show list, refreshes cached TMDB metadata for shows whose
 * data has gone stale (older than the TTL): streaming providers, air status
 * (used to surface "caught up" shows and upcoming-episode dates), and the
 * per-season episode counts (so a newly-aired episode becomes loggable and the
 * show moves back out of the caught-up group). All three share one TTL keyed on
 * `providers_updated_at`.
 */
export function useRefreshProviders() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const userId = user?.id
  return useCallback(async () => {
    if (!userId) return
    const cutoff = new Date(Date.now() - PROVIDERS_TTL_MS).toISOString()
    const { data: stale } = await supabase
      .from('shows')
      .select('id, tmdb_id')
      .or(`providers_updated_at.is.null,providers_updated_at.lt.${cutoff}`)
    if (!stale || stale.length === 0) return

    await Promise.allSettled(
      stale.map(async show => {
        const [providers, details] = await Promise.all([
          fetchWatchProviders(Number(show.tmdb_id)).catch(() => []),
          fetchShowDetails(Number(show.tmdb_id)).catch(() => null),
        ])
        const now = new Date().toISOString()
        const update: Database['public']['Tables']['shows']['Update'] = {
          streaming_providers: providers.length > 0 ? (providers as unknown as Json) : null,
          providers_updated_at: now,
        }
        if (details) {
          update.air_status = extractAirStatus(details) as unknown as Json
          update.air_status_updated_at = now
          update.episodes_per_season = extractEpisodesPerSeason(details)
          update.total_seasons = details.number_of_seasons
        }
        await supabase.from('shows').update(update).eq('id', show.id)
      })
    )
    queryClient.invalidateQueries({ queryKey: ['shows', userId] })
  }, [userId, queryClient])
}
