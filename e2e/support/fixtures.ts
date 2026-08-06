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

export { expect }
