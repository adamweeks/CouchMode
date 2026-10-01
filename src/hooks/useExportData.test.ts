import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createWrapper, mockUser } from '../test/utils'
import { EXPORT_PAGE_SIZE, fetchAllRows, useExportData } from './useExportData'

/**
 * Minimal keyset-aware query builder: serves `tables[name]` honouring
 * `.order('id')`, `.gt('id', …)` and `.limit(n)` (capped at `serverMaxRows` to
 * mimic PostgREST max-rows), and records each page request.
 */
const { tables, calls, failOnCall, serverMaxRows, mockFrom } = vi.hoisted(() => {
  const tables: Record<string, { id: string }[]> = {}
  const calls: { table: string; gt: string | null; limit: number }[] = []
  const failOnCall = { n: -1 }
  const serverMaxRows = { n: Infinity }
  const mockFrom = vi.fn((table: string) => {
    let gt: string | null = null
    let limit = Infinity
    const builder = {
      select: () => builder,
      order: () => builder,
      limit: (n: number) => {
        limit = n
        return builder
      },
      gt: (_col: string, value: string) => {
        gt = value
        return builder
      },
      then: (resolve: (r: unknown) => unknown) => {
        calls.push({ table, gt, limit })
        if (calls.length === failOnCall.n) {
          return Promise.resolve({ data: null, error: new Error('boom') }).then(resolve)
        }
        const rows = [...(tables[table] ?? [])]
          .sort((a, b) => a.id.localeCompare(b.id))
          .filter(r => gt === null || r.id > gt)
          .slice(0, Math.min(limit, serverMaxRows.n))
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      },
    }
    return builder
  })
  return { tables, calls, failOnCall, serverMaxRows, mockFrom }
})

vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

const { mockSaveFile } = vi.hoisted(() => ({ mockSaveFile: vi.fn() }))
vi.mock('../lib/exportData', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/exportData')>()),
  saveFile: mockSaveFile,
}))

function rows(count: number, prefix = 'r') {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${String(i).padStart(5, '0')}` }))
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key]
  calls.length = 0
  failOnCall.n = -1
  serverMaxRows.n = Infinity
  mockSaveFile.mockReset().mockResolvedValue(undefined)
})

describe('fetchAllRows', () => {
  it('pages past the page size using the last id as the cursor', async () => {
    tables.progress_logs = rows(EXPORT_PAGE_SIZE + 3)

    const result = await fetchAllRows('progress_logs')

    expect(result).toHaveLength(EXPORT_PAGE_SIZE + 3)
    expect(new Set(result.map(r => r.id)).size).toBe(EXPORT_PAGE_SIZE + 3)
    expect(calls.map(c => c.gt)).toEqual([null, `r-${String(EXPORT_PAGE_SIZE - 1).padStart(5, '0')}`, 'r-01002'])
    expect(calls.every(c => c.limit === EXPORT_PAGE_SIZE)).toBe(true)
  })

  it('is not truncated when the server caps rows below the page size', async () => {
    serverMaxRows.n = 400
    tables.progress_logs = rows(1001)

    const result = await fetchAllRows('progress_logs')

    expect(result).toHaveLength(1001)
  })

  it('returns an empty list for an empty table', async () => {
    expect(await fetchAllRows('shows')).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('rejects when a later page errors', async () => {
    tables.progress_logs = rows(EXPORT_PAGE_SIZE + 3)
    failOnCall.n = 2

    await expect(fetchAllRows('progress_logs')).rejects.toThrow('boom')
  })
})

describe('useExportData', () => {
  const show = {
    id: 's1', user_id: 'user-1', title: 'Lost', tmdb_id: '4607', total_seasons: 1,
    episodes_per_season: [3], added_at: '2026-01-01T00:00:00.000Z', poster_url: null, sort_order: null,
    streaming_providers: null, providers_updated_at: null, air_status: null, air_status_updated_at: null,
  }

  it('saves a CSV with a UTF-8 BOM', async () => {
    tables.shows = [show]
    const { result } = renderHook(() => useExportData(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.mutate('csv'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [filename, content, mime] = mockSaveFile.mock.calls[0]
    expect(filename).toMatch(/^couchmode-export-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(content.startsWith('\uFEFFshow_title,')).toBe(true)
    expect(content).toContain('Lost,4607')
    expect(mime).toBe('text/csv;charset=utf-8')
    expect(result.current.data).toBeUndefined()
  })

  it('saves JSON', async () => {
    tables.shows = [show]
    const { result } = renderHook(() => useExportData(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.mutate('json'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [filename, content, mime] = mockSaveFile.mock.calls[0]
    expect(filename).toMatch(/\.json$/)
    expect(JSON.parse(content).shows[0].title).toBe('Lost')
    expect(mime).toBe('application/json')
  })

  it('surfaces a fetch error and saves nothing', async () => {
    failOnCall.n = 1
    const { result } = renderHook(() => useExportData(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.mutate('csv'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockSaveFile).not.toHaveBeenCalled()
  })
})
