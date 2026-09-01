import { test, expect } from '../support/fixtures'
import { TEST_USER } from '../support/session'

/**
 * Signed-in RotationPage. Backed by the mocked Supabase backend + a synthetic
 * session (see e2e/support), so this exercises the real authenticated UI —
 * grouping, the resume card, navigation — with deterministic data and no
 * network or credentials.
 */
test.describe('rotation page (signed in)', () => {
  test('stays on the home route instead of redirecting to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/login$/)
    await expect(page.getByText('My Shows').first()).toBeVisible()
  })

  test('groups shows into Watching, Caught Up, Up Next and Done', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Watching' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Caught Up' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Up Next' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()

    await expect(page.getByText('Breaking Bad').first()).toBeVisible() // Watching
    await expect(page.getByText('Poker Face')).toBeVisible() // Caught Up
    await expect(page.getByText('The Wire')).toBeVisible() // Up Next
    await expect(page.getByText('Chernobyl')).toBeVisible() // Done
  })

  test('shows an air-status line instead of a percentage for caught-up shows', async ({ page }) => {
    await page.goto('/')

    // Returning series with no next episode scheduled → bare "Caught up" line.
    await expect(page.getByText('Caught up', { exact: true })).toBeVisible()
  })

  test('surfaces the resume card for the most recently watched show', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Continue Watching')).toBeVisible()
    // Current progress is S1 E3, so the next episode up is S1 E4. The card shows
    // an "Up next" label (exact match avoids the "Up Next" section heading)
    // followed by the next episode.
    await expect(page.getByText('Up next', { exact: true })).toBeVisible()
    await expect(page.getByText(/S1 E4/)).toBeVisible()
  })

  test('applies home-screen preferences saved to the user record', async ({ page, db }) => {
    // A row in user_preferences (as if set on another device) should drive the
    // UI once loaded: the resume card names the last-watched episode and the
    // Done group is hidden.
    db.user_preferences = [
      {
        user_id: TEST_USER.id,
        preferences: { resumeCardMode: 'last-watched', showDoneSection: false },
        updated_at: '2026-08-05T00:00:00.000Z',
      },
    ]

    await page.goto('/')

    // Current progress is S1 E3 → "Last watched" card (vs the default "Up next").
    await expect(page.getByText('Last watched', { exact: true })).toBeVisible()
    await expect(page.getByText(/S1 E3/).first()).toBeVisible()

    // Finished shows are hidden, so the Done group and Chernobyl drop out.
    await expect(page.getByRole('heading', { name: 'Done' })).toHaveCount(0)
    await expect(page.getByText('Chernobyl')).toHaveCount(0)
  })

  test('filters the list via the search box', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('The Wire')).toBeVisible()

    const search = page.locator('ion-searchbar input')
    await search.click()
    await search.fill('breaking')

    await expect(page.getByText('Breaking Bad').first()).toBeVisible()
    await expect(page.getByText('The Wire')).toHaveCount(0)
    await expect(page.getByText('Chernobyl')).toHaveCount(0)
  })

  test('shows the empty state when the library is empty', async ({ page, db }) => {
    db.shows = []
    db.rewatches = []
    db.progress_logs = []

    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'No shows yet' })).toBeVisible()
  })
})
