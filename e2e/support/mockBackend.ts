import type { Page, Route, Request } from '@playwright/test'
import { fulfillRest } from './postgrest'
import { makeDb, type MockDb } from './db'
import { buildStoredSession } from './session'

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

const EPISODE_NAMES = [
  'Pilot', 'Cat in the Bag', 'Gray Matter', 'Crazy Handful', 'A No-Rough-Stuff Deal',
  'Seven Thirty-Seven', 'Grilled', 'Bit by a Dead Bee', 'Down', 'Breakage',
  'Peekaboo', 'Phoenix', 'ABQ',
]

function findShow(db: MockDb, tmdbId: string | null) {
  return db.shows.find(s => String((s as Record<string, unknown>).tmdb_id) === String(tmdbId)) as
    | Record<string, unknown>
    | undefined
}

/** Stubs the `tmdb-search` edge function. Details + season lookups are derived
 *  from the fixture data so titles/seasons line up with the mocked DB. */
function fulfillTmdbSearch(route: Route, request: Request, db: MockDb) {
  const url = new URL(request.url())
  const tmdbId = url.searchParams.get('tmdb_id')
  const season = url.searchParams.get('season')
  const query = url.searchParams.get('query')
  const providers = url.searchParams.get('providers')

  if (season) {
    const show = findShow(db, tmdbId)
    const perSeason = (show?.episodes_per_season as number[] | undefined) ?? []
    const count = perSeason[Number(season) - 1] ?? 13
    const episodes = Array.from({ length: count }, (_, i) => ({
      episode_number: i + 1,
      name: EPISODE_NAMES[i] ?? `Episode ${i + 1}`,
      still_path: null,
      overview: `Episode ${i + 1} synopsis.`,
    }))
    return json(route, { season_number: Number(season), episodes })
  }
  if (providers) return json(route, { results: {} })
  if (query !== null) return json(route, { results: [] })

  // Show details lookup — mirror a fixture show when we have one.
  const show = findShow(db, tmdbId)
  const perSeason = (show?.episodes_per_season as number[] | undefined) ?? [13]
  return json(route, {
    id: Number(tmdbId ?? 0),
    name: (show?.title as string | undefined) ?? 'Mock Show',
    poster_path: null,
    number_of_seasons: perSeason.length,
    seasons: perSeason.map((count, i) => ({ season_number: i + 1, episode_count: count })),
    overview: `${(show?.title as string | undefined) ?? 'This show'} — a synthetic overview for tests.`,
    first_air_date: '2008-01-20',
    status: 'Ended',
    genres: [{ id: 18, name: 'Drama' }],
  })
}

/**
 * Install request mocks for the whole Supabase surface on a page: PostgREST
 * (`/rest/v1`), edge functions (`/functions/v1`), and GoTrue (`/auth/v1`).
 * TMDB image requests are also short-circuited so nothing leaves the sandbox.
 * Returns the in-memory db so a test can seed/assert against it if needed.
 */
export async function mockSupabase(page: Page, db: MockDb = makeDb()): Promise<MockDb> {
  // Register specific routes before the catch-all REST handler.
  await page.route('**/functions/v1/tmdb-search**', route => fulfillTmdbSearch(route, route.request(), db))
  await page.route('**/functions/v1/suggest-shows', route => json(route, { suggestions: [] }))

  await page.route('**/auth/v1/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, body: '' })
    if (url.pathname.endsWith('/token')) return json(route, buildStoredSession())
    if (url.pathname.endsWith('/user')) return json(route, buildStoredSession().user)
    return json(route, {})
  })

  await page.route('**/rest/v1/**', route => fulfillRest(route, route.request(), db))

  // Keep poster/logo image loads off the network.
  await page.route('**/image.tmdb.org/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))

  return db
}
