import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and run via `npm run test:e2e`
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
