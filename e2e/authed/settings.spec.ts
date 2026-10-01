import { test, expect, visit } from '../support/fixtures'
import type { Download } from '@playwright/test'
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

/** "Your Data" export: downloads built from the (mocked) user's tables. */
test.describe('data export (signed in)', () => {
  test('exports viewing history as JSON', async ({ page, db }) => {
    await visit(page, '/settings')

    const downloadPromise = page.waitForEvent('download')
    await page.getByText('Export as JSON').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^couchmode-export-\d{4}-\d{2}-\d{2}\.json$/)
    const body = JSON.parse(await readDownload(download))
    expect(body.app).toBe('CouchMode')
    expect(body.shows).toHaveLength(db.shows.length)
    const bb = body.shows.find((s: { title: string }) => s.title === 'Breaking Bad')
    expect(bb.rewatches[0].episodes.length).toBeGreaterThan(0)
  })

  test('exports viewing history as CSV', async ({ page }) => {
    await visit(page, '/settings')

    const downloadPromise = page.waitForEvent('download')
    await page.getByText('Export as CSV').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^couchmode-export-\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = await readDownload(download)
    expect(csv).toContain('show_title,tmdb_id,rewatch_number')
    expect(csv).toContain('Breaking Bad')
  })
})

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}
