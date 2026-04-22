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
        .select('*')
        .eq('rewatch_id', rewatchId!)
        .order('logged_at', { ascending: true })
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
        const { error: backfillError } = await supabase.from('progress_logs').insert(backfill)
        if (backfillError) throw backfillError
      }

      if (!existingSet.has(`${season}x${episode}`)) {
        const { error: logError } = await supabase.from('progress_logs').insert({
          rewatch_id: rewatchId,
          user_id: user.id,
          season,
          episode,
          logged_at: now,
          note: note ?? null,
        })
        if (logError) throw logError
      }

      if (isSeriesComplete(season, episode, totalSeasons, episodesPerSeason)) {
        const { error: updateError } = await supabase
          .from('rewatches')
          .update({ completed_at: now, status: 'completed' })
          .eq('id', rewatchId)
        if (updateError) throw updateError

        const { data: newRewatch, error: insertError } = await supabase
          .from('rewatches')
          .insert({ show_id: showId, user_id: user.id, status: 'in_progress' })
          .select()
          .single()
        if (insertError) throw insertError

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
