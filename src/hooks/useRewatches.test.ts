import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRewatches, useActiveRewatch } from './useRewatches'
import { createWrapper, mockUser } from '../test/utils'

const { mockFrom, mockChain } = vi.hoisted(() => {
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
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not']) {
    chain[m].mockReturnValue(chain)
  }
  return { mockFrom: vi.fn().mockReturnValue(chain), mockChain: chain }
})

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('./useProgressLogs', () => ({
  completeRewatch: vi.fn(),
  createNewRewatch: vi.fn(),
}))

function resetChain() {
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not']) {
    mockChain[m].mockReturnValue(mockChain)
  }
  mockFrom.mockReturnValue(mockChain)
}

function makeRewatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rw-1',
    show_id: 'show-1',
    user_id: 'user-1',
    status: 'in_progress',
    started_at: '2024-01-01T00:00:00Z',
    completed_at: null,
    note: null,
    ...overrides,
  }
}

describe('useRewatches', () => {
  beforeEach(resetChain)

  it('is disabled when showId is empty', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRewatches(''), { wrapper: Wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches rewatches for a show ordered by started_at descending', async () => {
    const rewatches = [makeRewatch(), makeRewatch({ id: 'rw-2', started_at: '2023-01-01' })]
    mockChain.order.mockResolvedValue({ data: rewatches, error: null })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRewatches('show-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(rewatches)
    expect(mockChain.eq).toHaveBeenCalledWith('show_id', 'show-1')
    expect(mockChain.order).toHaveBeenCalledWith('started_at', { ascending: false })
  })

  it('exposes error state when query fails', async () => {
    mockChain.order.mockResolvedValue({ data: null, error: new Error('query failed') })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRewatches('show-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useActiveRewatch', () => {
  beforeEach(resetChain)

  it('is disabled when showId is empty', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveRewatch(''), { wrapper: Wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('queries with status=in_progress filter', async () => {
    const rewatch = makeRewatch()
    mockChain.maybeSingle.mockResolvedValue({ data: rewatch, error: null })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveRewatch('show-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockChain.eq).toHaveBeenCalledWith('status', 'in_progress')
    expect(result.current.data).toEqual(rewatch)
  })

  it('returns null when no active rewatch exists', async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useActiveRewatch('show-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})
