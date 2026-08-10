import { test, expect, visit } from '../support/fixtures'

/**
 * Signed-in HistoryPage. Fixtures include one completed rewatch (Chernobyl,
 * completed Jul 2026), so the stats block and the year-grouped list render.
 */
test.describe('history page (signed in)', () => {
  test('shows stats and the completed rewatch list', async ({ page }) => {
    await visit(page, '/history')

    await expect(page.getByText('History').first()).toBeVisible()
    await expect(page.getByText('Your Stats')).toBeVisible()
    await expect(page.getByText('Total Rewatches')).toBeVisible()

    // Year group + the completed show.
    await expect(page.getByText('2026', { exact: true })).toBeVisible()
    await expect(page.getByText('Chernobyl')).toBeVisible()
    await expect(page.getByText('Completed Jul 2026')).toBeVisible()
  })

  test('shows the empty state when nothing is completed', async ({ page, db }) => {
    db.rewatches = []
    db.progress_logs = []

    await visit(page, '/history')

    await expect(page.getByText('No completed rewatches yet')).toBeVisible()
  })
})
