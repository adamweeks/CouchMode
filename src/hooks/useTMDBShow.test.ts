import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTMDBShow } from './useTMDBShow'
import { createWrapper } from '../test/utils'

vi.mock('../lib/tmdb', () => ({
  fetchShowDetails: vi.fn(),
}))

import { fetchShowDetails } from '../lib/tmdb'

describe('useTMDBShow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call fetchShowDetails when tmdbId is null', () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBShow(null), { wrapper: Wrapper })
    expect(fetchShowDetails).not.toHaveBeenCalled()
  })

  it('does not call fetchShowDetails when tmdbId is undefined', () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useTMDBShow(undefined), { wrapper: Wrapper })
    expect(fetchShowDetails).not.toHaveBeenCalled()
  })

  it('calls fetchShowDetails with the numeric tmdbId when enabled', async () => {
    const mockShow = { id: 42, name: 'Test Show' }
    vi.mocked(fetchShowDetails).mockResolvedValue(mockShow as never)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useTMDBShow('42'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchShowDetails).toHaveBeenCalledWith(42)
    expect(result.current.data).toEqual(mockShow)
  })

  it('exposes error state when fetch fails', async () => {
    vi.mocked(fetchShowDetails).mockRejectedValue(new Error('fetch failed'))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useTMDBShow('99'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
