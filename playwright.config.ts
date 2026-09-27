import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  // Dev server runs self-signed HTTPS (Spotify requirement) — ignore it in tests.
  use: { baseURL: 'https://localhost:5173', ignoreHTTPSErrors: true },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'https://localhost:5173',
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
  },
})
