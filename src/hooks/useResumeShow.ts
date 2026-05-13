import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getCurrentProgress } from '../lib/progressLogic'
import type { Database } from '../lib/database.types'

type Show = Database['public']['Tables']['shows']['Row']

export interface ResumeShowData {
  show: Show
  rewatchId: string
  currentProgress: { id: string; season: number; episode: number; logged_at: string }
}

export function useResumeShow() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['resume-show', user?.id],
    queryFn: async (): Promise<ResumeShowData | null> => {
      const { data: rewatches, error: rewatchError } = await supabase
        .from('rewatches')
        .select('id, show_id')
        .eq('status', 'in_progress')
      if (rewatchError) throw rewatchError
      if (!rewatches.length) return null

      const rewatchIds = rewatches.map(r => r.id)

      const { data: latestLog } = await supabase
        .from('progress_logs')
        .select('rewatch_id, logged_at')
        .in('rewatch_id', rewatchIds)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!latestLog) return null

      const rewatch = rewatches.find(r => r.id === latestLog.rewatch_id)!

      const [logsResult, showResult] = await Promise.all([
        supabase
          .from('progress_logs')
          .select('id, season, episode, logged_at')
          .eq('rewatch_id', rewatch.id),
        supabase
          .from('shows')
          .select('*')
          .eq('id', rewatch.show_id)
          .single(),
      ])
      if (logsResult.error) throw logsResult.error
      if (showResult.error) throw showResult.error

      const currentProgress = getCurrentProgress(logsResult.data)
      if (!currentProgress) return null

      return { show: showResult.data, rewatchId: rewatch.id, currentProgress }
    },
    enabled: !!user,
  })
}
