/**
 * Spotify rejects `http://localhost` redirect URIs as insecure but accepts
 * `https://localhost` and `http://127.0.0.1`. Loopback hosts are the same
 * machine but different origins — so the app must consistently live on the
 * redirect URL's host AND scheme, otherwise the PKCE verifier in localStorage
 * can't cross over and login takes two attempts (or fails as insecure).
 *
 * normalizeLoopbackUrl() rewrites a loopback URL to the redirect host+scheme
 * when they disagree, or returns null when no redirect is needed.
 */
export function normalizeLoopbackUrl(currentHref: string, redirectUri: string | undefined): string | null {
  const loopbacks = new Set(['localhost', '127.0.0.1'])
  try {
    const current = new URL(currentHref)
    const redirect = redirectUri ? new URL(redirectUri) : null
    if (!redirect || !loopbacks.has(current.hostname) || !loopbacks.has(redirect.hostname)) return null
    if (current.hostname === redirect.hostname && current.protocol === redirect.protocol) return null
    current.hostname = redirect.hostname
    current.protocol = redirect.protocol
    return current.toString()
  } catch {
    return null
  }
}
