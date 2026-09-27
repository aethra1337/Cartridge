const TOKEN_KEY = 'cartridge.spotify.tokens'
const VERIFIER_KEY = 'cartridge.spotify.code_verifier'
const STATE_KEY = 'cartridge.spotify.state'
// Previous brand keys — read once and migrate so existing sessions survive renames.
const LEGACY_TOKEN_KEYS = ['crates.spotify.tokens', 'melodify.spotify.tokens']
const LEGACY_VERIFIER_KEYS = ['crates.spotify.code_verifier', 'melodify.spotify.code_verifier']

type Tokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

const config = () => ({
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined,
  redirectUri: resolveRedirectUri(
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined,
    window.location.origin
  ),
})

/**
 * Pick the OAuth redirect URI for this login attempt.
 *
 * PKCE verifier + state live in origin-scoped localStorage, so the login
 * page and the /callback page MUST share an origin. `localhost` and
 * `127.0.0.1` are different origins: starting login on one and landing the
 * callback on the other loses the verifier, the exchange fails, and the user
 * has to log in a second time. When the configured URI points at a different
 * origin than the page, use the current origin instead — Spotify dashboards
 * accept multiple redirect URIs, so register both.
 */
export function resolveRedirectUri(envUri: string | undefined, currentOrigin: string): string {
  const fallback = `${currentOrigin}/callback`
  if (!envUri) return fallback
  try {
    if (new URL(envUri).origin === currentOrigin) return envUri
  } catch {
    return fallback
  }
  return fallback
}

const base64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return base64Url(bytes.buffer)
}

export async function generateCodeChallenge(verifier: string) {
  return base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

function readTokens(): Tokens | null {
  try {
    const current = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null') as Tokens | null
    if (current) return current
    // Migrate legacy sessions once
    for (const key of LEGACY_TOKEN_KEYS) {
      const legacy = JSON.parse(localStorage.getItem(key) || 'null') as Tokens | null
      if (legacy) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(legacy))
        localStorage.removeItem(key)
        return legacy
      }
    }
    return null
  } catch {
    return null
  }
}

export function getAccessToken() {
  const tokens = readTokens()
  return tokens && tokens.expiresAt > Date.now() + 30000 ? tokens.accessToken : null
}

// In-flight singleton: concurrent API calls share one refresh request so a
// burst of 401s/refresh flows can't invalidate the session with duplicates.
let refreshPromise: Promise<string> | null = null

export async function getValidAccessToken() {
  const tokens = readTokens()
  if (!tokens) return null
  if (tokens.expiresAt > Date.now() + 30000) return tokens.accessToken
  if (!tokens.refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken as string,
            client_id: config().clientId || '',
          }),
        })

        if (!response.ok) {
          // Refresh token is dead (revoked/rotated): drop the session so the
          // app falls back to the "connect" state instead of retrying forever.
          purgeTokens()
          throw new Error('Spotify session expired. Please reconnect.')
        }

        const data = (await response.json()) as { access_token: string; expires_in: number; refresh_token?: string }
        localStorage.setItem(
          TOKEN_KEY,
          JSON.stringify({
            accessToken: data.access_token,
            refreshToken: data.refresh_token || tokens.refreshToken,
            expiresAt: Date.now() + data.expires_in * 1000,
          })
        )
        return data.access_token
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export async function loginWithSpotify(forcePrompt = true) {
  const { clientId, redirectUri } = config()
  if (!clientId) throw new Error('Missing VITE_SPOTIFY_CLIENT_ID in .env.')

  const verifier = generateCodeVerifier()
  localStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  // CSRF protection: random state round-trips through Spotify and is verified on return
  const stateBytes = crypto.getRandomValues(new Uint8Array(32))
  const state = base64Url(stateBytes.buffer)
  localStorage.setItem(STATE_KEY, state)

  // Request all necessary scopes for library reading and playlist creation.
  // Playback scopes enable full-track listening via the Web Playback SDK
  // (Premium only); the app still works without them via 30s previews.
  const scopes = [
    'user-library-read',
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-private',
    'user-read-email',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: scopes,
    state,
    show_dialog: forcePrompt ? 'true' : 'false',
  })

  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`)
}

// In-flight singleton lock to prevent double token exchange in React StrictMode
let authExchangePromise: Promise<string> | null = null
let processedCode: string | null = null

export async function handleAuthCallback(search: string): Promise<string> {
  const params = new URLSearchParams(search)
  const code = params.get('code')
  if (params.get('error')) throw new Error(`Spotify authorization error: ${params.get('error')}`)

  // Verify state to reject forged callbacks (CSRF). Fail closed: a missing
  // or mismatched state rejects the login, unless a valid session already
  // exists (e.g. re-entrant callback) — then just return it.
  const existingTokenEarly = getAccessToken()
  const storedState = localStorage.getItem(STATE_KEY)
  localStorage.removeItem(STATE_KEY)
  if (!storedState || params.get('state') !== storedState) {
    if (existingTokenEarly) return existingTokenEarly
    throw new Error('Invalid Spotify login state. Please try connecting again.')
  }

  // If already exchanged and we have a valid token, return it
  const existingToken = existingTokenEarly
  if (code && code === processedCode && existingToken) {
    return existingToken
  }

  if (authExchangePromise) {
    return authExchangePromise
  }

  const verifier =
    localStorage.getItem(VERIFIER_KEY) ||
    LEGACY_VERIFIER_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ||
    null
  const { clientId, redirectUri } = config()
  if (!code || !verifier || !clientId) {
    if (existingToken) return existingToken
    throw new Error('Incomplete Spotify callback response.')
  }

  processedCode = code

  authExchangePromise = (async () => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      })

      if (!response.ok) {
        // If a previous exchange already succeeded in storage, don't fail
        const currentValid = getAccessToken()
        if (currentValid) return currentValid

        const errorBody = await response.text()
        throw new Error(`Could not exchange Spotify authorization code: ${errorBody}`)
      }

      const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number }
      localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + data.expires_in * 1000,
        })
      )
      localStorage.removeItem(VERIFIER_KEY)
      return data.access_token
    } finally {
      authExchangePromise = null
    }
  })()

  return authExchangePromise
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(VERIFIER_KEY)
  localStorage.removeItem(STATE_KEY)
  for (const key of [...LEGACY_TOKEN_KEYS, ...LEGACY_VERIFIER_KEYS]) {
    localStorage.removeItem(key)
  }
  processedCode = null
  refreshPromise = null
  authExchangePromise = null
}

export function logout() {
  try {
    clearStoredSession()
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
}

/** Drop the stored session without UI side effects (401 / dead refresh). */
export function purgeTokens() {
  try {
    clearStoredSession()
  } catch {
    // ignore
  }
}