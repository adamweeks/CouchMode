import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@ionic/react': resolve(__dirname, 'src/test/ionicMock.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
