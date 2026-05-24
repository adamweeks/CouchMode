import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useIsAdmin() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['admin', 'is-admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin')
      if (error) throw error
      return data as boolean
    },
    enabled: !!user,
  })
}
