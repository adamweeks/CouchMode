import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLogEpisodeSheet } from './useLogEpisodeSheet'
import type { Database } from '../lib/database.types'

type Show = Database['public']['Tables']['shows']['Row']

const mockMutateAsync = vi.fn()
const mockDeleteAsync = vi.fn()
const mockPresentToast = vi.fn()

vi.mock('./useProgressLogs', () => ({
  useLogProgress: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
  useDeleteProgressLogs: vi.fn(() => ({ mutateAsync: mockDeleteAsync })),
}))

vi.mock('@ionic/react', () => ({
  useIonActionSheet: () => [vi.fn()],
  useIonAlert: () => [vi.fn()],
  useIonToast: () => [mockPresentToast],
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

function makeShow(overrides: Partial<Show> = {}): Show {
  return {
    id: 'show-1',
    tmdb_id: '100',
    title: 'Breaking Bad',
    poster_url: null,
    total_seasons: 2,
    episodes_per_season: [7, 13],
    streaming_providers: null,
    sort_order: null,
    added_at: '2024-01-01T00:00:00Z',
    providers_updated_at: null,
    user_id: 'user-1',
    ...overrides,
  } as Show
}

describe('useLogEpisodeSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue({ completed: false, insertedIds: ['log-new'] })
    mockDeleteAsync.mockResolvedValue(undefined)
  })

  describe('nextEp computation', () => {
    it('returns the next episode within a season', () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 1, episode: 3 }),
      )
      expect(result.current.nextEp).toEqual({ season: 1, episode: 4 })
    })

    it('rolls over to the next season after the last episode', () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 1, episode: 7 }),
      )
      expect(result.current.nextEp).toEqual({ season: 2, episode: 1 })
    })

    it('returns S1 E1 when there is no progress yet', () => {
      const { result } = renderHook(() => useLogEpisodeSheet(makeShow(), 'rw-1', null))
      expect(result.current.nextEp).toEqual({ season: 1, episode: 1 })
    })

    it('returns null (and null logNext) at the final episode', () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 2, episode: 13 }),
      )
      expect(result.current.nextEp).toBeNull()
      expect(result.current.logNext).toBeNull()
    })

    it('returns null instead of a nonexistent episode when the next season is empty', () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(
          makeShow({ total_seasons: 2, episodes_per_season: [8, 0] }),
          'rw-1',
          { season: 1, episode: 8 },
        ),
      )
      expect(result.current.nextEp).toBeNull()
      expect(result.current.logNext).toBeNull()
    })

    it('returns null when there is no active rewatch', () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), null, { season: 1, episode: 3 }),
      )
      expect(result.current.nextEp).toBeNull()
      expect(result.current.logNext).toBeNull()
    })
  })

  describe('logNext', () => {
    it('logs the next episode and shows a toast with an Undo button', async () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 1, episode: 3 }),
      )

      result.current.logNext!()

      await waitFor(() => expect(mockPresentToast).toHaveBeenCalled())
      expect(mockMutateAsync).toHaveBeenCalledWith({
        rewatchId: 'rw-1',
        showId: 'show-1',
        season: 1,
        episode: 4,
        totalSeasons: 2,
        episodesPerSeason: [7, 13],
      })

      const toast = mockPresentToast.mock.calls[0][0]
      expect(toast.message).toBe('S1 E4 ✓')
      expect(toast.buttons).toHaveLength(1)
      expect(toast.buttons[0].text).toBe('Undo')
    })

    it('deletes the inserted logs when Undo is tapped', async () => {
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 1, episode: 3 }),
      )

      result.current.logNext!()
      await waitFor(() => expect(mockPresentToast).toHaveBeenCalled())

      const toast = mockPresentToast.mock.calls[0][0]
      toast.buttons[0].handler()

      await waitFor(() =>
        expect(mockDeleteAsync).toHaveBeenCalledWith({
          ids: ['log-new'],
          rewatchId: 'rw-1',
          showId: 'show-1',
        }),
      )
    })

    it('shows a completion toast without Undo when the series finishes', async () => {
      mockMutateAsync.mockResolvedValue({
        completed: true,
        newRewatchId: 'rw-2',
        insertedIds: ['log-new'],
      })
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 2, episode: 12 }),
      )

      result.current.logNext!()

      await waitFor(() => expect(mockPresentToast).toHaveBeenCalled())
      const toast = mockPresentToast.mock.calls[0][0]
      expect(toast.message).toContain('series complete')
      expect(toast.buttons).toBeUndefined()
    })

    it('shows an error toast when logging fails', async () => {
      mockMutateAsync.mockRejectedValue(new Error('insert failed'))
      const { result } = renderHook(() =>
        useLogEpisodeSheet(makeShow(), 'rw-1', { season: 1, episode: 3 }),
      )

      result.current.logNext!()

      await waitFor(() => expect(mockPresentToast).toHaveBeenCalled())
      const toast = mockPresentToast.mock.calls[0][0]
      expect(toast.message).toBe('insert failed')
      expect(toast.color).toBe('danger')
    })
  })
})
