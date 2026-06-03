import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}))
import {
  posterUrl,
  providerLogoUrl,
  extractEpisodesPerSeason,
  searchShows,
  fetchShowDetails,
  fetchWatchProviders,
} from './tmdb'
import type { TMDBShowDetails } from './tmdb'

describe('posterUrl', () => {
  it('returns placeholder for null', () => {
    expect(posterUrl(null)).toBe('/placeholder-poster.svg')
  })

  it('returns placeholder for undefined', () => {
    expect(posterUrl(undefined)).toBe('/placeholder-poster.svg')
  })

  it('returns the path unchanged when it starts with http', () => {
    const url = 'https://example.com/image.jpg'
    expect(posterUrl(url)).toBe(url)
  })

  it('prepends the TMDB image base for a tmdb path', () => {
    expect(posterUrl('/abc123.jpg')).toBe('https://image.tmdb.org/t/p/w300/abc123.jpg')
  })
})

describe('providerLogoUrl', () => {
  it('prepends the TMDB logo base', () => {
    expect(providerLogoUrl('/logo.png')).toBe('https://image.tmdb.org/t/p/w45/logo.png')
  })
})

describe('extractEpisodesPerSeason', () => {
  const makeDetails = (seasons: { season_number: number; episode_count: number }[]): TMDBShowDetails => ({
    id: 1,
    name: 'Test Show',
    poster_path: null,
    number_of_seasons: seasons.filter(s => s.season_number > 0).length,
    seasons,
    overview: '',
    first_air_date: '2020-01-01',
    status: 'Ended',
    genres: [],
  })

  it('returns episode counts in season order', () => {
    const details = makeDetails([
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 8 },
      { season_number: 3, episode_count: 6 },
    ])
    expect(extractEpisodesPerSeason(details)).toEqual([10, 8, 6])
  })

  it('filters out season 0 (specials)', () => {
    const details = makeDetails([
      { season_number: 0, episode_count: 5 },
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 8 },
    ])
    expect(extractEpisodesPerSeason(details)).toEqual([10, 8])
  })

  it('sorts by season_number ascending regardless of input order', () => {
    const details = makeDetails([
      { season_number: 3, episode_count: 6 },
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 8 },
    ])
    expect(extractEpisodesPerSeason(details)).toEqual([10, 8, 6])
  })

  it('returns empty array when all seasons are season 0', () => {
    const details = makeDetails([{ season_number: 0, episode_count: 3 }])
    expect(extractEpisodesPerSeason(details)).toEqual([])
  })

  it('returns empty array for no seasons', () => {
    const details = makeDetails([])
    expect(extractEpisodesPerSeason(details)).toEqual([])
  })
})

describe('searchShows', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns results array on success', async () => {
    const mockResults = [{ id: 1, name: 'Breaking Bad' }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: mockResults }),
      }),
    )
    const results = await searchShows('Breaking Bad')
    expect(results).toEqual(mockResults)
  })

  it('returns empty array when results key is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    )
    const results = await searchShows('nothing')
    expect(results).toEqual([])
  })

  it('throws when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    await expect(searchShows('fail')).rejects.toThrow('TMDB search failed')
  })
})

describe('fetchShowDetails', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    const mockShow = { id: 42, name: 'Test Show' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockShow,
      }),
    )
    const result = await fetchShowDetails(42)
    expect(result).toEqual(mockShow)
  })

  it('throws when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    await expect(fetchShowDetails(42)).rejects.toThrow('TMDB fetch failed')
  })
})

describe('fetchWatchProviders', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns US flatrate providers on success', async () => {
    const providers = [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: { US: { flatrate: providers } } }),
      }),
    )
    const result = await fetchWatchProviders(1)
    expect(result).toEqual(providers)
  })

  it('returns empty array when no US flatrate data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: {} }),
      }),
    )
    const result = await fetchWatchProviders(1)
    expect(result).toEqual([])
  })

  it('throws when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    await expect(fetchWatchProviders(1)).rejects.toThrow('TMDB providers fetch failed')
  })
})
