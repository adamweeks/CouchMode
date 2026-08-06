import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Playwright config + E2E support run in a Node context (env vars, Buffer)
    // but also ship browser-context callbacks (addInitScript). Give them both
    // global sets, and allow Playwright's empty-fixture destructuring pattern.
    files: ['playwright.config.ts', 'e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-empty-pattern': 'off',
      // Playwright's fixture `use()` callback is not a React hook.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
])
