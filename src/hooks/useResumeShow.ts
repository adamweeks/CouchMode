import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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
      // Most recent activity across all in-progress rewatches, in one row.
      const { data: latestLog, error: latestError } = await supabase
        .from('progress_logs')
        .select('rewatch_id, logged_at, rewatches!inner(show_id, status)')
        .eq('rewatches.status', 'in_progress')
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latestError) throw latestError
      if (!latestLog) return null

      const rewatchId = latestLog.rewatch_id
      const showId = latestLog.rewatches.show_id

      // Highest position in that rewatch (may differ from most recent by time)
      // plus the show row, in parallel.
      const [progressResult, showResult] = await Promise.all([
        supabase
          .from('progress_logs')
          .select('id, season, episode, logged_at')
          .eq('rewatch_id', rewatchId)
          .order('season', { ascending: false })
          .order('episode', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('shows')
          .select('*')
          .eq('id', showId)
          .single(),
      ])
      if (progressResult.error) throw progressResult.error
      if (showResult.error) throw showResult.error
      if (!progressResult.data) return null

      return { show: showResult.data, rewatchId, currentProgress: progressResult.data }
    },
    enabled: !!user,
  })
}
