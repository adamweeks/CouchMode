import { test, expect, visit } from '../support/fixtures'

/**
 * Admin portal. `/admin` is wrapped in AdminRoute, which redirects non-admins
 * to `/`. For admins, the page renders overview stats, the user table, and the
 * most-tracked-shows list — all fed by the mocked admin RPCs.
 */
test.describe('admin page', () => {
  test('redirects non-admins away from /admin', async ({ page }) => {
    // Default db.isAdmin is false.
    await visit(page, '/admin')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('My Shows').first()).toBeVisible()
  })

  test('renders stats, users and popular shows for admins', async ({ page, db }) => {
    db.isAdmin = true

    await visit(page, '/admin')

    await expect(page.getByText('Admin Portal').first()).toBeVisible()

    // Overview stats.
    await expect(page.getByText('Overview')).toBeVisible()
    await expect(page.getByText('Total Users')).toBeVisible()

    // User table (1 fixture user).
    await expect(page.getByText('Users (1)')).toBeVisible()
    await expect(page.getByText('viewer@example.com').first()).toBeVisible()

    // Most tracked shows.
    await expect(page.getByText('Most Tracked Shows')).toBeVisible()
    await expect(page.getByText('Breaking Bad')).toBeVisible()
  })
})
