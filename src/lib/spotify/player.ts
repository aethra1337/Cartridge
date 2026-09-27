import { getValidAccessToken } from './auth'

export type PlaybackMode = 'full' | 'preview' | 'none'

/**
 * Pure decision: full-track playback needs a ready Web Playback device AND a
 * Premium account; otherwise fall back to the 30s preview, or nothing.
 */
export function decidePlaybackMode(
  track: { previewUrl: string | null },
  playerReady: boolean,
  isPremium: boolean | null
): PlaybackMode {
  if (playerReady && isPremium === true) return 'full'
  if (track.previewUrl) return 'preview'
  return 'none'
}

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'

interface SpotifyReadyState {
  device_id: string
}

interface SpotifyPlayer {
  addListener(event: 'ready', cb: (state: SpotifyReadyState) => void): boolean
  addListener(
    event: 'not_ready' | 'initialization_error' | 'authentication_error' | 'account_error',
    cb: () => void
  ): boolean
  connect(): Promise<boolean>
  disconnect(): void
  pause(): Promise<void>
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void
    Spotify?: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayer
    }
  }
}

let sdkPromise: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Spotify player needs a browser.'))
  }
  if (window.Spotify?.Player) return Promise.resolve()
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        sdkPromise = null
        reject(new Error('Spotify player timed out.'))
      }, 15000)
      const prev = window.onSpotifyWebPlaybackSDKReady
      window.onSpotifyWebPlaybackSDKReady = () => {
        try {
          prev?.()
        } finally {
          window.clearTimeout(timer)
          resolve()
        }
      }
      const script = document.createElement('script')
      script.src = SDK_URL
      script.async = true
      script.onerror = () => {
        window.clearTimeout(timer)
        sdkPromise = null
        reject(new Error('Could not load Spotify player.'))
      }
      document.head.appendChild(script)
    })
  }
  return sdkPromise
}

let player: SpotifyPlayer | null = null
let deviceId: string | null = null
let initPromise: Promise<string | null> | null = null

export function getPlayerDeviceId(): string | null {
  return deviceId
}

/**
 * Load the SDK and connect a "Cartridge Studio" device. Never throws —
 * returns the device id, or null when full playback is unavailable
 * (non-Premium, blocked script, expired session…). Callers fall back to
 * 30s previews in that case.
 */
export function ensurePlayer(): Promise<string | null> {
  if (deviceId) return Promise.resolve(deviceId)
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await loadSdk()
        const token = await getValidAccessToken()
        if (!token) return null
        const PlayerCtor = window.Spotify?.Player
        if (!PlayerCtor) return null
        const candidate = new PlayerCtor({
          name: 'Cartridge Studio',
          getOAuthToken: (cb) => {
            void getValidAccessToken().then((fresh) => cb(fresh ?? ''))
          },
          volume: 0.8,
        })
        const readyId = await new Promise<string | null>((resolve) => {
          let settled = false
          const done = (id: string | null) => {
            if (!settled) {
              settled = true
              resolve(id)
            }
          }
          candidate.addListener('ready', ({ device_id }) => done(device_id))
          candidate.addListener('initialization_error', () => done(null))
          candidate.addListener('authentication_error', () => done(null))
          candidate.addListener('account_error', () => done(null))
          void candidate.connect().then((ok) => {
            if (!ok) done(null)
          })
        })
        if (!readyId) {
          try {
            candidate.disconnect()
          } catch {
            // ignore
          }
          return null
        }
        player = candidate
        deviceId = readyId
        return readyId
      } catch {
        return null
      } finally {
        initPromise = null
      }
    })()
  }
  return initPromise
}

export async function pauseFullPlayback(): Promise<void> {
  try {
    await player?.pause()
  } catch {
    // ignore — device may be gone
  }
}

export function teardownPlayer(): void {
  try {
    player?.disconnect()
  } catch {
    // ignore
  }
  player = null
  deviceId = null
  initPromise = null
  sdkPromise = null
}
