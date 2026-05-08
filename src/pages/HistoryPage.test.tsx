import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient, mockUser } from '../test/utils'
import { HistoryPage } from './HistoryPage'

const mockNavigateFn = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) }
})

const { mockFrom } = vi.hoisted(() => {
  const from = vi.fn()
  return { mockFrom: from }
})

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
  }
  for (const m of ['select', 'eq', 'or']) {
    chain[m].mockReturnValue(chain)
  }
  chain.not.mockReturnValue(chain)
  chain.order.mockResolvedValue(result)
  return chain
}

function makeShow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'show-1',
    tmdb_id: '100',
    title: 'Breaking Bad',
    poster_url: null,
    total_seasons: 5,
    episodes_per_season: [7, 13, 13, 13, 16],
    streaming_providers: null,
    sort_order: null,
    added_at: '2024-01-01T00:00:00Z',
    providers_updated_at: null,
    user_id: 'user-1',
    ...overrides,
  }
}

function makeRewatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rw-1',
    show_id: 'show-1',
    completed_at: '2024-06-15T00:00:00Z',
    started_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function setupMocks(rewatches: ReturnType<typeof makeRewatch>[], shows: ReturnType<typeof makeShow>[]) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    return makeChain({ data: callCount === 1 ? rewatches : shows, error: null })
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the History page heading', async () => {
    setupMocks([], [])
    renderPage()
    expect(screen.getAllByText('History').length).toBeGreaterThan(0)
  })

  it('renders empty state when no completed rewatches', async () => {
    setupMocks([], [])
    const { findByText } = renderPage()
    expect(await findByText(/No completed rewatches yet/i)).toBeInTheDocument()
  })

  it('renders total rewatch count stat', async () => {
    const rewatches = [makeRewatch(), makeRewatch({ id: 'rw-2' })]
    const shows = [makeShow()]
    setupMocks(rewatches, shows)

    const { findByText } = renderPage()
    expect(await findByText('Total Rewatches')).toBeInTheDocument()
    expect(await findByText('2')).toBeInTheDocument()
  })

  it('renders shows grouped by completion year', async () => {
    const rewatches = [makeRewatch({ completed_at: '2024-06-15T00:00:00Z' })]
    const shows = [makeShow({ title: 'Breaking Bad' })]
    setupMocks(rewatches, shows)

    const { findByText } = renderPage()
    expect(await findByText('2024')).toBeInTheDocument()
    expect(await findByText('Breaking Bad')).toBeInTheDocument()
  })

  it('navigates to /tmdb/:tmdbId when a show row is clicked', async () => {
    const rewatches = [makeRewatch({ show_id: 'show-1', completed_at: '2024-06-15T00:00:00Z' })]
    const shows = [makeShow({ id: 'show-1', tmdb_id: '100', title: 'Breaking Bad' })]
    setupMocks(rewatches, shows)

    const { findByText } = renderPage()
    fireEvent.click(await findByText('Breaking Bad'))
    await waitFor(() =>
      expect(mockNavigateFn).toHaveBeenCalledWith('/tmdb/100'),
    )
  })
})
