import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useProgressLogs,
  useCurrentProgress,
  useResetRewatch,
  createNewRewatch,
  completeRewatch,
} from './useProgressLogs'
import { createWrapper, mockUser } from '../test/utils'

const { mockFrom, mockChain } = vi.hoisted(() => {
  let result: { data: unknown; error: unknown } = { data: [], error: null }

  const chain: Record<string, unknown> = {
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
    // Thenable so `await chain` resolves
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (r: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not']) {
    ;(chain[m] as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  }
  ;(chain.single as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve(result))
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(() => Promise.resolve(result))

  // Expose a way to change the resolve value from tests
  ;(chain as Record<string, unknown>).__setResult = (r: typeof result) => { result = r }

  return { mockFrom: vi.fn().mockReturnValue(chain), mockChain: chain }
})

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

function setResult(data: unknown, error: unknown = null) {
  ;(mockChain as Record<string, (r: { data: unknown; error: unknown }) => void>).__setResult({ data, error })
}

function resetMocks() {
  mockFrom.mockClear()
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not', 'insert', 'update', 'delete', 'single', 'maybeSingle']) {
    const fn = mockChain[m as keyof typeof mockChain] as ReturnType<typeof vi.fn>
    fn.mockClear()
  }
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not']) {
    ;(mockChain[m as keyof typeof mockChain] as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)
  }
  ;(mockChain.single as ReturnType<typeof vi.fn>).mockImplementation(() =>
    Promise.resolve((mockChain as Record<string, unknown>).__setResult as unknown),
  )
  mockFrom.mockReturnValue(mockChain)
  setResult([])
}

describe('createNewRewatch', () => {
  beforeEach(resetMocks)

  it('inserts a new rewatch and returns the created row', async () => {
    const newRow = { id: 'rw-new', show_id: 'show-1', status: 'in_progress' }
    const singleFn = vi.fn().mockResolvedValue({ data: newRow, error: null })
    const insertChain = {
      ...mockChain,
      select: vi.fn().mockReturnValue({ single: singleFn }),
    }
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) })

    const result = await createNewRewatch('show-1', 'user-1')
    expect(result).toEqual(newRow)
  })

  it('throws when insert returns an error', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') })
    const insertChain = {
      ...mockChain,
      select: vi.fn().mockReturnValue({ single: singleFn }),
    }
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) })

    await expect(createNewRewatch('show-1', 'user-1')).rejects.toThrow('insert failed')
  })
})

describe('completeRewatch', () => {
  beforeEach(() => {
    resetMocks()
    ;(mockChain.update as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)
    ;(mockChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
  })

  it('updates the rewatch status to completed', async () => {
    await completeRewatch('rw-1')

    expect(mockFrom).toHaveBeenCalledWith('rewatches')
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    )
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'rw-1')
  })

  it('uses the provided completedAt date', async () => {
    const date = '2024-06-15T10:00:00Z'
    await completeRewatch('rw-1', date)

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: date }),
    )
  })

  it('throws when update returns an error', async () => {
    ;(mockChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('update failed') })
    await expect(completeRewatch('rw-1')).rejects.toThrow('update failed')
  })
})

describe('useResetRewatch', () => {
  beforeEach(() => {
    resetMocks()
    ;(mockChain.delete as ReturnType<typeof vi.fn>).mockReturnValue(mockChain)
    ;(mockChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
  })

  it('deletes all progress logs for the rewatch', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useResetRewatch(), { wrapper: Wrapper })

    await result.current.mutateAsync({ rewatchId: 'rw-1', showId: 'show-1' })

    expect(mockFrom).toHaveBeenCalledWith('progress_logs')
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('rewatch_id', 'rw-1')
  })

  it('throws when the delete fails', async () => {
    ;(mockChain.eq as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error('delete failed') })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useResetRewatch(), { wrapper: Wrapper })

    await expect(
      result.current.mutateAsync({ rewatchId: 'rw-1', showId: 'show-1' }),
    ).rejects.toThrow('delete failed')
  })
})

describe('useProgressLogs', () => {
  beforeEach(resetMocks)

  it('is disabled when rewatchId is null', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useProgressLogs(null), { wrapper: Wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fetches logs when rewatchId is provided', async () => {
    const logs = [{ id: 'log-1', season: 1, episode: 3, logged_at: '2024-01-01' }]
    setResult(logs)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useProgressLogs('rw-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(logs)
  })

  it('exposes error state when query fails', async () => {
    setResult(null, new Error('query failed'))

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useProgressLogs('rw-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCurrentProgress', () => {
  beforeEach(resetMocks)

  it('returns null when there are no logs', async () => {
    setResult([])

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCurrentProgress('rw-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current).toBeNull())
  })

  it('returns the highest-position log', async () => {
    const logs = [
      { id: '1', season: 1, episode: 5, logged_at: '' },
      { id: '2', season: 2, episode: 1, logged_at: '' },
      { id: '3', season: 1, episode: 10, logged_at: '' },
    ]
    setResult(logs)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCurrentProgress('rw-1'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current?.season).toBe(2)
    expect(result.current?.episode).toBe(1)
  })
})
