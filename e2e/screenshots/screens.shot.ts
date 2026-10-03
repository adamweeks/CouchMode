import { test, visit } from '../support/fixtures'

/**
 * One screenshot per main signed-in screen, in light and dark. Add a screen
 * here when a PR changes one that isn't covered yet.
 */
const OUT = 'pr-screenshots'

const screens: { name: string; path: string; ready: string }[] = [
  { name: 'home', path: '/', ready: 'Breaking Bad' },
  { name: 'show-detail', path: '/tmdb/1396', ready: 'Breaking Bad' },
  { name: 'history', path: '/history', ready: 'History' },
  { name: 'settings', path: '/settings', ready: 'Settings' },
]

for (const theme of ['light', 'dark'] as const) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(t => localStorage.setItem('couchmode-theme', t), theme)
    })

    for (const screen of screens) {
      test(screen.name, async ({ page }) => {
        if (screen.path === '/') await page.goto('/')
        else await visit(page, screen.path)
        await page.getByText(screen.ready).first().waitFor()
        // Let posters, episode titles and transitions settle.
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${OUT}/${screen.name}-${theme}.png` })
      })
    }
  })
}
