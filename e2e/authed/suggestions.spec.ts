import { test, expect, visit } from '../support/fixtures'

/**
 * Signed-in SuggestionsPage. The `suggest-shows` edge function is mocked from
 * `db.suggestions`, so all three states are reachable: a populated list, the
 * "nothing new" state (has shows but no suggestions), and the "no suggestions
 * yet" state (empty library).
 */
test.describe('suggestions page (signed in)', () => {
  test('lists AI suggestions with their reasons', async ({ page, db }) => {
    db.suggestions = [
      {
        tmdb: {
          id: 1668,
          name: 'The Sopranos',
          poster_path: null,
          first_air_date: '1999-01-10',
          overview: '',
        },
        reason: 'Another prestige crime drama',
      },
    ]

    await visit(page, '/suggestions')

    await expect(page.getByText('Suggested for You').first()).toBeVisible()
    await expect(page.getByText('The Sopranos')).toBeVisible()
    await expect(page.getByText(/Another prestige crime drama/)).toBeVisible()
  })

  test('shows the "nothing new" state when there are no suggestions', async ({ page }) => {
    // Default db has shows but db.suggestions is empty.
    await visit(page, '/suggestions')

    await expect(page.getByRole('heading', { name: 'Nothing new to suggest' })).toBeVisible()
    await expect(page.getByText('Refresh', { exact: true })).toBeVisible()
  })

  test('prompts to add shows when the library is empty', async ({ page, db }) => {
    db.shows = []
    db.rewatches = []
    db.progress_logs = []

    await visit(page, '/suggestions')

    await expect(page.getByRole('heading', { name: 'No suggestions yet' })).toBeVisible()
    await expect(page.getByText('Browse My Shows')).toBeVisible()
  })
})
