import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { completeRewatch, createNewRewatch } from './useProgressLogs'
import { buildCompletionUpdates } from '../lib/progressLogic'

export interface MarkFinishedArgs {
  rewatchId: string
  showId: string
  startedAt?: string
  completedAt: string
  note?: string
  service?: string
}

export function useRewatches(showId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rewatches', showId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewatches')
        .select('*')
        .eq('show_id', showId)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user && !!showId,
  })
}

export function useActiveRewatch(showId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rewatches', showId, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewatches')
        .select('*')
        .eq('show_id', showId)
        .eq('status', 'in_progress')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user && !!showId,
  })
}

export function useMarkSeriesFinished() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rewatchId, showId, startedAt, completedAt, note, service }: MarkFinishedArgs) => {
      if (!user) throw new Error('Not authenticated')

      const { data: rewatch, error: fetchError } = await supabase
        .from('rewatches')
        .select('started_at')
        .eq('id', rewatchId)
        .single()
      if (fetchError) throw fetchError

      const updates = { ...buildCompletionUpdates(completedAt, rewatch.started_at, startedAt, note), service: service ?? null }
      const { error } = await supabase.from('rewatches').update(updates).eq('id', rewatchId)
      if (error) throw error

      return createNewRewatch(showId, user.id)
    },
    onSuccess: (_data, { showId }) => {
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
    },
  })
}

export function useUpdateRewatch(showId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rewatchId, service }: { rewatchId: string; service: string | null }) => {
      const { error } = await supabase
        .from('rewatches')
        .update({ service })
        .eq('id', rewatchId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
    },
  })
}

export function useCompleteRewatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rewatchId, showId }: { rewatchId: string; showId: string }) => {
      if (!user) throw new Error('Not authenticated')
      await completeRewatch(rewatchId)
      return createNewRewatch(showId, user.id)
    },
    onSuccess: (_data, { showId }) => {
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
      queryClient.invalidateQueries({ queryKey: ['shows', user?.id] })
    },
  })
}
