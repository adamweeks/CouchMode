import { test as base, expect } from '@playwright/test'
import { mockSupabase } from './mockBackend'
import { makeDb, type MockDb } from './db'
import { authStorageKey, buildStoredSession } from './session'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'

/**
 * Authenticated test harness (mock lane). Every test built on this `test`:
 *   1. gets an in-memory Supabase backend mocked on its page, and
 *   2. boots already signed-in — a synthetic session is written to
 *      localStorage via addInitScript, before the app's first `getSession()`.
 *
 * Use `db` to customise fixture data before navigating.
 */
export const test = base.extend<{ db: MockDb }>({
  db: async ({}, use) => {
    await use(makeDb())
  },
  page: async ({ page, db }, use) => {
    // Seed the session before any app script runs, on every navigation.
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value)
      },
      [authStorageKey(SUPABASE_URL), JSON.stringify(buildStoredSession())] as const,
    )
    await mockSupabase(page, db)
    await use(page)
  },
})

/**
 * Navigate to an authenticated route.
 *
 * The app's OAuthRedirectHandler redirects to `/` on the `SIGNED_IN` event that
 * fires once when the seeded session is recovered on a fresh load — so a direct
 * `page.goto('/settings')` bounces to home. We instead land on `/` (where that
 * bounce is a no-op), wait for the app to settle signed-in, then navigate
 * within the SPA via the History API, which doesn't reload and so never fires a
 * second `SIGNED_IN`.
 */
export async function visit(page: import('@playwright/test').Page, path: string) {
  await page.goto('/')
  await expect(page.getByText('My Shows').first()).toBeVisible()
  await expect(page).toHaveURL(/\/$/) // the one-time post-auth bounce has settled
  if (path === '/') return
  await page.evaluate(p => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

export { expect }
