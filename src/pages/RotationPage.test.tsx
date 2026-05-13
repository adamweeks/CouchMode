import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient, mockUser } from '../test/utils'
import { RotationPage } from './RotationPage'

const mockNavigateFn = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) }
})

const mockUpdateOrder = vi.fn()
const mockRefreshProviders = vi.fn()

vi.mock('../hooks/useShows', () => ({
  useShowGroups: vi.fn(),
  useUpdateShowOrder: vi.fn(() => ({ mutate: mockUpdateOrder })),
  useRefreshProviders: vi.fn(() => mockRefreshProviders),
}))

vi.mock('../hooks/useResumeShow', () => ({
  useResumeShow: vi.fn(() => ({ data: null })),
}))

vi.mock('../lib/tmdb', () => ({
  searchShows: vi.fn().mockResolvedValue([]),
  posterUrl: vi.fn((p: string | null) => p ?? '/placeholder-poster.svg'),
}))

vi.mock('../components/ShowCard', () => ({
  ShowCard: ({ show }: { show: { title: string } }) =>
    React.createElement('div', { 'data-testid': 'show-card' }, show.title),
}))

vi.mock('../components/ResumeCard', () => ({
  ResumeCard: () => null,
}))

vi.mock('../components/WatchlistCard', () => ({
  WatchlistCard: ({ show }: { show: { title: string } }) =>
    React.createElement('div', { 'data-testid': 'watchlist-card' }, show.title),
}))

import { useShowGroups } from '../hooks/useShows'

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

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <RotationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RotationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefreshProviders.mockResolvedValue(undefined)
  })

  it('shows loading spinner while data is loading', () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument()
  })

  it('renders "No shows yet" empty state when rotation is empty', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: { watching: [], queue: [], done: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    expect(await screen.findByText('No shows yet')).toBeInTheDocument()
  })

  it('renders watching section when there are watching shows', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: { watching: [makeShow()], queue: [], done: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    expect(await screen.findByText('Watching')).toBeInTheDocument()
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument()
  })

  it('renders "Up Next" section when there are queue shows', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: { watching: [], queue: [makeShow()], done: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    expect(await screen.findByText('Up Next')).toBeInTheDocument()
  })

  it('renders "Done" section when there are done shows', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: {
        watching: [],
        queue: [],
        done: [makeShow({ title: 'Completed Show' })],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    expect(await screen.findByText('Done')).toBeInTheDocument()
  })

  it('renders "My Shows" header title in normal mode', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: { watching: [makeShow()], queue: [], done: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()
    // "My Shows" appears in the h1 header title AND the tab bar — at least one should exist
    await waitFor(() =>
      expect(screen.getAllByText('My Shows').length).toBeGreaterThan(0),
    )
  })

  it('filters shows by search query', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: {
        watching: [makeShow({ title: 'Breaking Bad' }), makeShow({ id: 'show-2', title: 'The Wire' })],
        queue: [],
        done: [],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()

    // wait for list to appear
    await screen.findByText('Breaking Bad')

    const searchInput = screen.getByTestId('ion-searchbar')
    fireEvent.change(searchInput, { target: { value: 'Wire' } })

    await waitFor(() => {
      expect(screen.queryByText('Breaking Bad')).not.toBeInTheDocument()
      expect(screen.getByText('The Wire')).toBeInTheDocument()
    })
  })

  it('shows "No matches" when search has no results in library', async () => {
    vi.mocked(useShowGroups).mockReturnValue({
      data: { watching: [makeShow({ title: 'Breaking Bad' })], queue: [], done: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useShowGroups>)
    renderPage()

    await screen.findByText('Breaking Bad')
    const searchInput = screen.getByTestId('ion-searchbar')
    fireEvent.change(searchInput, { target: { value: 'zzz' } })

    await waitFor(() => {
      expect(screen.getByText('No matches')).toBeInTheDocument()
    })
  })
})
