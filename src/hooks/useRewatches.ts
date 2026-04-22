import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

export function useCompleteRewatch() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rewatchId, showId }: { rewatchId: string; showId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('rewatches')
        .update({ completed_at: new Date().toISOString(), status: 'completed' })
        .eq('id', rewatchId)
      if (updateError) throw updateError

      const { data: newRewatch, error: insertError } = await supabase
        .from('rewatches')
        .insert({ show_id: showId, user_id: user.id, status: 'in_progress' })
        .select()
        .single()
      if (insertError) throw insertError

      return newRewatch
    },
    onSuccess: (_data, { showId }) => {
      queryClient.invalidateQueries({ queryKey: ['rewatches', showId] })
    },
  })
}
