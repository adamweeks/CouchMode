import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient, mockUser } from '../test/utils'
import { ShowDetailPage } from './ShowDetailPage'

const {
  mockNavigateFn,
  mockUseTMDBShow,
  mockUseShows,
  mockUseRewatches,
  mockUseActiveRewatch,
  mockUseCurrentProgress,
  mockUseAddShow,
  mockUseRemoveShow,
} = vi.hoisted(() => ({
  mockNavigateFn: vi.fn(),
  mockUseTMDBShow: vi.fn(),
  mockUseShows: vi.fn(),
  mockUseRewatches: vi.fn(),
  mockUseActiveRewatch: vi.fn(),
  mockUseCurrentProgress: vi.fn(),
  mockUseAddShow: vi.fn(),
  mockUseRemoveShow: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) }
})

vi.mock('../hooks/useTMDBShow', () => ({ useTMDBShow: mockUseTMDBShow }))
vi.mock('../hooks/useShows', () => ({
  useShows: mockUseShows,
  useAddShow: mockUseAddShow,
  useRemoveShow: mockUseRemoveShow,
}))
vi.mock('../hooks/useRewatches', () => ({
  useRewatches: mockUseRewatches,
  useActiveRewatch: mockUseActiveRewatch,
}))
vi.mock('../hooks/useProgressLogs', () => ({
  useCurrentProgress: mockUseCurrentProgress,
}))
vi.mock('../hooks/useTMDBSeason', () => ({
  useTMDBSeason: vi.fn(() => ({ data: undefined })),
}))
vi.mock('../hooks/useLogEpisodeSheet', () => ({
  useLogEpisodeSheet: vi.fn(() => ({ present: vi.fn(), nextEp: null, logNext: null })),
}))
vi.mock('../lib/tmdb', () => ({
  posterUrl: vi.fn((p: string | null) => p ?? '/placeholder-poster.svg'),
  providerLogoUrl: vi.fn((p: string) => p),
}))
vi.mock('../components/MarkFinishedModal', () => ({
  MarkFinishedModal: () => null,
}))
vi.mock('../components/LogProgressModal', () => ({
  LogProgressModal: () => null,
}))

const mockTMDBShow = {
  id: 100,
  name: 'Breaking Bad',
  poster_path: '/poster.jpg',
  number_of_seasons: 5,
  seasons: [
    { season_number: 1, episode_count: 7 },
    { season_number: 2, episode_count: 13 },
  ],
  overview: 'A chemistry teacher turns to cooking meth.',
  first_air_date: '2008-01-20',
  status: 'Ended',
  genres: [{ id: 1, name: 'Drama' }],
}

function makeShow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'show-1',
    tmdb_id: '100',
    title: 'Breaking Bad',
    poster_url: '/poster.jpg',
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

function renderPage(tmdbId = '100') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[`/tmdb/${tmdbId}`]}>
        <Routes>
          <Route path="/tmdb/:tmdbId" element={<ShowDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ShowDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTMDBShow.mockReturnValue({ data: mockTMDBShow, isLoading: false })
    mockUseShows.mockReturnValue({ data: [], isLoading: false })
    mockUseRewatches.mockReturnValue({ data: [] })
    mockUseActiveRewatch.mockReturnValue({ data: null })
    mockUseCurrentProgress.mockReturnValue(null)
    mockUseAddShow.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
    mockUseRemoveShow.mockReturnValue({ mutateAsync: vi.fn() })
  })

  it('renders a loading spinner while TMDB data is loading', () => {
    mockUseTMDBShow.mockReturnValue({ data: undefined, isLoading: true })
    mockUseShows.mockReturnValue({ data: [], isLoading: true })
    renderPage()
    expect(screen.getByTestId('ion-spinner')).toBeInTheDocument()
  })

  it('renders the show title from TMDB data', async () => {
    renderPage()
    expect((await screen.findAllByText('Breaking Bad')).length).toBeGreaterThan(0)
  })

  it('shows "Add to Rotation" button when show is not in library', async () => {
    mockUseShows.mockReturnValue({ data: [], isLoading: false })
    renderPage()
    expect(await screen.findByText('Add to Rotation')).toBeInTheDocument()
  })

  it('does not show "Add to Rotation" when show is in library', async () => {
    mockUseShows.mockReturnValue({ data: [makeShow()], isLoading: false })
    renderPage()
    await screen.findAllByText('Breaking Bad')
    expect(screen.queryByText('Add to Rotation')).not.toBeInTheDocument()
  })

  it('shows "Remove from Rotation" when show is in library', async () => {
    mockUseShows.mockReturnValue({ data: [makeShow()], isLoading: false })
    renderPage()
    expect(await screen.findByText('Remove from Rotation')).toBeInTheDocument()
  })

  it('calls addShow mutation when "Add to Rotation" is clicked', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    mockUseAddShow.mockReturnValue({ mutateAsync: mockMutate, isPending: false })
    renderPage()

    fireEvent.click(await screen.findByText('Add to Rotation'))
    await waitFor(() => expect(mockMutate).toHaveBeenCalled())
  })

  it('renders show overview', async () => {
    renderPage()
    expect(await screen.findByText('A chemistry teacher turns to cooking meth.')).toBeInTheDocument()
  })

  it('renders season breakdown', async () => {
    renderPage()
    await screen.findAllByText('Breaking Bad')
    expect(screen.getByText('S1')).toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()
  })

  it('renders current progress when show is in library with progress', async () => {
    mockUseShows.mockReturnValue({ data: [makeShow()], isLoading: false })
    mockUseActiveRewatch.mockReturnValue({ data: { id: 'rw-1', started_at: '2024-01-01' } })
    mockUseCurrentProgress.mockReturnValue({ id: 'log-1', season: 2, episode: 5, logged_at: '' })
    renderPage()
    expect(await screen.findByText('S2 E5')).toBeInTheDocument()
  })

  it('renders rewatch history for completed rewatches', async () => {
    const completedRewatch = {
      id: 'rw-1',
      show_id: 'show-1',
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-06-15T00:00:00Z',
      note: 'Great show',
    }
    mockUseShows.mockReturnValue({ data: [makeShow()], isLoading: false })
    mockUseRewatches.mockReturnValue({ data: [completedRewatch] })
    renderPage()
    expect(await screen.findByText('Rewatch History')).toBeInTheDocument()
    expect(screen.getByText('"Great show"')).toBeInTheDocument()
  })
})
