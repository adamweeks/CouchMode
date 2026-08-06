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
]

/** Stubs the `tmdb-search` edge function. Only the season lookup fires on load. */
function fulfillTmdbSearch(route: Route, request: Request) {
  const url = new URL(request.url())
  const season = url.searchParams.get('season')
  const query = url.searchParams.get('query')
  const providers = url.searchParams.get('providers')

  if (season) {
    const episodes = Array.from({ length: 13 }, (_, i) => ({
      episode_number: i + 1,
      name: EPISODE_NAMES[i] ?? `Episode ${i + 1}`,
      still_path: null,
      overview: '',
    }))
    return json(route, { season_number: Number(season), episodes })
  }
  if (providers) return json(route, { results: {} })
  if (query !== null) return json(route, { results: [] })
  // Show details lookup.
  return json(route, {
    id: Number(url.searchParams.get('tmdb_id') ?? 0),
    name: 'Mock Show',
    poster_path: null,
    number_of_seasons: 1,
    seasons: [{ season_number: 1, episode_count: 13 }],
    overview: '',
    first_air_date: '2008-01-20',
    status: 'Ended',
    genres: [],
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
  await page.route('**/functions/v1/tmdb-search**', route => fulfillTmdbSearch(route, route.request()))
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
