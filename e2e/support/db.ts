import { TEST_USER } from './session'

/**
 * In-memory fixture data for the mocked Supabase backend. Shapes mirror the
 * `shows` / `rewatches` / `progress_logs` tables (see database.types.ts).
 *
 * The data is arranged to exercise all three RotationPage groups plus the
 * resume card:
 *   - Breaking Bad  → Watching  (in-progress rewatch with logs; current S1 E3)
 *   - The Wire      → Up Next   (in-progress rewatch, no logs yet)
 *   - Chernobyl     → Done      (only a completed rewatch)
 */

// Recent enough that useRefreshProviders() considers providers fresh (< 7 days),
// so no TMDB provider refresh fires on mount.
const FRESH = new Date(Date.now() - 60 * 60 * 1000).toISOString()

export interface MockDb {
  shows: Record<string, unknown>[]
  rewatches: Record<string, unknown>[]
  progress_logs: Record<string, unknown>[]
  /** Return value of the `is_admin` RPC. */
  isAdmin: boolean
  /** `suggest-shows` edge function payload (`{ tmdb, reason }[]`). */
  suggestions: { tmdb: Record<string, unknown>; reason: string }[]
  /** Admin RPC fixtures. */
  adminOverview: Record<string, unknown>
  adminUsers: Record<string, unknown>[]
  adminPopularShows: Record<string, unknown>[]
}

export function makeDb(): MockDb {
  const uid = TEST_USER.id
  return {
    isAdmin: false,
    suggestions: [],
    adminOverview: {
      total_users: 5,
      new_users_7d: 1,
      new_users_30d: 2,
      total_shows: 12,
      total_rewatches: 8,
      completed_rewatches: 3,
      in_progress_rewatches: 5,
      total_episodes_logged: 420,
      users_with_shows: 4,
      avg_shows_per_active_user: 3,
    },
    adminUsers: [
      {
        user_id: uid,
        email: TEST_USER.email,
        display_name: TEST_USER.email,
        created_at: '2026-01-01T00:00:00.000Z',
        last_sign_in_at: null,
        show_count: 3,
        episode_count: 120,
        rewatch_count: 2,
      },
    ],
    adminPopularShows: [
      { tmdb_id: '1396', title: 'Breaking Bad', poster_url: null, user_count: 3, total_rewatches: 5 },
      { tmdb_id: '1438', title: 'The Wire', poster_url: null, user_count: 2, total_rewatches: 1 },
    ],
    shows: [
      {
        id: 'show-breaking-bad',
        user_id: uid,
        tmdb_id: '1396',
        title: 'Breaking Bad',
        poster_url: null,
        total_seasons: 2,
        episodes_per_season: [7, 13],
        sort_order: null,
        streaming_providers: null,
        providers_updated_at: FRESH,
        added_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'show-the-wire',
        user_id: uid,
        tmdb_id: '1438',
        title: 'The Wire',
        poster_url: null,
        total_seasons: 1,
        episodes_per_season: [13],
        sort_order: 0,
        streaming_providers: null,
        providers_updated_at: FRESH,
        added_at: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'show-chernobyl',
        user_id: uid,
        tmdb_id: '87108',
        title: 'Chernobyl',
        poster_url: null,
        total_seasons: 1,
        episodes_per_season: [5],
        sort_order: null,
        streaming_providers: null,
        providers_updated_at: FRESH,
        added_at: '2026-08-03T00:00:00.000Z',
      },
    ],
    rewatches: [
      {
        id: 'rewatch-bb-1',
        user_id: uid,
        show_id: 'show-breaking-bad',
        status: 'in_progress',
        service: 'Netflix',
        note: null,
        started_at: '2026-08-04T10:00:00.000Z',
        completed_at: null,
      },
      {
        id: 'rewatch-wire-1',
        user_id: uid,
        show_id: 'show-the-wire',
        status: 'in_progress',
        service: null,
        note: null,
        started_at: '2026-08-02T09:00:00.000Z',
        completed_at: null,
      },
      {
        id: 'rewatch-chernobyl-1',
        user_id: uid,
        show_id: 'show-chernobyl',
        status: 'completed',
        service: 'HBO Max',
        note: null,
        started_at: '2026-07-01T00:00:00.000Z',
        completed_at: '2026-07-20T00:00:00.000Z',
      },
    ],
    progress_logs: [
      { id: 'log-bb-1', user_id: uid, rewatch_id: 'rewatch-bb-1', season: 1, episode: 1, logged_at: '2026-08-04T10:00:00.000Z', note: null },
      { id: 'log-bb-2', user_id: uid, rewatch_id: 'rewatch-bb-1', season: 1, episode: 2, logged_at: '2026-08-04T10:05:00.000Z', note: null },
      { id: 'log-bb-3', user_id: uid, rewatch_id: 'rewatch-bb-1', season: 1, episode: 3, logged_at: '2026-08-04T10:10:00.000Z', note: null },
    ],
  }
}
