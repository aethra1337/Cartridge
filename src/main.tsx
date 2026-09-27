import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './lib/i18n'
import { normalizeLoopbackUrl } from './lib/spotify/loopback'

// Pin loopback to the Spotify redirect host BEFORE anything else runs:
// localhost <-> 127.0.0.1 are different origins and localStorage (PKCE
// verifier, tokens) can't cross between them.
const loopbackTarget = normalizeLoopbackUrl(
  window.location.href,
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined
)
if (loopbackTarget) {
  window.location.replace(loopbackTarget)
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </StrictMode>,
  )
}

// PWA: register the offline shell in production only. Best-effort —
// a failed registration never blocks the app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
