import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShowCard } from './ShowCard'
import type { Database } from '../lib/database.types'

type Show = Database['public']['Tables']['shows']['Row']

const mockNavigateFn = vi.fn()
const mockLogNext = vi.fn()
const mockPresent = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigateFn) }
})

vi.mock('../hooks/useRewatches', () => ({
  useRewatches: vi.fn(),
}))

vi.mock('../hooks/useProgressLogs', () => ({
  useCurrentProgress: vi.fn(),
}))

vi.mock('../hooks/useTMDBSeason', () => ({
  useTMDBSeason: vi.fn(() => ({ data: undefined })),
}))

vi.mock('../hooks/useLogEpisodeSheet', () => ({
  useLogEpisodeSheet: vi.fn(),
}))

vi.mock('./LogProgressModal', () => ({
  LogProgressModal: () => null,
}))

import { useRewatches } from '../hooks/useRewatches'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'

function makeShow(overrides: Partial<Show> = {}): Show {
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
  } as Show
}

function setupWatching() {
  vi.mocked(useRewatches).mockReturnValue({
    data: [{ id: 'rw-1', status: 'in_progress' }],
  } as unknown as ReturnType<typeof useRewatches>)
  vi.mocked(useCurrentProgress).mockReturnValue({
    id: 'log-1',
    season: 1,
    episode: 3,
    logged_at: '2024-01-01T00:00:00Z',
  })
  vi.mocked(useLogEpisodeSheet).mockReturnValue({
    present: mockPresent,
    nextEp: { season: 1, episode: 4 },
    logNext: mockLogNext,
    isLogging: false,
  })
}

describe('ShowCard quick-log button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a +1 button for a watching show', () => {
    setupWatching()
    render(<ShowCard show={makeShow()} />)
    expect(
      screen.getByRole('button', { name: 'Log next episode of Breaking Bad' }),
    ).toBeInTheDocument()
  })

  it('logs the next episode on tap without navigating to the show', () => {
    setupWatching()
    render(<ShowCard show={makeShow()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Log next episode of Breaking Bad' }))

    expect(mockLogNext).toHaveBeenCalledTimes(1)
    expect(mockNavigateFn).not.toHaveBeenCalled()
  })

  it('disables the button while a log is in flight', () => {
    setupWatching()
    vi.mocked(useLogEpisodeSheet).mockReturnValue({
      present: mockPresent,
      nextEp: { season: 1, episode: 4 },
      logNext: mockLogNext,
      isLogging: true,
    })
    render(<ShowCard show={makeShow()} />)
    expect(
      screen.getByRole('button', { name: 'Log next episode of Breaking Bad' }),
    ).toBeDisabled()
  })

  it('does not render the button for a completed show', () => {
    vi.mocked(useRewatches).mockReturnValue({
      data: [{ id: 'rw-1', status: 'completed' }],
    } as unknown as ReturnType<typeof useRewatches>)
    vi.mocked(useCurrentProgress).mockReturnValue(null)
    vi.mocked(useLogEpisodeSheet).mockReturnValue({
      present: mockPresent,
      nextEp: null,
      logNext: null,
      isLogging: false,
    })
    render(<ShowCard show={makeShow()} />)
    expect(
      screen.queryByRole('button', { name: /Log next episode/ }),
    ).not.toBeInTheDocument()
  })

  it('does not render the button in reorder mode', () => {
    setupWatching()
    render(<ShowCard show={makeShow()} reorderMode />)
    expect(
      screen.queryByRole('button', { name: /Log next episode/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the last completed date for a done show', () => {
    vi.mocked(useRewatches).mockReturnValue({
      data: [
        { id: 'rw-2', status: 'completed', completed_at: '2026-06-15T00:00:00Z' },
        { id: 'rw-1', status: 'completed', completed_at: '2025-02-10T00:00:00Z' },
      ],
    } as unknown as ReturnType<typeof useRewatches>)
    vi.mocked(useCurrentProgress).mockReturnValue(null)
    vi.mocked(useLogEpisodeSheet).mockReturnValue({
      present: mockPresent,
      nextEp: null,
      logNext: null,
      isLogging: false,
    })
    render(<ShowCard show={makeShow()} />)
    expect(screen.getByText('Completed · Jun 2026')).toBeInTheDocument()
  })

  it('falls back to plain Completed when no completed date exists', () => {
    vi.mocked(useRewatches).mockReturnValue({
      data: [{ id: 'rw-1', status: 'completed', completed_at: null }],
    } as unknown as ReturnType<typeof useRewatches>)
    vi.mocked(useCurrentProgress).mockReturnValue(null)
    vi.mocked(useLogEpisodeSheet).mockReturnValue({
      present: mockPresent,
      nextEp: null,
      logNext: null,
      isLogging: false,
    })
    render(<ShowCard show={makeShow()} />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
