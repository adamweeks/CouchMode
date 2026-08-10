import { test, expect } from '../support/fixtures'

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

  test('groups shows into Watching, Up Next and Done', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Watching' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Up Next' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible()

    await expect(page.getByText('Breaking Bad').first()).toBeVisible() // Watching
    await expect(page.getByText('The Wire')).toBeVisible() // Up Next
    await expect(page.getByText('Chernobyl')).toBeVisible() // Done
  })

  test('surfaces the resume card for the most recently watched show', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Continue Watching')).toBeVisible()
    // Current progress is S1 E3, so the next episode up is S1 E4.
    await expect(page.getByText(/Up next:\s*S1 E4/)).toBeVisible()
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
