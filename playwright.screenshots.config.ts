import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

/**
 * Captures PR screenshots of the signed-in app (mocked backend, see
 * e2e/support) at a phone viewport, in light and dark themes.
 *
 *   npm run screenshots   # → pr-screenshots/*.png (gitignored)
 *
 * Kept out of the regular e2e run: specs here are named `*.shot.ts`, which the
 * default config's testMatch doesn't pick up.
 */
export default defineConfig({
  ...base,
  testDir: './e2e/screenshots',
  testMatch: '*.shot.ts',
  retries: 0,
  reporter: [['list']],
  projects: [{ name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }],
})
