import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  getCurrentProgress,
  isSeriesComplete,
  getBackfillEntries,
} from '../lib/progressLogic'

export function useProgressLogs(rewatchId: string | null | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['progress_logs', rewatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_logs')
        .select('id, season, episode, logged_at')
        .eq('rewatch_id', rewatchId!)
        .order('season', { ascending: false })
        .order('episode', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user && !!rewatchId,
  })
}

export function useCurrentProgress(rewatchId: string | null | undefined) {
  const { data: logs } = useProgressLogs(rewatchId)
  if (!logs) return null
  return getCurrentProgress(logs)
}

interface LogProgressArgs {
  rewatchId: string
  showId: string
  season: number
  episode: number
  note?: string
  totalSeasons: number
  episodesPerSeason: number[]
  onSeriesComplete?: (newRewatchId: string) => void
}

export async function createNewRewatch(showId: string, userId: string) {
  const { data, error } = await supabase
    .from('rewatches')
    .insert({ show_id: showId, user_id: userId, status: 'in_progress' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeRewatch(rewatchId: string) {
  const { error } = await supabase
    .from('rewatches')
    .update({ completed_at: new Date().toISOString(), status: 'completed' })
    .eq('id', rewatchId)
  if (error) throw error
}

export function useLogProgress() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rewatchId,
      showId,
      season,
      episode,
      note,
      totalSeasons,
      episodesPerSeason,
      onSeriesComplete,
    }: LogProgressArgs) => {
      if (!user) throw new Error('Not authenticated')

      const { data: existingLogs, error: logsError } = await supabase
        .from('progress_logs')
        .select('season, episode')
        .eq('rewatch_id', rewatchId)
      if (logsError) throw logsError

      const existingSet = new Set(existingLogs.map(l => `${l.season}x${l.episode}`))
      const now = new Date().toISOString()

      const backfill = getBackfillEntries(season, episode, episodesPerSeason, existingSet, rewatchId, user.id, now)

      if (backfill.length > 0) {
        const { error } = await supabase.from('progress_logs').insert(backfill)
        if (error) throw error
      }

      if (!existingSet.has(`${season}x${episode}`)) {
        const { error } = await supabase.from('progress_logs').insert({
          rewatch_id: rewatchId,
          user_id: user.id,
          season,
          episode,
          logged_at: now,
          note: note ?? null,
        })
        if (error) throw error
      }

      if (isSeriesComplete(season, episode, totalSeasons, episodesPerSeason)) {
        await completeRewatch(rewatchId)
        const newRewatch = await createNewRewatch(showId, user.id)
        onSeriesComplete?.(newRewatch.id)
        return { completed: true, newRewatchId: newRewatch.id }
      }

      return { completed: false }
    },
    onSuccess: (_data, { showId, rewatchId }) => {
      queryClient.invalidateQueries({ queryKey: ['progress_logs', rewatchId] })
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
    },
  })
}
