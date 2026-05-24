import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AdminOverview {
  total_users: number
  new_users_7d: number
  new_users_30d: number
  total_shows: number
  total_rewatches: number
  completed_rewatches: number
  in_progress_rewatches: number
  total_episodes_logged: number
  users_with_shows: number
  avg_shows_per_active_user: number
}

export interface AdminUser {
  user_id: string
  email: string
  display_name: string
  created_at: string
  last_sign_in_at: string | null
  show_count: number
  episode_count: number
  rewatch_count: number
}

export interface PopularShow {
  tmdb_id: string
  title: string
  poster_url: string | null
  user_count: number
  total_rewatches: number
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_overview')
      if (error) throw error
      return data as unknown as AdminOverview
    },
  })
}

export function useAdminUserList() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_list')
      if (error) throw error
      return (data ?? []) as unknown as AdminUser[]
    },
  })
}

export function useAdminPopularShows() {
  return useQuery({
    queryKey: ['admin', 'popular-shows'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_popular_shows')
      if (error) throw error
      return (data ?? []) as unknown as PopularShow[]
    },
  })
}
