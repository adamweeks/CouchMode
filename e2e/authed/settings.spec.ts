import { test, expect, visit } from '../support/fixtures'
import { TEST_USER } from '../support/session'

/** Signed-in SettingsPage: profile, appearance, admin gating, and sign-out. */
test.describe('settings page (signed in)', () => {
  test('renders the profile and settings sections', async ({ page }) => {
    await visit(page, '/settings')

    await expect(page.getByText('Settings').first()).toBeVisible()
    await expect(page.getByText(TEST_USER.email).first()).toBeVisible()
    await expect(page.getByText('Theme')).toBeVisible()
    await expect(page.getByText('Version').first()).toBeVisible()
    await expect(page.getByText('Privacy Policy')).toBeVisible()
    await expect(page.getByText('Sign Out')).toBeVisible()
  })

  test('hides the admin portal for non-admins', async ({ page }) => {
    await visit(page, '/settings')
    await expect(page.getByText('Settings').first()).toBeVisible()
    await expect(page.getByText('Admin Portal')).toHaveCount(0)
  })

  test('shows the admin portal for admins', async ({ page, db }) => {
    db.isAdmin = true

    await visit(page, '/settings')
    await expect(page.getByText('Admin Portal')).toBeVisible()
  })

  test('signing out returns to the login screen', async ({ page }) => {
    await visit(page, '/settings')

    await page.getByText('Sign Out').click()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Couchmode' })).toBeVisible()
  })
})
