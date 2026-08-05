import { test, expect } from '@playwright/test'

/**
 * Route guarding. Every app route is wrapped in `ProtectedRoute`, so an
 * unauthenticated visitor should always be redirected to `/login`.
 */
const protectedRoutes = [
  '/',
  '/search',
  '/history',
  '/settings',
  '/suggestions',
  '/admin',
  '/tmdb/1399',
]

test.describe('protected routes', () => {
  for (const route of protectedRoutes) {
    test(`redirects ${route} to /login when signed out`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('heading', { name: 'Couchmode' })).toBeVisible()
    })
  }

  test('unknown routes fall back to the login redirect', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page).toHaveURL(/\/login$/)
  })
})
