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

export async function completeRewatch(rewatchId: string, completedAt?: string) {
  const { error } = await supabase
    .from('rewatches')
    .update({ completed_at: completedAt ?? new Date().toISOString(), status: 'completed' })
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

      const rows = getBackfillEntries(season, episode, episodesPerSeason, existingSet, rewatchId, user.id, now)
      if (!existingSet.has(`${season}x${episode}`)) {
        rows.push({ rewatch_id: rewatchId, user_id: user.id, season, episode, logged_at: now, note: note ?? null })
      }
      let insertedIds: string[] = []
      if (rows.length > 0) {
        // Upsert so concurrent logs (double-tap, second device) hit the
        // uq_progress_logs_rewatch_position index instead of duplicating rows.
        // select() only returns rows that were actually inserted, so undo
        // never deletes logs that existed before this mutation.
        const { data: inserted, error } = await supabase
          .from('progress_logs')
          .upsert(rows, { onConflict: 'rewatch_id,season,episode', ignoreDuplicates: true })
          .select('id')
        if (error) throw error
        insertedIds = (inserted ?? []).map(r => r.id)
      }

      if (isSeriesComplete(season, episode, totalSeasons, episodesPerSeason)) {
        await completeRewatch(rewatchId)
        const newRewatch = await createNewRewatch(showId, user.id)
        onSeriesComplete?.(newRewatch.id)
        return { completed: true, newRewatchId: newRewatch.id, insertedIds }
      }

      return { completed: false, insertedIds }
    },
    onSuccess: (_data, { showId, rewatchId }) => {
      queryClient.invalidateQueries({ queryKey: ['progress_logs', rewatchId] })
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['resume-show', user?.id] })
    },
  })
}

interface DeleteProgressLogsArgs {
  ids: string[]
  rewatchId: string
  showId: string
}

interface ResetRewatchArgs {
  rewatchId: string
  showId: string
}

/**
 * Clears every progress log for an in-progress rewatch, undoing an
 * accidentally-started ("restarted") rewatch. The rewatch row itself is kept
 * (empty, still in_progress) so the show falls back to its previous state —
 * Done if it has completed rewatches, otherwise Up Next — and stays ready for
 * the next real start. Completed rewatch history is untouched.
 */
export function useResetRewatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rewatchId }: ResetRewatchArgs) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('progress_logs')
        .delete()
        .eq('rewatch_id', rewatchId)
      if (error) throw error
    },
    onSuccess: (_data, { showId, rewatchId }) => {
      queryClient.invalidateQueries({ queryKey: ['progress_logs', rewatchId] })
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['resume-show', user?.id] })
    },
  })
}

export function useDeleteProgressLogs() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids }: DeleteProgressLogsArgs) => {
      if (!user) throw new Error('Not authenticated')
      if (ids.length === 0) return
      const { error } = await supabase.from('progress_logs').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: (_data, { showId, rewatchId }) => {
      queryClient.invalidateQueries({ queryKey: ['progress_logs', rewatchId] })
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['resume-show', user?.id] })
    },
  })
}
