import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient, mockUser } from '../test/utils'
import { SearchPage } from './SearchPage'

const mockNavigateFn = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) }
})

const { mockSearchShows } = vi.hoisted(() => ({ mockSearchShows: vi.fn() }))

vi.mock('../lib/tmdb', () => ({
  searchShows: mockSearchShows,
  posterUrl: vi.fn((p: string | null) => p ?? '/placeholder-poster.svg'),
}))

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

// Make useDebounce return the value immediately (no delay in tests)
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value: string) => value),
}))

function makeChain(data: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue({ data, error: null })
  return chain
}

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Breaking Bad',
    poster_path: null,
    first_air_date: '2008-01-20',
    overview: '',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: '/search', state: {} }]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchShows.mockResolvedValue([])
    mockFrom.mockImplementation(() => makeChain([]))
  })

  it('renders the "Add a Show" title', () => {
    renderPage()
    expect(screen.getByText('Add a Show')).toBeInTheDocument()
  })

  it('shows prompt to search when query is short', () => {
    renderPage()
    expect(screen.getByText(/Search for a show/i)).toBeInTheDocument()
  })

  it('displays TMDB results when search returns data', async () => {
    mockSearchShows.mockResolvedValue([makeResult({ name: 'Breaking Bad' })])

    const { findByTestId } = renderPage()
    const input = await findByTestId('ion-searchbar')
    fireEvent.change(input, { target: { value: 'breaking' } })

    await waitFor(() => expect(screen.getByText('Breaking Bad')).toBeInTheDocument())
  })

  it('shows "No results" message when search returns empty for a long-enough query', async () => {
    mockSearchShows.mockResolvedValue([])

    const { findByTestId } = renderPage()
    const input = await findByTestId('ion-searchbar')
    fireEvent.change(input, { target: { value: 'zzznomatch' } })

    await waitFor(() =>
      expect(screen.getByText(/No results for "zzznomatch"/i)).toBeInTheDocument(),
    )
  })

  it('shows "Added" badge next to shows already in the user library', async () => {
    const existingShow = {
      id: 'show-1',
      tmdb_id: '1',
      title: 'Breaking Bad',
      poster_url: null,
      total_seasons: 5,
      episodes_per_season: [],
      streaming_providers: null,
      sort_order: null,
      added_at: '2024-01-01',
      providers_updated_at: null,
      user_id: 'user-1',
    }
    mockFrom.mockImplementation(() => makeChain([existingShow]))
    mockSearchShows.mockResolvedValue([makeResult({ id: 1, name: 'Breaking Bad' })])

    const { findByTestId } = renderPage()
    const input = await findByTestId('ion-searchbar')
    fireEvent.change(input, { target: { value: 'breaking' } })

    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument())
  })

  it('navigates to /tmdb/:id when a search result is clicked', async () => {
    mockSearchShows.mockResolvedValue([makeResult({ id: 42, name: 'Better Call Saul' })])

    const { findByTestId } = renderPage()
    const input = await findByTestId('ion-searchbar')
    fireEvent.change(input, { target: { value: 'better' } })

    const resultItem = await screen.findByText('Better Call Saul')
    // Click the item container
    const container = resultItem.closest('[role="button"]') ?? resultItem.parentElement ?? resultItem
    fireEvent.click(container)

    await waitFor(() =>
      expect(mockNavigateFn).toHaveBeenCalledWith('/tmdb/42', expect.anything()),
    )
  })
})
