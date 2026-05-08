import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTMDBSeason } from './useTMDBSeason'
import { createWrapper } from '../test/utils'

vi.mock('../lib/tmdb', () => ({
  fetchSeasonDetails: vi.fn(),
}))

import { fetchSeasonDetails } from '../lib/tmdb'

describe('useTMDBSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call fetchSeasonDetails when tmdbId is null', () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBSeason(null, 1), { wrapper: Wrapper })
    expect(fetchSeasonDetails).not.toHaveBeenCalled()
  })

  it('does not call fetchSeasonDetails when season is 0', () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBSeason('42', 0), { wrapper: Wrapper })
    expect(fetchSeasonDetails).not.toHaveBeenCalled()
  })

  it('does not call fetchSeasonDetails when season is negative', () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBSeason('42', -1), { wrapper: Wrapper })
    expect(fetchSeasonDetails).not.toHaveBeenCalled()
  })

  it('calls fetchSeasonDetails when tmdbId and season >= 1 are provided', async () => {
    const mockSeason = { season_number: 1, episodes: [] }
    vi.mocked(fetchSeasonDetails).mockResolvedValue(mockSeason as never)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useTMDBSeason('42', 1), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchSeasonDetails).toHaveBeenCalledWith('42', 1)
    expect(result.current.data).toEqual(mockSeason)
  })

  it('calls with the correct season number', async () => {
    const mockSeason = { season_number: 3, episodes: [] }
    vi.mocked(fetchSeasonDetails).mockResolvedValue(mockSeason as never)

    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBSeason('10', 3), { wrapper: Wrapper })

    await waitFor(() => expect(fetchSeasonDetails).toHaveBeenCalledWith('10', 3))
  })
})
