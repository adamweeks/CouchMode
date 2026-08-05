import { test, expect } from '@playwright/test'

/**
 * Login screen behaviour. These run against a freshly-booted app with no
 * stored session, so the router lands on `/login` and everything here is
 * fully deterministic — no backend or credentials required.
 */
test.describe('login page', () => {
  test('renders the branding and sign-in form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Couchmode' })).toBeVisible()
    await expect(page.getByText('Settle in. Track every show.')).toBeVisible()

    // Email + password inputs. Ionic can render a hidden `.cloned-input`
    // alongside the real field once focused, so exclude it to stay unambiguous.
    await expect(page.locator('input[type="email"]:not(.cloned-input)')).toBeVisible()
    await expect(page.locator('input[type="password"]:not(.cloned-input)')).toBeVisible()

    // Primary CTA and the Google OAuth option.
    await expect(page.getByText('Sign in', { exact: true })).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('shows the build version', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible()
  })

  test('toggles between sign in and sign up modes', async ({ page }) => {
    await page.goto('/login')

    // Starts in sign-in mode.
    await expect(page.getByText('Sign in', { exact: true })).toBeVisible()
    await expect(page.getByText("Don't have an account?")).toBeVisible()

    // Switch to sign-up.
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page.getByText('Create account')).toBeVisible()
    await expect(page.getByText('Already have an account?')).toBeVisible()

    // And back again.
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText("Don't have an account?")).toBeVisible()
  })

  test('lets the user type an email and password', async ({ page }) => {
    await page.goto('/login')

    const email = page.locator('input[type="email"]:not(.cloned-input)')
    const password = page.locator('input[type="password"]:not(.cloned-input)')

    // Ionic mirrors the native input through React state, so type key-by-key
    // (letting each `ionInput` event settle) rather than a bulk fill, which can
    // race the controlled write-back on slower/mobile viewports.
    await email.click()
    await email.pressSequentially('viewer@example.com')
    await password.click()
    await password.pressSequentially('super-secret')

    await expect(email).toHaveValue('viewer@example.com')
    await expect(password).toHaveValue('super-secret')
  })
})
