import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useShowGroups, useShows } from './useShows'
import { createWrapper, mockUser } from '../test/utils'
import { useAuth } from '../contexts/AuthContext'

const { mockFrom, mockRpc } = vi.hoisted(() => {
  const from = vi.fn()
  const rpc = vi.fn()
  return { mockFrom: from, mockRpc: rpc }
})

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('../lib/tmdb', () => ({
  fetchShowDetails: vi.fn(),
  extractEpisodesPerSeason: vi.fn(),
  posterUrl: vi.fn((p: string | null) => p ?? '/placeholder-poster.svg'),
  fetchWatchProviders: vi.fn().mockResolvedValue([]),
}))

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }
  for (const m of ['select', 'eq', 'or', 'not']) {
    chain[m].mockReturnValue(chain)
  }
  chain.order.mockResolvedValue(result)
  chain.in.mockResolvedValue(result)
  return chain
}

function makeShow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'show-1',
    tmdb_id: '100',
    user_id: 'user-1',
    title: 'Test Show',
    poster_url: null,
    total_seasons: 2,
    episodes_per_season: [10, 8],
    streaming_providers: null,
    sort_order: null,
    added_at: '2024-01-01T00:00:00Z',
    providers_updated_at: null,
    ...overrides,
  }
}

describe('useShowGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as ReturnType<typeof useAuth>)
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  it('places show with in-progress rewatch and logs into watching group', async () => {
    const show = makeShow()
    const rewatches = [{ id: 'rw-1', show_id: 'show-1', status: 'in_progress' }]
    mockRpc.mockResolvedValue({ data: [{ rewatch_id: 'rw-1', log_count: 1 }], error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shows') {
        return makeChain({ data: [show], error: null })
      }
      if (table === 'rewatches') {
        return { select: vi.fn().mockResolvedValue({ data: rewatches, error: null }) }
      }
      return makeChain({ data: [], error: null })
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShowGroups(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.watching.map(s => s.id)).toContain('show-1')
    expect(result.current.data?.queue).toHaveLength(0)
    expect(result.current.data?.done).toHaveLength(0)
  })

  it('places show with in-progress rewatch but no logs into queue group', async () => {
    const show = makeShow()
    const rewatches = [{ id: 'rw-1', show_id: 'show-1', status: 'in_progress' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shows') return makeChain({ data: [show], error: null })
      if (table === 'rewatches') {
        return { select: vi.fn().mockResolvedValue({ data: rewatches, error: null }) }
      }
      return makeChain({ data: [], error: null })
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShowGroups(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.queue.map(s => s.id)).toContain('show-1')
    expect(result.current.data?.watching).toHaveLength(0)
  })

  it('places show with completed rewatch and no in-progress into done group', async () => {
    const show = makeShow()
    const rewatches = [{ id: 'rw-1', show_id: 'show-1', status: 'completed' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shows') return makeChain({ data: [show], error: null })
      if (table === 'rewatches') {
        return { select: vi.fn().mockResolvedValue({ data: rewatches, error: null }) }
      }
      return makeChain({ data: [], error: null })
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShowGroups(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.done.map(s => s.id)).toContain('show-1')
    expect(result.current.data?.watching).toHaveLength(0)
    expect(result.current.data?.queue).toHaveLength(0)
  })

  it('sorts queue shows by sort_order ascending (nulls last)', async () => {
    const showA = makeShow({ id: 'show-a', title: 'A', sort_order: 2 })
    const showB = makeShow({ id: 'show-b', title: 'B', sort_order: 1 })
    const showC = makeShow({ id: 'show-c', title: 'C', sort_order: null })
    const rewatches = [
      { id: 'rw-a', show_id: 'show-a', status: 'in_progress' },
      { id: 'rw-b', show_id: 'show-b', status: 'in_progress' },
      { id: 'rw-c', show_id: 'show-c', status: 'in_progress' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'shows') return makeChain({ data: [showA, showB, showC], error: null })
      if (table === 'rewatches') {
        return { select: vi.fn().mockResolvedValue({ data: rewatches, error: null }) }
      }
      return makeChain({ data: [], error: null })
    })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShowGroups(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const queueIds = result.current.data?.queue.map(s => s.id)
    expect(queueIds).toEqual(['show-b', 'show-a', 'show-c'])
  })
})

describe('useShows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as ReturnType<typeof useAuth>)
  })

  it('is disabled when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as ReturnType<typeof useAuth>)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShows(), { wrapper: Wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches shows with added_at sort by default', async () => {
    const shows = [makeShow()]
    mockFrom.mockImplementation(() => makeChain({ data: shows, error: null }))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useShows(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(shows)
  })

  it('queries for shows from the shows table', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }))

    const { Wrapper } = createWrapper()
    renderHook(() => useShows(), { wrapper: Wrapper })

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('shows'))
  })
})
