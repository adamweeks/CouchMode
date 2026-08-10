import { test, expect, visit } from '../support/fixtures'

/**
 * Signed-in ShowDetailPage. Breaking Bad (tmdb 1396) is in the library with an
 * in-progress rewatch at S1 E3, so the detail view shows current progress, the
 * up-next episode, seasons, and the remove action. A tmdb id that isn't in the
 * library instead offers "Add to Rotation".
 */
test.describe('show detail page (signed in)', () => {
  test('renders a tracked show with progress and actions', async ({ page }) => {
    await visit(page, '/tmdb/1396')

    await expect(page.getByRole('heading', { name: 'Breaking Bad' }).first()).toBeVisible()

    // Current position (S1 E3) and the next episode up (S1 E4).
    await expect(page.getByText('Last Watched')).toBeVisible()
    await expect(page.getByText('Up Next')).toBeVisible()
    await expect(page.getByText(/S1 E3/).first()).toBeVisible()
    await expect(page.getByText('Log S1 E4')).toBeVisible()

    // Season chips derived from episodes_per_season [7, 13].
    await expect(page.getByText('Seasons', { exact: true })).toBeVisible()
    await expect(page.getByText('7 eps')).toBeVisible()
    await expect(page.getByText('13 eps')).toBeVisible()

    await expect(page.getByText('Remove from Rotation')).toBeVisible()
  })

  test('offers to add a show that is not in the library', async ({ page }) => {
    await visit(page, '/tmdb/99999')

    await expect(page.getByText('Add to Rotation')).toBeVisible()
    await expect(page.getByText('Remove from Rotation')).toHaveCount(0)
  })
})
