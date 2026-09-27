import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // Self-signed HTTPS for local dev: Spotify only accepts secure redirect
  // URIs, so the dev server runs as https://localhost:5173 (browser shows a
  // one-time cert warning — click through it). Production builds are unaffected.
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep heavy vendors out of the initial bundle: charts, 3D
        // backgrounds and animation libs only load with their views.
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/three') || id.includes('node_modules/ogl')) return 'three'
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@gsap')) return 'motion'
          return undefined
        },
      },
    },
  },
})
