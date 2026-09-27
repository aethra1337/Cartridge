import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Callback from './pages/Callback'
import NotFound from './pages/NotFound'
import {
  Check,
  Disc,
  Download,
  ExternalLink,
  Headphones,
  History,
  Layers,
  LogOut,
  Music2,
  Play,
  RefreshCw,
  Search,
  Share2,
  Sliders,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import './App.css'
import './modern.css'
import { getAccessToken, loginWithSpotify, logout } from './lib/spotify/auth'
import { syncPlaylistTracks, syncSavedTracks, syncAllTracks, getLastSync, type SyncProgress } from './lib/cache/hydration'
import { database, type SyncHistoryRecord } from './lib/cache/database'
import {
  createPlaylist,
  getAllUserPlaylists,
  getCurrentUser,
  getSavedTracksCount,
  parsePlaylistId,
  pauseDevicePlayback,
  playUrisOnDevice,
  type SpotifyPlaylistItem,
} from './lib/spotify/api'
import { decidePlaybackMode, ensurePlayer, getPlayerDeviceId, pauseFullPlayback, teardownPlayer } from './lib/spotify/player'
import { computeAllOYMBins, type OYMBin, type OYMCategory } from './lib/oym/bins'
import { PLAYLIST_PRESETS, type PlaylistPreset } from './lib/oym/presets'
import { estimateAudioFeatures } from './lib/oym/audioIntelligence'
import { buildDemoTracks } from './lib/demo/tracks'
import { flowLabel, flowScore, optimizeFlow, transitionScores } from './lib/dj/flow'
import { LangToggle, useT } from './lib/i18n'
import { loadStudioState, saveStudioState, clearStudioState, MAX_PERSISTED_IDS } from './lib/studio/persist'
import { buildViewSearch } from './lib/studio/viewParams'
import { createCustomBin, loadCustomBins, saveCustomBins, MAX_CUSTOM_BINS } from './lib/studio/customBins'
import { copyText } from './lib/studio/clipboard'
import { exportBackup, importBackup } from './lib/cache/backup'
import { createSavedView, loadSavedViews, saveSavedViews, MAX_SAVED_VIEWS, type SavedView } from './lib/studio/savedViews'
import { saveSnapshot } from './lib/studio/librarySnapshot'
import type { CustomBinRule, Track } from './lib/types'

const PlotView = lazy(() => import('./components/PlotView'))
const CompareView = lazy(() => import('./components/CompareView/CompareView'))
const DuplicatesView = lazy(() => import('./components/DuplicatesView/DuplicatesView'))
const StatsView = lazy(() => import('./components/StatsView/StatsView'))
const ShareCardModal = lazy(() => import('./components/ShareCard/ShareCard'))
const WhatsNewModal = lazy(() => import('./components/WhatsNew/WhatsNew'))
const SyncHistoryModal = lazy(() => import('./components/SyncHistory/SyncHistory'))

  type Tab = 'tracks' | 'plots' | 'staging' | 'compare' | 'stats' | 'duplicates'
type MusicSourceKind = 'liked' | 'playlist' | 'all'
type SortKey =
  | 'name'
  | 'artist'
  | 'year'
  | 'bpm'
  | 'energy'
  | 'danceability'
  | 'valence'
  | 'acousticness'
  | 'speechiness'
  | 'popularity'
  | 'duration'
  | 'addedAt'
  | 'loudness'
  | 'liveness'

// OYM parity: cap rendered rows, always export the full selection
const MAX_TRACK_ROWS = 5000
const MAX_STAGING_ROWS = 400
const MAX_MOBILE_ROWS = 200

const VALID_TABS: Tab[] = ['tracks', 'plots', 'staging', 'compare', 'stats', 'duplicates']
const VALID_CATEGORIES: OYMCategory[] = ['genres', 'moods', 'styles', 'decades', 'added', 'popularity', 'duration', 'sources', 'custom']
const VALID_SORT_KEYS: SortKey[] = ['name', 'artist', 'year', 'bpm', 'energy', 'danceability', 'valence', 'acousticness', 'speechiness', 'popularity', 'duration', 'addedAt', 'loudness', 'liveness']
const VALID_STAGING_ORDERS = ['natural', 'bpm_asc', 'bpm_desc', 'energy_ramp', 'popularity', 'newest']

function fisherYates<T>(list: T[]): T[] {  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function trackMatchesMood(track: Track, mood: string): boolean {
  if (mood === 'all') return true
  const energy = track.audioFeatures?.energy ?? 0.55
  const valence = track.audioFeatures?.valence ?? 0.5
  const dance = track.audioFeatures?.danceability ?? 0.55
  const tempo = track.audioFeatures?.tempo ?? 120
  switch (mood) {
    case 'amped':
      return energy >= 0.75 && valence >= 0.5
    case 'danceable':
      return dance >= 0.65
    case 'chill':
      return energy <= 0.45 && tempo <= 110
    case 'anger':
      return energy >= 0.7 && valence <= 0.35
    case 'sad':
      return energy <= 0.45 && valence <= 0.35
    case 'happy':
      return valence >= 0.65
    default:
      return true
  }
}

function Studio() {
  const t = useT()
  const [searchParams] = useSearchParams()
  // Demo mode (?demo=1): browse a bundled fictional collection, no login,
  // no IndexedDB writes. Saving/exporting still asks to connect first.
  const isDemo = searchParams.get('demo') === '1'
  // Refresh-proof studio: restore last session (selection, filters, sorts)
  const [persisted] = useState(() => loadStudioState(isDemo))
  const [token, setToken] = useState(getAccessToken())
  const [tracks, setTracks] = useState<Track[]>([])
  const [lastSync, setLastSync] = useState<SyncHistoryRecord | null>(null)
  const [spotifyLiveCount, setSpotifyLiveCount] = useState<number | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [notice, setNotice] = useState<{
    message: string
    url?: string
    type?: 'info' | 'success' | 'error'
    action?: { label: string; onClick: () => void }
  } | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    // Share links (?tab=…) win over the restored session.
    const fromUrl = searchParams.get('tab')
    if (fromUrl && (VALID_TABS as string[]).includes(fromUrl)) return fromUrl as Tab
    if (persisted?.tab && (VALID_TABS as string[]).includes(persisted.tab)) return persisted.tab as Tab
    return 'tracks'
  })

  // OYM source: Liked Songs vs a specific playlist (URI / picker)
  const [sourceKind, setSourceKind] = useState<MusicSourceKind>('liked')
  const [playlistUriInput, setPlaylistUriInput] = useState('')
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState('Your Saved Tracks')
  const syncInFlight = useRef(false)

  // OYM Category & Active Bin
  const [activeCategory, setActiveCategory] = useState<OYMCategory>(() => {
    const fromUrl = searchParams.get('cat')
    if (fromUrl && (VALID_CATEGORIES as string[]).includes(fromUrl)) return fromUrl as OYMCategory
    if (persisted?.activeCategory && (VALID_CATEGORIES as string[]).includes(persisted.activeCategory)) {
      return persisted.activeCategory as OYMCategory
    }
    return 'genres'
  })
  const [activeBinId, setActiveBinId] = useState<string>(
    () => searchParams.get('bin') || persisted?.activeBinId || 'all'
  )
  const [binSearch, setBinSearch] = useState('')

  // User-defined bins (genre-keyword rules, persisted locally)
  const [customBins, setCustomBins] = useState<CustomBinRule[]>(() => loadCustomBins())
  const [customLabel, setCustomLabel] = useState('')
  const [customKeywords, setCustomKeywords] = useState('')

  // Saved views (named filter snapshots)
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews())
  const [viewName, setViewName] = useState('')

  const snapshotView = () => ({
    search,
    sliders: { minBpm, maxBpm, minEnergy, maxEnergy, minValence, maxValence, minDance, maxDance, minPop, maxPop },
    activeCategory,
    activeBinId,
    sorts: sorts.map((s) => ({ key: s.key, direction: s.direction })),
  })
  const saveCurrentView = () => {
    const view = createSavedView(viewName, snapshotView())
    if (!view || savedViews.length >= MAX_SAVED_VIEWS) return
    setSavedViews((current) => [...current, view])
    setViewName('')
  }
  const applySavedView = (id: string) => {
    const view = savedViews.find((v) => v.id === id)
    if (!view) return
    setSearch(view.search)
    const s = view.sliders
    if (typeof s.minBpm === 'number') setMinBpm(s.minBpm)
    if (typeof s.maxBpm === 'number') setMaxBpm(s.maxBpm)
    if (typeof s.minEnergy === 'number') setMinEnergy(s.minEnergy)
    if (typeof s.maxEnergy === 'number') setMaxEnergy(s.maxEnergy)
    if (typeof s.minValence === 'number') setMinValence(s.minValence)
    if (typeof s.maxValence === 'number') setMaxValence(s.maxValence)
    if (typeof s.minDance === 'number') setMinDance(s.minDance)
    if (typeof s.maxDance === 'number') setMaxDance(s.maxDance)
    if (typeof s.minPop === 'number') setMinPop(s.minPop)
    if (typeof s.maxPop === 'number') setMaxPop(s.maxPop)
    if ((VALID_CATEGORIES as string[]).includes(view.activeCategory)) {
      setActiveCategory(view.activeCategory as OYMCategory)
    }
    setActiveBinId(view.activeBinId)
    const validSorts = view.sorts.filter((item): item is { key: SortKey; direction: 1 | -1 } =>
      (VALID_SORT_KEYS as string[]).includes(item.key)
    )
    if (validSorts.length) setSorts(validSorts)
  }
  const deleteSavedView = (id: string) => {
    setSavedViews((current) => current.filter((v) => v.id !== id))
  }

  const addCustomBin = () => {
    const rule = createCustomBin(customLabel, customKeywords)
    if (!rule || customBins.length >= MAX_CUSTOM_BINS) return
    setCustomBins((current) => [...current, rule])
    setCustomLabel('')
    setCustomKeywords('')
  }
  const deleteCustomBin = (id: string) => {
    setCustomBins((current) => current.filter((rule) => rule.id !== id))
    setActiveBinId((current) => (current === id ? 'all' : current))
  }

  // Advanced Filters & Sliders
  const [search, setSearch] = useState(() => searchParams.get('q') || persisted?.search || '')
  const [showSliders, setShowSliders] = useState(false)
  const [minBpm, setMinBpm] = useState<number>(persisted?.sliders?.minBpm ?? 50)
  const [maxBpm, setMaxBpm] = useState<number>(persisted?.sliders?.maxBpm ?? 210)
  const [minEnergy, setMinEnergy] = useState<number>(persisted?.sliders?.minEnergy ?? 0)
  const [maxEnergy, setMaxEnergy] = useState<number>(persisted?.sliders?.maxEnergy ?? 100)
  const [minValence, setMinValence] = useState<number>(persisted?.sliders?.minValence ?? 0)
  const [maxValence, setMaxValence] = useState<number>(persisted?.sliders?.maxValence ?? 100)
  const [minDance, setMinDance] = useState<number>(persisted?.sliders?.minDance ?? 0)
  const [maxDance, setMaxDance] = useState<number>(persisted?.sliders?.maxDance ?? 100)
  const [minPop, setMinPop] = useState<number>(persisted?.sliders?.minPop ?? 0)
  const [maxPop, setMaxPop] = useState<number>(persisted?.sliders?.maxPop ?? 100)

  // Selection & Staging
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(persisted?.selectedIds ?? []))
  const [sorts, setSorts] = useState<{ key: SortKey; direction: 1 | -1 }[]>(() => {
    const valid = (persisted?.sorts ?? []).filter(
      (s): s is { key: SortKey; direction: 1 | -1 } => (VALID_SORT_KEYS as string[]).includes(s.key)
    )
    return valid.length ? valid : [{ key: 'addedAt', direction: -1 }]
  })
  const [playlistName, setPlaylistName] = useState(persisted?.playlistName ?? 'My Cartridge Playlist')
  const [playlistDescription, setPlaylistDescription] = useState(
    persisted?.playlistDescription ?? 'Curated with Cartridge — Organize Your Music'
  )
  const [stagingSortOrder, setStagingSortOrder] = useState<string>(
    persisted?.stagingSortOrder && VALID_STAGING_ORDERS.includes(persisted.stagingSortOrder)
      ? persisted.stagingSortOrder
      : 'natural'
  )
  const [stagingOrder, setStagingOrder] = useState<string[] | null>(persisted?.stagingOrder ?? null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  // 'full' = Web Playback SDK device (Premium), 'preview' = 30s clip element
  const [playingKind, setPlayingKind] = useState<'full' | 'preview' | null>(null)
  const [playerDeviceId, setPlayerDeviceId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-Playlist Wizard Modal state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const restoreInputRef = useRef<HTMLInputElement | null>(null)

  const downloadBackup = () => {
    void exportBackup()
      .then((json) => {
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cartridge-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 4000)
        setNotice({ message: t('backupDone'), type: 'success' })
      })
      .catch(() => setNotice({ message: t('restoreFailed'), type: 'error' }))
  }

  const restoreBackupFile = (file: File | undefined) => {
    if (!file) return
    void file
      .text()
      .then((raw) => importBackup(raw))
      .then((count) =>
        loadStoredTracks().then(() => count)
      )
      .then((count) =>
        database.tracks.toArray().then((all) => {
          saveSnapshot(Object.fromEntries(all.map((tr) => [tr.id, `${tr.name} — ${tr.artist}`])))
          return count
        })
      )
      .then((count) =>
        setNotice({ message: `${t('restoreDone')}: ${count.toLocaleString()} tracks`, type: 'success' })
      )
      .catch(() => setNotice({ message: t('restoreFailed'), type: 'error' }))
  }
  const [wizardConfig, setWizardConfig] = useState({
    title: 'Cartridge: Curated Flow',
    description: 'Auto-generated with Cartridge smart flow curator',
    genre: 'all',
    decade: 'all',
    bpm: 'all',
    energy: 'all',
    mood: 'all',
    flowOrder: 'bpm_ramp' as 'bpm_ramp' | 'energy_ramp' | 'newest' | 'popularity' | 'shuffle',
    limit: 50,
  })

  // Load tracks and ensure all have 100% audio features
  const loadStoredTracks = async () => {
    const loaded = await database.tracks.toArray()
    let hasMissing = false
    const enriched = loaded.map((t) => {
      if (!t.audioFeatures) {
        hasMissing = true
        return {
          ...t,
          audioFeatures: estimateAudioFeatures(
            { id: t.id, name: t.name, duration_ms: t.durationMs, popularity: t.popularity, release_date: t.releaseDate || undefined },
            t.artistGenres
          ),
        }
      }
      return t
    })

    if (hasMissing && enriched.length > 0) {
      await database.tracks.bulkPut(enriched)
    }
    setTracks(enriched)
  }

  useEffect(() => {
    if (isDemo) {
      setTracks(buildDemoTracks())
      setSourceLabel(t('demoCollection'))
      setNotice({ message: t('demoNotice'), type: 'info' })
    } else {
      loadStoredTracks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo])

  // Fresh-connect flag set by the /callback page
  useEffect(() => {
    let flag = false
    try {
      flag =
        sessionStorage.getItem('cartridge.justConnected') === '1' ||
        sessionStorage.getItem('crates.justConnected') === '1'
      sessionStorage.removeItem('cartridge.justConnected')
      sessionStorage.removeItem('crates.justConnected')
    } catch {
      // ignore
    }
    if (flag && getAccessToken()) {
      setToken(getAccessToken())
      setNotice({
        message: 'Spotify connected successfully! Press Sync to fetch all your tracks.',
        type: 'success',
      })
    }
  }, [])

  // Fetch live track count + user playlists from Spotify (once per session).
  // NOTE: tracks.length is intentionally not a dep — re-fetching on every
  // sync step would spam the API and risk rate-limiting mid-sync.
  useEffect(() => {
    if (token) {
      getSavedTracksCount()
        .then((total) => setSpotifyLiveCount(total))
        .catch(() => {})
      getAllUserPlaylists()
        .then((lists) => setUserPlaylists(lists))
        .catch(() => {})
    }
    if (!isDemo) {
      getLastSync()
        .then((row) => setLastSync(row))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isDemo])

  // Full-track playback: detect Premium, then connect a Web Playback device.
  // Anything failing here stays invisible — 30s previews keep working.
  useEffect(() => {
    if (!token) {
      teardownPlayer()
      setPlayerDeviceId(null)
      setIsPremium(null)
      setPlayingId(null)
      setPlayingKind(null)
      return
    }
    let cancelled = false
    getCurrentUser()
      .then((user) => {
        if (cancelled) return
        const premium = user.product === 'premium'
        setIsPremium(premium)
        if (premium) {
          ensurePlayer()
            .then((id) => {
              if (!cancelled) setPlayerDeviceId(id)
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  // Sync function behind a stable ref so auto-sync effect never loops.
  // Assigned in an effect (not during render) to avoid render-phase writes.
  const syncRef = useRef<() => Promise<void>>(async () => {})
  const doSync = async (kindOverride?: MusicSourceKind, playlistIdOverride?: string | null) => {
    if (!token) {
      setNotice({ message: 'Connect Spotify first to sync your songs.', type: 'info' })
      return
    }
    if (syncInFlight.current) return
    syncInFlight.current = true
    setNotice(null)
    setSyncProgress({ percent: 0, tracks: 0, phase: 'Starting sync...' })
    let warningMsg = ''

    try {
      const kind = kindOverride ?? sourceKind
      if (kind === 'liked') {
        const syncedTracks = await syncSavedTracks(
          (progress) => setSyncProgress(progress),
          (warning) => {
            warningMsg = warning
          }
        )
        setTracks(syncedTracks)
        setSpotifyLiveCount(syncedTracks.length)
        setSourceLabel('Your Saved Tracks')
        saveSnapshot(Object.fromEntries(syncedTracks.map((tr) => [tr.id, `${tr.name} — ${tr.artist}`])))
        getLastSync().then(setLastSync).catch(() => {})
        setSyncProgress(null)
        setNotice({
          message: warningMsg || `Successfully synced ${syncedTracks.length.toLocaleString()} songs with complete Organize Your Music categories!`,
          type: warningMsg ? 'info' : 'success',
        })
        if (!warningMsg) notifySyncDone(`Synced ${syncedTracks.length.toLocaleString()} songs.`)
      } else if (kind === 'playlist') {
        const rawId = playlistIdOverride ?? selectedPlaylistId ?? parsePlaylistId(playlistUriInput)
        if (!rawId) {
          setSyncProgress(null)
          setNotice({ message: 'Paste a playlist link, URI or ID first (open.spotify.com/playlist/...).', type: 'info' })
          syncInFlight.current = false
          return
        }
        const result = await syncPlaylistTracks(
          rawId,
          (progress) => setSyncProgress(progress),
          (warning) => {
            warningMsg = warning
          }
        )
        setTracks(result.tracks)
        setSelectedPlaylistId(rawId)
        setSourceLabel(result.playlistName)
        saveSnapshot(Object.fromEntries(result.tracks.map((tr) => [tr.id, `${tr.name} — ${tr.artist}`])))
        getLastSync().then(setLastSync).catch(() => {})
        setSyncProgress(null)
        setNotice({
          message: warningMsg || `Organized "${result.playlistName}": ${result.tracks.length.toLocaleString()} tracks ready in genre bins!`,
          type: warningMsg ? 'info' : 'success',
        })
        if (!warningMsg) notifySyncDone(`Organized "${result.playlistName}": ${result.tracks.length} tracks.`)
      } else if (kind === 'all') {
        const result = await syncAllTracks(
          (progress) => setSyncProgress(progress),
          (warning) => {
            warningMsg = warning
          }
        )
        setTracks(result.tracks)
        // No single live count covers liked + every playlist — hide the badge.
        setSpotifyLiveCount(null)
        setSourceLabel(t('allMusic'))
        saveSnapshot(Object.fromEntries(result.tracks.map((tr) => [tr.id, `${tr.name} — ${tr.artist}`])))
        getLastSync().then(setLastSync).catch(() => {})
        setSyncProgress(null)
        setNotice({
          message:
            warningMsg ||
            `Organized everything: ${result.tracks.length.toLocaleString()} unique tracks from Liked Songs + ${result.playlistCount} playlists!`,
          type: warningMsg ? 'info' : 'success',
        })
        if (!warningMsg) notifySyncDone(`Organized everything: ${result.tracks.length} tracks.`)
      }
    } catch (error) {
      setSyncProgress(null)
      const message = error instanceof Error ? error.message : 'Could not sync.'
      // Dead/expired sessions (or missing scopes after an app update)
      // get a one-click recovery path.
      const needsReconnect = /expir|reconnect|connect spotify|scope/i.test(message)
      setNotice({
        message,
        type: 'error',
        ...(needsReconnect
          ? { action: { label: 'Reconnect Spotify', onClick: () => loginWithSpotify(true) } }
          : {}),
      })
    } finally {
      syncInFlight.current = false
    }
  }
  useEffect(() => {
    syncRef.current = () => doSync()
  })
  const sync = () => {
    // Ask once, inside the click gesture, so completion pings are allowed.
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => {})
      }
    } catch {
      // ignore
    }
    void doSync()
  }

  const notifySyncDone = (message: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification('Cartridge', { body: message })
      }
    } catch {
      // ignore
    }
  }

  // Escape closes any open modal; "/" focuses search (when not typing)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setWizardOpen(false)
        setShareOpen(false)
        setWhatsNewOpen(false)
        setHistoryOpen(false)
        return
      }
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
        event.preventDefault()
        document.getElementById('studio-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Persist studio session (debounced) — refresh-proof staging & filters
  useEffect(() => {
    const id = window.setTimeout(() => {
      saveStudioState(isDemo, {
        selectedIds: [...selectedIds].slice(0, MAX_PERSISTED_IDS),
        stagingSortOrder,
        stagingOrder,
        playlistName,
        playlistDescription,
        tab,
        search,
        sliders: {
          minBpm, maxBpm, minEnergy, maxEnergy, minValence, maxValence,
          minDance, maxDance, minPop, maxPop,
        },
        activeCategory,
        activeBinId,
        sorts,
      })
    }, 500)
    return () => window.clearTimeout(id)
  }, [isDemo, selectedIds, stagingSortOrder, stagingOrder, playlistName, playlistDescription, tab, search, minBpm, maxBpm, minEnergy, maxEnergy, minValence, maxValence, minDance, maxDance, minPop, maxPop, activeCategory, activeBinId, sorts])

  // Shareable views: mirror tab/category/bin/search into the URL (debounced)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = buildViewSearch(window.location.search, {
        tab,
        cat: activeCategory,
        bin: activeBinId,
        q: search,
      })
      if (next !== window.location.search) {
        window.history.replaceState({}, '', `${window.location.pathname}${next}`)
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [tab, activeCategory, activeBinId, search])

// Auto‑sync once when the Spotify liked‑songs count differs from the local cache (liked source only)
const autoSyncedRef = useRef(false)
useEffect(() => {
  if (token && sourceKind === 'liked' && spotifyLiveCount !== null && spotifyLiveCount !== tracks.length && !autoSyncedRef.current && !syncInFlight.current) {
    autoSyncedRef.current = true
    void syncRef.current()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token, spotifyLiveCount])

  // Compute all OYM Bins (Genres, Moods, Styles, Decades, Added, Popularity, Duration, Sources, Custom)
  const allOYMBins = useMemo(() => {
    return computeAllOYMBins(tracks, tracks.length ? sourceLabel : undefined, customBins)
  }, [tracks, sourceLabel, customBins])

  // Persist custom bin rules locally
  useEffect(() => {
    saveCustomBins(customBins)
  }, [customBins])

  // Persist saved views locally
  useEffect(() => {
    saveSavedViews(savedViews)
  }, [savedViews])

  // Drop stale bin ids (shared links / restored sessions pointing at bins
  // that no longer exist) back to the full library.
  useEffect(() => {
    if (activeBinId !== 'all' && tracks.length > 0) {
      const exists = (Object.keys(allOYMBins) as OYMCategory[]).some((cat) =>
        allOYMBins[cat].some((b) => b.id === activeBinId)
      )
      if (!exists) setActiveBinId('all')
    }
  }, [tracks.length, activeBinId, allOYMBins])

  // Current category bins
  const currentCategoryBins = useMemo(() => {
    const list = allOYMBins[activeCategory] || []
    if (!binSearch.trim()) return list
    const q = binSearch.toLowerCase()
    return list.filter((b) => b.label.toLowerCase().includes(q))
  }, [allOYMBins, activeCategory, binSearch])

  // Find active bin object across all categories
  const activeBinObject = useMemo<OYMBin | null>(() => {
    if (activeBinId === 'all') return null
    for (const cat of Object.keys(allOYMBins) as OYMCategory[]) {
      const found = allOYMBins[cat].find((b) => b.id === activeBinId)
      if (found) return found
    }
    return null
  }, [allOYMBins, activeBinId])

  // Get track IDs from active bin
  const activeBinTrackIds = useMemo(() => {
    if (!activeBinObject) return null
    return new Set(activeBinObject.trackIds)
  }, [activeBinObject])

  // Reset all filters
  const resetFilters = () => {
    setSearch('')
    setMinBpm(50)
    setMaxBpm(210)
    setMinEnergy(0)
    setMaxEnergy(100)
    setMinValence(0)
    setMaxValence(100)
    setMinDance(0)
    setMaxDance(100)
    setMinPop(0)
    setMaxPop(100)
  }

  const isFiltersApplied =
    search ||
    minBpm > 50 ||
    maxBpm < 210 ||
    minEnergy > 0 ||
    maxEnergy < 100 ||
    minValence > 0 ||
    maxValence < 100 ||
    minDance > 0 ||
    maxDance < 100 ||
    minPop > 0 ||
    maxPop < 100

  // Filtered tracks based on bin, multi-filters, and search
  const filteredTracks = useMemo(() => {
    return tracks
      .filter((track) => {
        // Bin check
        if (activeBinTrackIds && !activeBinTrackIds.has(track.id)) {
          return false
        }

        // Search text check
        if (search.trim()) {
          const text = `${track.name} ${track.artist} ${track.album}`.toLowerCase()
          if (!text.includes(search.toLowerCase())) return false
        }

        const bpm = track.audioFeatures?.tempo || 120
        const energy = Math.round((track.audioFeatures?.energy !== undefined ? track.audioFeatures.energy : 0.5) * 100)
        const valence = Math.round((track.audioFeatures?.valence !== undefined ? track.audioFeatures.valence : 0.5) * 100)
        const dance = Math.round((track.audioFeatures?.danceability !== undefined ? track.audioFeatures.danceability : 0.5) * 100)
        const pop = track.popularity

        // Range filters
        if (bpm < minBpm || bpm > maxBpm) return false
        if (energy < minEnergy || energy > maxEnergy) return false
        if (valence < minValence || valence > maxValence) return false
        if (dance < minDance || dance > maxDance) return false
        if (pop < minPop || pop > maxPop) return false

        return true
      })
      .sort((a, b) => {
        for (const sort of sorts) {
          let valA: number | string = 0
          let valB: number | string = 0

          if (sort.key === 'name') {
            valA = a.name.toLowerCase()
            valB = b.name.toLowerCase()
          } else if (sort.key === 'artist') {
            valA = a.artist.toLowerCase()
            valB = b.artist.toLowerCase()
          } else if (sort.key === 'year') {
            valA = a.year || 0
            valB = b.year || 0
          } else if (sort.key === 'bpm') {
            valA = a.audioFeatures?.tempo || 0
            valB = b.audioFeatures?.tempo || 0
          } else if (sort.key === 'energy') {
            valA = a.audioFeatures?.energy || 0
            valB = b.audioFeatures?.energy || 0
          } else if (sort.key === 'danceability') {
            valA = a.audioFeatures?.danceability || 0
            valB = b.audioFeatures?.danceability || 0
          } else if (sort.key === 'valence') {
            valA = a.audioFeatures?.valence || 0
            valB = b.audioFeatures?.valence || 0
          } else if (sort.key === 'acousticness') {
            valA = a.audioFeatures?.acousticness || 0
            valB = b.audioFeatures?.acousticness || 0
          } else if (sort.key === 'speechiness') {
            valA = a.audioFeatures?.speechiness || 0
            valB = b.audioFeatures?.speechiness || 0
          } else if (sort.key === 'loudness') {
            valA = a.audioFeatures?.loudness ?? -60
            valB = b.audioFeatures?.loudness ?? -60
          } else if (sort.key === 'liveness') {
            valA = a.audioFeatures?.liveness || 0
            valB = b.audioFeatures?.liveness || 0
          } else if (sort.key === 'popularity') {
            valA = a.popularity
            valB = b.popularity
          } else if (sort.key === 'duration') {
            valA = a.durationMs
            valB = b.durationMs
          } else if (sort.key === 'addedAt') {
            valA = new Date(a.addedAt).getTime()
            valB = new Date(b.addedAt).getTime()
          }

          if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB)
            if (cmp !== 0) return cmp * sort.direction
          } else {
            const diff = Number(valA) - Number(valB)
            if (diff !== 0) return diff * sort.direction
          }
        }
        return 0
      })
  }, [
    tracks,
    activeBinTrackIds,
    search,
    minBpm,
    maxBpm,
    minEnergy,
    maxEnergy,
    minValence,
    maxValence,
    minDance,
    maxDance,
    minPop,
    maxPop,
    sorts,
  ])

  // Selected tracks for staging with optional order (incl. DJ flow order)
  const stagedTracks = useMemo(() => {
    const list = tracks.filter((t) => selectedIds.has(t.id))
    if (stagingOrder) {
      const pos = new Map(stagingOrder.map((id, i) => [id, i]))
      return [...list].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity))
    }
    if (stagingSortOrder === 'bpm_asc') {
      return [...list].sort((a, b) => (a.audioFeatures?.tempo || 0) - (b.audioFeatures?.tempo || 0))
    }
    if (stagingSortOrder === 'bpm_desc') {
      return [...list].sort((a, b) => (b.audioFeatures?.tempo || 0) - (a.audioFeatures?.tempo || 0))
    }
    if (stagingSortOrder === 'energy_ramp') {
      return [...list].sort((a, b) => (a.audioFeatures?.energy || 0) - (b.audioFeatures?.energy || 0))
    }
    if (stagingSortOrder === 'popularity') {
      return [...list].sort((a, b) => b.popularity - a.popularity)
    }
    if (stagingSortOrder === 'newest') {
      return [...list].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    }
    return list
  }, [tracks, selectedIds, stagingSortOrder, stagingOrder])

  const optimizeStagingFlow = () => {
    if (stagedTracks.length < 3) return
    setStagingOrder(optimizeFlow(stagedTracks).map((t) => t.id))
    setStagingSortOrder('natural')
  }

  const moveStaged = (from: number, to: number) => {
    if (from === to) return
    const ids = stagedTracks.map((t) => t.id)
    const [moved] = ids.splice(from, 1)
    if (!moved) return
    ids.splice(to, 0, moved)
    setStagingOrder(ids)
    setStagingSortOrder('natural')
  }

  // Audio preview playback (30s clips)
  const startPreviewAudio = (track: Track) => {
    if (!track.previewUrl) return
    if (playingKind === 'full') void pauseFullPlayback()
    audioRef.current?.pause()
    const audio = new Audio(track.previewUrl)
    audio.onended = () => {
      setPlayingId(null)
      setPlayingKind(null)
    }
    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null
        setPlayingId(null)
        setPlayingKind(null)
      }
    }
    audioRef.current = audio
    // play() rejects (autoplay policy, missing preview...): reset the UI
    // instead of leaving the row stuck in "playing" state.
    void Promise.resolve(audio.play()).catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null
        setPlayingId(null)
        setPlayingKind(null)
      }
    })
    setPlayingId(track.id)
    setPlayingKind('preview')
  }

  // Unified play toggle: full track when a Premium device is ready,
  // 30s preview clip otherwise.
  const playPreview = (track: Track) => {
    if (playingId === track.id) {
      if (playingKind === 'full') {
        void pauseFullPlayback()
        const dev = getPlayerDeviceId()
        if (dev) void pauseDevicePlayback(dev).catch(() => {})
      } else {
        audioRef.current?.pause()
      }
      setPlayingId(null)
      setPlayingKind(null)
      return
    }
    const mode = decidePlaybackMode(track, playerDeviceId !== null, isPremium)
    if (mode === 'none') return
    if (mode === 'full' && playerDeviceId) {
      audioRef.current?.pause()
      audioRef.current = null
      const dev = playerDeviceId
      void playUrisOnDevice(dev, [track.uri])
        .then(() => {
          setPlayingId(track.id)
          setPlayingKind('full')
        })
        .catch(() => {
          // device hiccup or stale scopes — fall back to the preview clip
          startPreviewAudio(track)
        })
      return
    }
    startPreviewAudio(track)
  }

  // Multi-select tracks (shift-range aware)
  const selectTrack = (index: number, shift: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      const range = shift && lastSelectedIndex !== null ? [Math.min(lastSelectedIndex, index), Math.max(lastSelectedIndex, index)] : [index, index]
      for (let i = range[0]; i <= range[1]; i++) {
        const id = filteredTracks[i]?.id
        if (id) {
          if (next.has(id) && range[0] === range[1]) {
            next.delete(id)
          } else {
            next.add(id)
          }
        }
      }
      return next
    })
  }

  const updateSort = (key: SortKey) => {
    setSorts((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) => (item.key === key ? { ...item, direction: item.direction === 1 ? -1 : 1 } : item))
      }
      return [{ key, direction: -1 }, ...current.filter((item) => item.key !== key)]
    })
  }

  // Generic Spotify Playlist Creator & Exporter
  const createAndExportPlaylist = async (title: string, trackList: Track[], desc: string) => {
    if (!token) {
      setNotice({
        message: 'Connect Spotify before creating a playlist.',
        type: 'info',
        action: { label: 'Connect Spotify', onClick: () => loginWithSpotify(true) },
      })
      return
    }
    if (!trackList.length) {
      setNotice({ message: 'No tracks to add to the playlist.', type: 'info' })
      return
    }

    setIsSavingPlaylist(true)
    try {
      setNotice({ message: `Creating and exporting "${title}" with ${trackList.length} tracks to Spotify...`, type: 'info' })
      const user = await getCurrentUser()
      const playlist = await createPlaylist(
        user.id,
        title,
        trackList.map((t) => t.id),
        desc
      )
      setIsSavingPlaylist(false)
      setNotice({
        message: `Successfully created playlist "${title}" with ${trackList.length} tracks!`,
        url: playlist.external_urls.spotify,
        type: 'success',
      })
    } catch (error) {
      setIsSavingPlaylist(false)
      const errStr = error instanceof Error ? error.message : 'Failed to export playlist to Spotify.'
      setNotice({
        message: errStr,
        type: 'error',
        action: {
          label: 'Grant Spotify Permissions',
          onClick: () => loginWithSpotify(true),
        },
      })
    }
  }

  // Save Bin Directly as Spotify Playlist
  const saveBinAsPlaylist = async (bin: OYMBin) => {
    const ids = new Set(bin.trackIds)
    const binTracks = tracks.filter((t) => ids.has(t.id))
    await createAndExportPlaylist(
      `${bin.label} (Cartridge)`,
      binTracks,
      `Curated by Cartridge (${bin.categoryLabel}: ${bin.label}) with ${binTracks.length} tracks.`
    )
  }

  // Save Current Filtered View as Playlist
  const saveFilteredAsPlaylist = async () => {
    const title = activeBinObject ? `${activeBinObject.label} (Filtered)` : 'Cartridge Selection'
    await createAndExportPlaylist(
      title,
      filteredTracks,
      `Curated selection of ${filteredTracks.length} tracks using Cartridge — Organize Your Music.`
    )
  }

  // Export the full filtered view as CSV (backup / spreadsheets)
  const exportFilteredCsv = () => {
    if (!filteredTracks.length) return
    const esc = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`
    const header = [
      'Title', 'Artist', 'Album', 'Top Genre', 'Year', 'Added', 'BPM',
      'Energy %', 'Dance %', 'Valence %', 'Popularity', 'Duration', 'Spotify ID',
    ]
    const lines = filteredTracks.map((tr) =>
      [
        tr.name,
        tr.artist,
        tr.album,
        tr.artistGenres[0] || '',
        tr.year ?? '',
        tr.addedAt,
        tr.audioFeatures ? Math.round(tr.audioFeatures.tempo) : '',
        tr.audioFeatures ? Math.round(tr.audioFeatures.energy * 100) : '',
        tr.audioFeatures ? Math.round(tr.audioFeatures.danceability * 100) : '',
        tr.audioFeatures ? Math.round(tr.audioFeatures.valence * 100) : '',
        tr.popularity,
        `${Math.floor(tr.durationMs / 60000)}:${String(Math.floor(tr.durationMs / 1000) % 60).padStart(2, '0')}`,
        tr.id,
      ]
        .map(esc)
        .join(',')
    )
    const blob = new Blob([`﻿${[header.map(esc).join(','), ...lines].join('\r\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cartridge-export.csv'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  // Auto-Playlist Wizard Filter & Generation
  const wizardMatchingTracks = useMemo(() => {
    const base = tracks.filter((t) => {
      if (wizardConfig.genre !== 'all' && !t.artistGenres.some((g) => g.toLowerCase() === wizardConfig.genre.toLowerCase())) {
        return false
      }
      if (wizardConfig.decade !== 'all' && t.decade !== wizardConfig.decade) {
        return false
      }
      if (!trackMatchesMood(t, wizardConfig.mood)) return false
      const bpm = t.audioFeatures?.tempo || 120
      if (wizardConfig.bpm === 'slow' && bpm >= 90) return false
      if (wizardConfig.bpm === 'moderate' && (bpm < 90 || bpm >= 120)) return false
      if (wizardConfig.bpm === 'fast' && bpm < 120) return false

      const energy = t.audioFeatures?.energy !== undefined ? t.audioFeatures.energy : 0.5
      if (wizardConfig.energy === 'chill' && energy >= 0.45) return false
      if (wizardConfig.energy === 'high' && energy < 0.65) return false

      return true
    })
    if (wizardConfig.flowOrder === 'shuffle') return fisherYates(base).slice(0, wizardConfig.limit)
    return base
      .sort((a, b) => {
        if (wizardConfig.flowOrder === 'bpm_ramp') {
          return (a.audioFeatures?.tempo || 0) - (b.audioFeatures?.tempo || 0)
        }
        if (wizardConfig.flowOrder === 'energy_ramp') {
          return (a.audioFeatures?.energy || 0) - (b.audioFeatures?.energy || 0)
        }
        if (wizardConfig.flowOrder === 'newest') {
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        }
        if (wizardConfig.flowOrder === 'popularity') {
          return b.popularity - a.popularity
        }
        return 0
      })
      .slice(0, wizardConfig.limit)
  }, [tracks, wizardConfig])

  const executeWizardPlaylistCreation = async () => {
    await createAndExportPlaylist(wizardConfig.title, wizardMatchingTracks, wizardConfig.description)
    setWizardOpen(false)
  }

  // One-click preset export: filter + sort + save, no manual config needed
  const applyPresetPlaylistCreation = async (preset: PlaylistPreset) => {
    const picked = tracks.filter(preset.filter).sort(preset.sort).slice(0, wizardConfig.limit)
    await createAndExportPlaylist(preset.suggestedPlaylistTitle, picked, preset.suggestedDescription)
    setWizardOpen(false)
  }

  // Active bin title details
  const activeBinTitle = activeBinObject
    ? `${activeBinObject.label} (${activeBinObject.trackCount} tracks / ${activeBinObject.artistCount} artists)`
    : `All Tracks (${tracks.length.toLocaleString()} tracks / ${new Set(tracks.map((t) => t.artist)).size} artists)`

  // Unique decades for wizard
  const uniqueDecades = useMemo(() => {
    const set = new Set<string>()
    tracks.forEach((t) => {
      if (t.decade) set.add(t.decade)
    })
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  }, [tracks])

  // Unique genres for wizard
  const topGenresList = useMemo(() => {
    const countMap = new Map<string, number>()
    tracks.forEach((t) => {
      t.artistGenres.forEach((g) => {
        countMap.set(g, (countMap.get(g) || 0) + 1)
      })
    })
    return [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)
  }, [tracks])

  const featureTracks = filteredTracks.filter((t) => t.audioFeatures)
  const avgBpm = featureTracks.length ? Math.round(featureTracks.reduce((sum, t) => sum + (t.audioFeatures?.tempo || 0), 0) / featureTracks.length) : null
  const avgEnergy = featureTracks.length ? Math.round((featureTracks.reduce((sum, t) => sum + (t.audioFeatures?.energy || 0), 0) / featureTracks.length) * 100) : null
  const avgValence = featureTracks.length ? Math.round((featureTracks.reduce((sum, t) => sum + (t.audioFeatures?.valence || 0), 0) / featureTracks.length) * 100) : null

  // OYM-style collection summary: "Looks like you really enjoy X and Y..."
  const collectionSummary = useMemo(() => {
    if (!tracks.length) return null
    const genreCount = new Map<string, number>()
    tracks.forEach((t) =>
      t.artistGenres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1))
    )
    const artistCount = new Map<string, number>()
    tracks.forEach((t) => {
      const first = t.artist.split(',')[0]?.trim()
      if (first) artistCount.set(first, (artistCount.get(first) || 0) + 1)
    })
    const top = [...genreCount.entries()].sort((a, b) => b[1] - a[1])
    const topArtist = [...artistCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const fav = [...tracks].sort((a, b) => b.popularity - a.popularity)[0]
    if (!top.length || !fav) return null
    return { genreA: top[0][0], topArtist, fav }
  }, [tracks])

  return (
    <main className="app-frame">
      {/* App Header */}
      <header className="app-header">
        <Link className="brand" to="/">
          <img src="/logo.svg" alt="Cartridge" className="brand-logo" width={32} height={32} />
          <span className="brand-name">Cartridge</span>
          <span className="brand-sub">{t('organizeYourMusic')}</span>
        </Link>

        <div className="header-actions">
          <LangToggle />
          {token ? (
            <>
              <span className="connected">
                <span /> {t('connected')}
              </span>
              <button
                className="icon-button"
                title={t('disconnect')}
                onClick={() => {
                  logout()
                  clearStudioState(false)
                  teardownPlayer()
                  audioRef.current?.pause()
                  setPlayingId(null)
                  setPlayingKind(null)
                  setToken(null)
                  setSpotifyLiveCount(null)
                  // Privacy: disconnecting also wipes the on-device track
                  // cache so nothing personal stays behind on shared machines.
                  setTracks([])
                  setSelectedIds(new Set())
                  setStagingOrder(null)
                  setSyncProgress(null)
                  setNotice({ message: 'Disconnected. Local track cache cleared.', type: 'info' })
                  void database.tracks.clear().catch(() => {})
                }}
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <button className="button button-dark" onClick={() => loginWithSpotify(true)}>
              <Headphones size={15} /> {t('connectSpotify')}
            </button>
          )}
        </div>
      </header>

      {/* Sync Strip */}
      <div className="loading-strip">
        <div className="sync-info">
          {syncProgress ? (
            <>
              <strong>{syncProgress.percent}%</strong>
              <div className="loading-track">
                <div style={{ width: `${syncProgress.percent}%` }} />
              </div>
              <span>{syncProgress.phase || `${syncProgress.tracks.toLocaleString()} tracks synced`}</span>
            </>
          ) : (
            <>
              <span>
                {tracks.length ? `${tracks.length.toLocaleString()} tracks · ${sourceLabel}` : 'Connect Spotify to organize your music'}
                {!isDemo && lastSync && tracks.length > 0 && (
                  <> · {t('syncedAt')} {new Date(lastSync.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</>
                )}
              </span>
              {sourceKind === 'liked' && spotifyLiveCount !== null && spotifyLiveCount !== tracks.length && tracks.length > 0 && (
                <span className="sync-badge-outdated">
                  <RefreshCw size={11} /> Spotify has {spotifyLiveCount.toLocaleString()} songs ({spotifyLiveCount - tracks.length > 0 ? `+${spotifyLiveCount - tracks.length} new` : 'out of sync'})
                </span>
              )}
            </>
          )}
        </div>

        {!syncProgress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isDemo && lastSync && tracks.length > 0 && token && (
              <button
                className="button button-light"
                style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                onClick={() => setWhatsNewOpen(true)}
                title={t('whatsNewTitle')}
              >
                <Sparkles size={13} /> {t('whatsNewTitle')}
              </button>
            )}
            <button
              className="button button-light"
              style={{ height: 34, padding: '0 12px', fontSize: 12 }}
              onClick={downloadBackup}
              disabled={!tracks.length}
              title="Download the on-device library as JSON"
            >
              <Download size={13} /> {t('backup')}
            </button>
            <button
              className="button button-light"
              style={{ height: 34, padding: '0 12px', fontSize: 12 }}
              onClick={() => restoreInputRef.current?.click()}
              title="Restore a library backup from JSON"
            >
              <RefreshCw size={13} /> {t('restore')}
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                restoreBackupFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {!isDemo && token && (
              <button
                className="button button-light"
                style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                onClick={() => setHistoryOpen(true)}
                title={t('syncHistory')}
              >
                <History size={13} /> {t('syncHistory')}
              </button>
            )}
            <button className="sync-button" onClick={sync} disabled={!token}>
              <RefreshCw size={13} /> {sourceKind === 'playlist' ? t('organizeThis') : sourceKind === 'all' ? t('organizeEverything') : spotifyLiveCount && spotifyLiveCount > tracks.length ? t('syncNew') : t('fullSync')}
            </button>
          </div>
        )}
      </div>

      {/* OYM Source picker: What do you want to organize? */}
      <div className="source-bar">
        <div className="source-group">
          <span className="source-label">{t('whatToOrganize')}</span>
          <div className="source-pills">
            <button
              className={`source-btn ${sourceKind === 'liked' ? 'active' : ''}`}
              onClick={() => setSourceKind('liked')}
            >
              {t('likedSongs')}
            </button>
            <button
              className={`source-btn ${sourceKind === 'playlist' ? 'active' : ''}`}
              onClick={() => setSourceKind('playlist')}
            >
              {t('specificPlaylist')}
            </button>
            <button
              className={`source-btn ${sourceKind === 'all' ? 'active' : ''}`}
              onClick={() => setSourceKind('all')}
            >
              {t('allMusic')}
            </button>
          </div>
        </div>
        {sourceKind === 'playlist' && (
          <div className="source-playlist-row">
            <input
              className="source-input"
              placeholder={t('playlistPlaceholder')}
              value={playlistUriInput}
              onChange={(e) => setPlaylistUriInput(e.target.value)}
            />
            {Array.isArray(userPlaylists) && userPlaylists.length > 0 && (
              <select
                className="source-select"
                value={selectedPlaylistId || ''}
                onChange={(e) => {
                  setSelectedPlaylistId(e.target.value || null)
                  const found = userPlaylists.find((p) => p.id === e.target.value)
                  if (found) setPlaylistUriInput(found.uri)
                }}
              >
                <option value="">{t('pickPlaylist')} ({userPlaylists.length})...</option>
                {userPlaylists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? 'Untitled'} ({p.tracks?.total ?? 0})
                  </option>
                ))}
              </select>
            )}
            <button className="button button-accent" onClick={() => doSync('playlist')} disabled={!token || syncProgress !== null}>
              <Music2 size={14} /> {t('organizeMusic')}
            </button>
          </div>
        )}
      </div>

      {/* OYM intro + collection summary (playlistmachinery parity) */}
      {!tracks.length && !syncProgress && (
        <div className="oym-intro">
          <h2>Get your music collection in order</h2>
          <p>Saved tracks or any playlist — binned by genre, mood, decade and more. Nothing is ever changed, only new playlists are saved.</p>
          <ol>
            <li><strong>Select</strong> what music you&apos;d like to organize above (Liked Songs or a specific playlist).</li>
            <li><strong>Click</strong> on Organize your music. If this is your first visit, you will be asked to login.</li>
            <li><strong>Login</strong> with Spotify — Cartridge places all tracks into bins: Genres, Moods, Decades, Popularity and more.</li>
            <li><strong>Pick</strong> a genre bin. View properties, plot tracks, preview songs.</li>
            <li><strong>Select</strong> tracks → they land in your <strong>Staging Playlist</strong>.</li>
            <li><strong>Save</strong> the staging playlist to Spotify. Nothing is ever modified — only new playlists are created.</li>
          </ol>
        </div>
      )}
      {collectionSummary && (
        <div className="oym-summary">
          Looks like you really enjoy your <strong>{collectionSummary.genreA}</strong>
          {collectionSummary.topArtist ? (<> and <strong>{collectionSummary.topArtist}</strong></>) : null}. It seems like one of your
          favorite songs is <strong>{collectionSummary.fav.name} — {collectionSummary.fav.artist}</strong>.
        </div>
      )}

      {/* Notice / Action / Success Link Banner */}
      {notice && (
        <div className="notice">
          <span>{notice.message}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {notice.action && (
              <button
                className="button button-accent"
                style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={notice.action.onClick}
              >
                {notice.action.label}
              </button>
            )}
            {notice.url && (
              <a href={notice.url} target="_blank" rel="noreferrer">
                Open in Spotify <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Organize Your Music Workspace */}
      <div className="organizer">
        {/* Left Bins Sidebar */}
        <aside className="sidebar">
          {/* Category Selector (Genres, Moods, Styles, Decades, Added, Popularity, Duration) */}
          <div className="dimension-selector">
            <div className="sidebar-heading">
              <span>ORGANIZE CATEGORIES</span>
              <Layers size={13} />
            </div>
            <div className="dimension-pills">
              {(
                [
                  { id: 'genres', label: 'Genres', count: allOYMBins.genres.length },
                  { id: 'moods', label: 'Moods', count: allOYMBins.moods.length },
                  { id: 'styles', label: 'Styles', count: allOYMBins.styles.length },
                  { id: 'decades', label: 'Decades', count: allOYMBins.decades.length },
                  { id: 'added', label: 'Added', count: allOYMBins.added.length },
                  { id: 'popularity', label: 'Popularity', count: allOYMBins.popularity.length },
                  { id: 'duration', label: 'Duration', count: allOYMBins.duration.length },
                  { id: 'sources', label: 'Sources', count: allOYMBins.sources.length },
                  { id: 'custom', label: 'Custom', count: allOYMBins.custom.length },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  className={`dimension-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setBinSearch('')
                  }}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Bins List */}
          <div className="bins-header">
            <span>
              {activeCategory.toUpperCase()} ({currentCategoryBins.length} bins)
            </span>
          </div>

          {activeCategory === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input
                className="source-input"
                placeholder={t('customLabelPh')}
                value={customLabel}
                maxLength={40}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
              <input
                className="source-input"
                placeholder={t('customKeywordsPh')}
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
              />
              <button
                className="button button-accent"
                disabled={!customLabel.trim() || !customKeywords.trim() || customBins.length >= MAX_CUSTOM_BINS}
                onClick={addCustomBin}
              >
                + {t('customAdd')}
              </button>
              {customBins.length === 0 && <span className="plot-hint">{t('customEmpty')}</span>}
            </div>
          )}

          <div className="bin-search">
            <Search size={13} className="bin-search-icon" />
            <input
              placeholder={`Filter ${activeCategory}...`}
              value={binSearch}
              onChange={(e) => setBinSearch(e.target.value)}
            />
          </div>

          <div className="bin-list">
            {/* All Tracks Bin */}
            <button
              className={`bin ${activeBinId === 'all' ? 'active' : ''}`}
              onClick={() => setActiveBinId('all')}
            >
              <div className="bin-title">
                <span className="bin-name">Your Saved Tracks</span>
                <span className="bin-desc">Entire library</span>
              </div>
              <span className="bin-count">{tracks.length}</span>
            </button>

            {/* Dynamic OYM Bins */}
            {currentCategoryBins.map((bin) => (
              <div
                key={bin.id}
                className={`bin ${activeBinId === bin.id ? 'active' : ''}`}
                onClick={() => setActiveBinId(bin.id)}
              >
                <div className="bin-title">
                  <span className="bin-name">{bin.label}</span>
                  <span className="bin-desc">
                    {bin.trackCount} tracks / {bin.artistCount} artists
                  </span>
                </div>
                <div className="bin-meta">
                  {bin.category === 'custom' && (
                    <button
                      className="bin-action-btn"
                      title={t('customDelete')}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCustomBin(bin.id)
                      }}
                    >
                      ×
                    </button>
                  )}
                  <button
                    className="bin-action-btn"
                    title={`Create "${bin.label}" playlist on Spotify`}
                    onClick={(e) => {
                      e.stopPropagation()
                      saveBinAsPlaylist(bin)
                    }}
                  >
                    + Playlist
                  </button>
                  <span className="bin-count">{bin.trackCount}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="main-panel">
          {/* Panel Top Heading & Actions */}
          <div className="panel-top">
            <div className="panel-info">
              <p className="kicker">
                {activeBinObject ? activeBinObject.categoryLabel.toUpperCase() : 'YOUR MUSIC'} · ORGANIZED
              </p>
              <h1>{activeBinTitle}</h1>
              <p className="subhead">
                {filteredTracks.length.toLocaleString()} tracks showing · {new Set(filteredTracks.map((t) => t.artist)).size} artists
              </p>
            </div>

            <div className="panel-actions">
              <button className="wizard-trigger-btn" onClick={() => setWizardOpen(true)}>
                <Wand2 size={15} /> {t('autoWizard')}
              </button>

              <button
                className="wizard-trigger-btn"
                onClick={() => setShareOpen(true)}
                disabled={!tracks.length}
                title="Share your taste as a card"
              >
                <Share2 size={15} /> {t('share')}
              </button>

              {activeBinObject ? (
                <button
                  className="button button-accent"
                  onClick={() => saveBinAsPlaylist(activeBinObject)}
                  disabled={!filteredTracks.length || isSavingPlaylist}
                >
                  <Music2 size={14} /> {isSavingPlaylist ? t('saving') : `Save "${activeBinObject.label}" ${t('saveAsPlaylist')}`}
                </button>
              ) : (
                <button
                  className="button button-dark"
                  onClick={saveFilteredAsPlaylist}
                  disabled={!filteredTracks.length || isSavingPlaylist}
                >
                  <Music2 size={14} /> {isSavingPlaylist ? t('saving') : `${t('saveView')} (${filteredTracks.length})`}
                </button>
              )}

              <button
                className="button button-light"
                onClick={() => {
                  const ids = new Set(filteredTracks.map((t) => t.id))
                  setSelectedIds(ids)
                }}
              >
                <Check size={14} /> {t('selectAll')} ({filteredTracks.length})
              </button>

              <button
                className="button button-light"
                onClick={exportFilteredCsv}
                disabled={!filteredTracks.length}
                title="Download the full filtered view as CSV"
              >
                <Download size={14} /> {t('exportCsv')} ({filteredTracks.length})
              </button>

              <button
                className="button button-light"
                onClick={() => {
                  void copyText(filteredTracks.map((tr) => tr.uri).join('\n')).then((ok) =>
                    setNotice({
                      message: ok ? t('copiedUris') : t('restoreFailed'),
                      type: ok ? 'success' : 'error',
                    })
                  )
                }}
                disabled={!filteredTracks.length}
                title="Copy Spotify URIs of the full filtered view (paste into DJ tools, docs…)"
              >
                <Share2 size={14} /> {t('copyUris')} ({filteredTracks.length})
              </button>

              <button className="button button-accent" onClick={() => setTab('staging')}>
                <Disc size={14} /> {t('staging')} ({stagedTracks.length})
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="tabs">
            <button className={`tab ${tab === 'tracks' ? 'active' : ''}`} onClick={() => setTab('tracks')}>
              {t('tabTracks')}
            </button>
            <button className={`tab ${tab === 'plots' ? 'active' : ''}`} onClick={() => setTab('plots')}>
              {t('tabPlots')}
            </button>
            <button className={`tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
              {t('tabStats')}
            </button>
            <button className={`tab ${tab === 'staging' ? 'active' : ''}`} onClick={() => setTab('staging')}>
              {t('tabStaging')} ({stagedTracks.length})
            </button>
            <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>
              {t('tabCompare')}
            </button>
            <button className={`tab ${tab === 'duplicates' ? 'active' : ''}`} onClick={() => setTab('duplicates')}>
              {t('tabDuplicates')}
            </button>
          </nav>

          {/* TAB: TRACKS VIEW */}
          {tab === 'tracks' && (
            <>
              {/* Multi-Dimensional Filter Bar */}
              <div className="filter-bar-advanced">
                <div className="filter-row-top">
                  <div className="filter-group">
                    <label>{t('searchCollection')}</label>
                    <input
                      id="studio-search"
                      placeholder={`${t('searchPlaceholder')} (${t('shortcutsHint')})`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="filter-group">
                    <label>{t('savedViews')}</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        placeholder={t('viewNamePh')}
                        value={viewName}
                        maxLength={60}
                        onChange={(e) => setViewName(e.target.value)}
                        style={{ maxWidth: 130 }}
                      />
                      <button
                        className="button button-light"
                        style={{ height: 35, padding: '0 12px', fontSize: 11 }}
                        disabled={!viewName.trim()}
                        onClick={saveCurrentView}
                        title={t('saveCurrentView')}
                      >
                        +
                      </button>
                      {savedViews.length > 0 && (
                        <select
                          className="source-select"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) applySavedView(e.target.value)
                            e.target.value = ''
                          }}
                          title={t('savedViews')}
                        >
                          <option value="">
                            {savedViews.length} ✓
                          </option>
                          {savedViews.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {savedViews.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {savedViews.map((v) => (
                          <span key={v.id} className="preset-chip" style={{ cursor: 'pointer' }}>
                            <span onClick={() => applySavedView(v.id)}>{v.name}</span>
                            <button
                              className="bin-action-btn"
                              title={t('deleteView')}
                              onClick={() => deleteSavedView(v.id)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {savedViews.length === 0 && <span className="plot-hint">{t('noSavedViews')}</span>}
                  </div>

                  <div className="filter-group">
                    <label>{t('quickSliders')}</label>
                    <button
                      className="button button-light"
                      style={{ height: 35, padding: '0 12px', fontSize: 11 }}
                      onClick={() => setShowSliders(!showSliders)}
                    >
                      <Sliders size={13} /> {showSliders ? t('hideSliders') : t('showSliders')}
                    </button>
                  </div>

                  {isFiltersApplied && (
                    <button className="filter-reset-btn" onClick={resetFilters}>
                      <X size={12} /> {t('resetFilters')}
                    </button>
                  )}
                </div>

                {/* Range Sliders Drawer */}
                {showSliders && (
                  <div className="filter-sliders-grid">
                    <div className="slider-group">
                      <div className="slider-header">
                        <span>BPM / TEMPO</span>
                        <strong>
                          {minBpm} - {maxBpm} BPM
                        </strong>
                      </div>
                      <div className="dual-range">
                        <input type="range" min="50" max="210" value={minBpm} onChange={(e) => setMinBpm(Math.min(Number(e.target.value), maxBpm))} aria-label="Min BPM" />
                        <input type="range" min="50" max="210" value={maxBpm} onChange={(e) => setMaxBpm(Math.max(Number(e.target.value), minBpm))} aria-label="Max BPM" />
                      </div>
                    </div>

                    <div className="slider-group">
                      <div className="slider-header">
                        <span>ENERGY</span>
                        <strong>
                          {minEnergy}% - {maxEnergy}%
                        </strong>
                      </div>
                      <div className="dual-range">
                        <input type="range" min="0" max="100" value={minEnergy} onChange={(e) => setMinEnergy(Math.min(Number(e.target.value), maxEnergy))} aria-label="Min energy" />
                        <input type="range" min="0" max="100" value={maxEnergy} onChange={(e) => setMaxEnergy(Math.max(Number(e.target.value), minEnergy))} aria-label="Max energy" />
                      </div>
                    </div>

                    <div className="slider-group">
                      <div className="slider-header">
                        <span>VALENCE / MOOD</span>
                        <strong>
                          {minValence}% - {maxValence}%
                        </strong>
                      </div>
                      <div className="dual-range">
                        <input type="range" min="0" max="100" value={minValence} onChange={(e) => setMinValence(Math.min(Number(e.target.value), maxValence))} aria-label="Min valence" />
                        <input type="range" min="0" max="100" value={maxValence} onChange={(e) => setMaxValence(Math.max(Number(e.target.value), minValence))} aria-label="Max valence" />
                      </div>
                    </div>

                    <div className="slider-group">
                      <div className="slider-header">
                        <span>DANCEABILITY</span>
                        <strong>
                          {minDance}% - {maxDance}%
                        </strong>
                      </div>
                      <div className="dual-range">
                        <input type="range" min="0" max="100" value={minDance} onChange={(e) => setMinDance(Math.min(Number(e.target.value), maxDance))} aria-label="Min danceability" />
                        <input type="range" min="0" max="100" value={maxDance} onChange={(e) => setMaxDance(Math.max(Number(e.target.value), minDance))} aria-label="Max danceability" />
                      </div>
                    </div>

                    <div className="slider-group">
                      <div className="slider-header">
                        <span>POPULARITY</span>
                        <strong>
                          {minPop} - {maxPop}
                        </strong>
                      </div>
                      <div className="dual-range">
                        <input type="range" min="0" max="100" value={minPop} onChange={(e) => setMinPop(Math.min(Number(e.target.value), maxPop))} aria-label="Min popularity" />
                        <input type="range" min="0" max="100" value={maxPop} onChange={(e) => setMaxPop(Math.max(Number(e.target.value), minPop))} aria-label="Max popularity" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Insights Bar */}
              <div className="insights">
                <div>
                  <span>TRACKS</span>
                  <strong>{filteredTracks.length.toLocaleString()}</strong>
                </div>
                <div>
                  <span>AVG BPM</span>
                  <strong>{avgBpm ? `${avgBpm} BPM` : '—'}</strong>
                </div>
                <div>
                  <span>AVG ENERGY</span>
                  <strong>{avgEnergy ? `${avgEnergy}%` : '—'}</strong>
                </div>
                <div>
                  <span>AVG VALENCE (MOOD)</span>
                  <strong>{avgValence ? `${avgValence}%` : '—'}</strong>
                </div>
              </div>

              {/* Full Organize Your Music Data Table */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 25 }}>#</th>
                      <th style={{ width: 25 }}>SEL</th>
                      <th style={{ width: 25 }}>▶</th>
                      <th onClick={() => updateSort('name')}>TITLE</th>
                      <th onClick={() => updateSort('artist')}>ARTIST</th>
                      <th>TOP GENRE</th>
                      <th onClick={() => updateSort('year')}>YEAR</th>
                      <th onClick={() => updateSort('addedAt')}>ADDED</th>
                      <th onClick={() => updateSort('bpm')}>BPM</th>
                      <th onClick={() => updateSort('energy')}>NRGY</th>
                      <th onClick={() => updateSort('danceability')}>DNC</th>
                      <th onClick={() => updateSort('valence')}>VAL</th>
                      <th onClick={() => updateSort('acousticness')}>ACOU</th>
                      <th onClick={() => updateSort('speechiness')}>SPCH</th>
                      <th onClick={() => updateSort('loudness')}>LOUD</th>
                      <th onClick={() => updateSort('liveness')}>LIVE</th>
                      <th onClick={() => updateSort('popularity')}>POP</th>
                      <th onClick={() => updateSort('duration')}>DUR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracks.slice(0, MAX_TRACK_ROWS).map((track, index) => (
                      <tr className={selectedIds.has(track.id) ? 'row-selected' : ''} key={track.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 10 }}>{index + 1}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(track.id)}
                            onChange={(event) => {
                              selectTrack(index, event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)
                              setLastSelectedIndex(index)
                            }}
                          />
                        </td>
                        <td>
                          <TrackPlayButton
                            track={track}
                            size={10}
                            playing={playingId === track.id}
                            playingKind={playingKind}
                            fullReady={playerDeviceId !== null}
                            isPremium={isPremium}
                            onPlay={() => playPreview(track)}
                          />
                        </td>
                        <td className="title-cell">
                          <span className="title-wrap">
                            {track.albumImageUrl ? (
                              <img src={track.albumImageUrl} alt="" className="album-thumb" loading="lazy" />
                            ) : (
                              <span className="album-thumb album-thumb-fallback">
                                <Music2 size={12} />
                              </span>
                            )}
                            <span className="title-text">{track.name}</span>
                          </span>
                        </td>
                        <td>{track.artist}</td>
                        <td>{track.artistGenres[0] || '—'}</td>
                        <td>{track.year || '—'}</td>
                        <td>{new Date(track.addedAt).toLocaleDateString()}</td>
                        <td>{track.audioFeatures ? Math.round(track.audioFeatures.tempo) : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.energy * 100)}%` : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.danceability * 100)}%` : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.valence * 100)}%` : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.acousticness * 100)}%` : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.speechiness * 100)}%` : '—'}</td>
                        <td>{track.audioFeatures ? `${track.audioFeatures.loudness.toFixed(1)} dB` : '—'}</td>
                        <td>{track.audioFeatures ? `${Math.round(track.audioFeatures.liveness * 100)}%` : '—'}</td>
                        <td>{track.popularity}</td>
                        <td>{`${Math.floor(track.durationMs / 60000)}:${String(Math.floor(track.durationMs / 1000) % 60).padStart(2, '0')}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!filteredTracks.length && (
                  <div className="empty">
                    <Music2 size={32} />
                    <strong>No matching tracks found</strong>
                    <span>Try clearing search filters or changing the active bin.</span>
                  </div>
                )}
                {filteredTracks.length > MAX_TRACK_ROWS && (
                  <div className="truncated-notice">
                    Showing the first {MAX_TRACK_ROWS.toLocaleString()} matching tracks.
                  </div>
                )}
              </div>

              {/* Mobile card list (replaces the wide table on small screens) */}
              <div className="track-cards">
                {filteredTracks.slice(0, MAX_MOBILE_ROWS).map((track, index) => (
                  <div
                    className={`track-card ${selectedIds.has(track.id) ? 'selected' : ''}`}
                    key={track.id}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('button,input')) return
                      selectTrack(index, event.shiftKey)
                      setLastSelectedIndex(index)
                    }}
                  >
                    {track.albumImageUrl ? (
                      <img src={track.albumImageUrl} alt="" className="track-card-art" loading="lazy" />
                    ) : (
                      <span className="track-card-art track-card-fallback">
                        <Music2 size={16} />
                      </span>
                    )}
                    <div className="track-card-main">
                      <strong>{track.name}</strong>
                      <small>{track.artist}</small>
                      <div className="track-card-meta">
                        <span>{track.artistGenres[0] || '—'}</span>
                        <span>{track.audioFeatures ? `${Math.round(track.audioFeatures.tempo)} BPM` : '—'}</span>
                        <span>{track.audioFeatures ? `${Math.round(track.audioFeatures.energy * 100)}% NRG` : ''}</span>
                        <span>{track.year || ''}</span>
                      </div>
                    </div>
                    <div className="track-card-side">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(track.id)}
                        onChange={(event) => {
                          selectTrack(index, event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)
                          setLastSelectedIndex(index)
                        }}
                        aria-label={`Select ${track.name}`}
                      />
                      <TrackPlayButton
                        track={track}
                        size={12}
                        playing={playingId === track.id}
                        playingKind={playingKind}
                        fullReady={playerDeviceId !== null}
                        isPremium={isPremium}
                        onPlay={() => playPreview(track)}
                      />
                    </div>
                  </div>
                ))}
                {!filteredTracks.length && (
                  <div className="empty">
                    <Music2 size={32} />
                    <strong>No matching tracks found</strong>
                    <span>Try clearing search filters or changing the active bin.</span>
                  </div>
                )}
                {filteredTracks.length > MAX_MOBILE_ROWS && (
                  <div className="truncated-notice">
                    Showing the first {MAX_MOBILE_ROWS.toLocaleString()} matching tracks on mobile.
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB: AUDIO PROFILE SCATTER PLOTS (lazy: recharts loads on demand) */}
          {tab === 'plots' && (
            <Suspense fallback={<div className="empty"><strong>Loading plots…</strong></div>}>
              <PlotView
                tracks={filteredTracks}
                onSelect={(id) => setSelectedIds((current) => new Set([...current, id]))}
                onSelectMany={(ids) => setSelectedIds((current) => new Set([...current, ...ids]))}
              />
            </Suspense>
          )}

          {/* TAB: LIBRARY STATS (lazy: recharts loads on demand) */}
          {tab === 'stats' && (
            <Suspense fallback={<div className="empty"><strong>Loading stats…</strong></div>}>
              <StatsView tracks={tracks} />
            </Suspense>
          )}

          {/* TAB: COMPARE BINS */}
          {tab === 'compare' && (
            <Suspense fallback={<div className="empty"><strong>Loading compare…</strong></div>}>
              <CompareView
                bins={allOYMBins}
                tracks={tracks}
                onStage={(ids) => {
                  setSelectedIds((current) => new Set([...current, ...ids]))
                  setTab('staging')
                }}
              />
            </Suspense>
          )}

          {/* TAB: FIND DUPLICATES */}
          {tab === 'duplicates' && (
            <Suspense fallback={<div className="empty"><strong>Loading duplicates…</strong></div>}>
              <DuplicatesView
                tracks={tracks}
                onStage={(ids) => {
                  setSelectedIds((current) => new Set([...current, ...ids]))
                  setTab('staging')
                }}
              />
            </Suspense>
          )}

          {/* TAB: STAGING PLAYLIST VIEW */}
          {tab === 'staging' && (
            <StagingView
              tracks={stagedTracks}
              name={playlistName}
              description={playlistDescription}
              setName={setPlaylistName}
              setDescription={setPlaylistDescription}
              sortOrder={stagingSortOrder}
              setSortOrder={(order) => {
                setStagingSortOrder(order)
                setStagingOrder(null)
              }}
              onOptimize={optimizeStagingFlow}
              flowOptimized={stagingOrder !== null}
              onMove={moveStaged}
              onSave={() => createAndExportPlaylist(playlistName, stagedTracks, playlistDescription)}
              onClear={() => {
                setSelectedIds(new Set())
                setStagingOrder(null)
              }}
              onRemove={(id) =>
                setSelectedIds((current) => {
                  const next = new Set(current)
                  next.delete(id)
                  return next
                })
              }
              isSaving={isSavingPlaylist}
            />
          )}
        </section>
      </div>

      {/* Share Taste Modal */}
      {shareOpen && (
        <Suspense fallback={null}>
          <ShareCardModal
            tracks={tracks}
            sourceLabel={sourceLabel}
            liveCount={spotifyLiveCount}
            onClose={() => setShareOpen(false)}
          />
        </Suspense>
      )}

      {/* WhatsNew Modal — new Liked Songs since the last sync */}
      {whatsNewOpen && lastSync && (
        <Suspense fallback={null}>
          <WhatsNewModal
            sinceIso={new Date(lastSync.at).toISOString()}
            currentIds={tracks.map((tr) => tr.id)}
            onSync={() => {
              setWhatsNewOpen(false)
              void sync()
            }}
            onClose={() => setWhatsNewOpen(false)}
          />
        </Suspense>
      )}

      {/* Sync history Modal */}
      {historyOpen && (
        <Suspense fallback={null}>
          <SyncHistoryModal onClose={() => setHistoryOpen(false)} />
        </Suspense>
      )}

      {/* Auto-Playlist Wizard Modal */}
      {wizardOpen && (
        <div className="modal-overlay" onClick={() => setWizardOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Sparkles size={18} color="var(--accent)" /> {t('wizardTitle')}
              </h2>
              <button className="modal-close" onClick={() => setWizardOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-field">
                <label>{t('quickStart')}</label>
                <div className="preset-grid">
                  {PLAYLIST_PRESETS.map((preset) => {
                    const count = tracks.filter(preset.filter).length
                    return (
                      <button
                        key={preset.id}
                        className="preset-chip"
                        title={preset.description}
                        disabled={!count || isSavingPlaylist}
                        onClick={() => applyPresetPlaylistCreation(preset)}
                      >
                        <strong>{preset.name}</strong>
                        <span>{count} tracks</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="modal-field">
                <label>{t('playlistName')}</label>
                <input
                  value={wizardConfig.title}
                  onChange={(e) => setWizardConfig({ ...wizardConfig, title: e.target.value })}
                  placeholder="e.g. 130 BPM Workout Flow"
                />
              </div>

              <div className="modal-field">
                <label>{t('description')}</label>
                <input
                  value={wizardConfig.description}
                  onChange={(e) => setWizardConfig({ ...wizardConfig, description: e.target.value })}
                  placeholder="e.g. Energy build playlist created with Cartridge"
                />
              </div>

              <div className="modal-grid-2">
                <div className="modal-field">
                  <label>{t('genre')}</label>
                  <select
                    value={wizardConfig.genre}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, genre: e.target.value })}
                  >
                    <option value="all">{t('allGenres')}</option>
                    {topGenresList.map(([genre, count]) => (
                      <option key={genre} value={genre}>
                        {genre} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-field">
                  <label>{t('decade')}</label>
                  <select
                    value={wizardConfig.decade}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, decade: e.target.value })}
                  >
                    <option value="all">{t('allDecades')}</option>
                    {uniqueDecades.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-field">
                  <label>{t('bpmTempo')}</label>
                  <select
                    value={wizardConfig.bpm}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, bpm: e.target.value })}
                  >
                    <option value="all">{t('anyTempo')}</option>
                    <option value="slow">Slow (&lt; 90 BPM)</option>
                    <option value="moderate">Moderate (90-120 BPM)</option>
                    <option value="fast">Fast (120+ BPM)</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>{t('energy')}</label>
                  <select
                    value={wizardConfig.energy}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, energy: e.target.value })}
                  >
                    <option value="all">{t('anyEnergy')}</option>
                    <option value="chill">Chill (&lt; 45%)</option>
                    <option value="high">High Energy (65%+)</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-field">
                  <label>{t('mood')}</label>
                  <select
                    value={wizardConfig.mood}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, mood: e.target.value })}
                  >
                    <option value="all">{t('anyMood')}</option>
                    <option value="amped">Amped</option>
                    <option value="danceable">Danceable</option>
                    <option value="chill">Chill</option>
                    <option value="anger">Anger</option>
                    <option value="sad">Sad</option>
                    <option value="happy">Happy</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>{t('trackLimit')}</label>
                  <select
                    value={wizardConfig.limit}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, limit: Number(e.target.value) })}
                  >
                    <option value={20}>20 Tracks</option>
                    <option value={30}>30 Tracks</option>
                    <option value={50}>50 Tracks</option>
                    <option value={100}>100 Tracks</option>
                    <option value={9999}>All Matching</option>
                  </select>
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label>{t('flowOrdering')}</label>
                  <select
                    value={wizardConfig.flowOrder}
                    onChange={(e) =>
                      setWizardConfig({
                        ...wizardConfig,
                        flowOrder: e.target.value as 'bpm_ramp' | 'energy_ramp' | 'newest' | 'popularity' | 'shuffle',
                      })
                    }
                  >
                    <option value="bpm_ramp">BPM ramp — slow to fast</option>
                    <option value="energy_ramp">Energy ramp — builds up</option>
                    <option value="newest">Recently added first</option>
                    <option value="popularity">Most popular first</option>
                    <option value="shuffle">Shuffle</option>
                  </select>
                </div>
              </div>

              <div className="matching-preview-badge">
                <span>{t('matching')} {sourceKind === 'liked' ? t('likedSongsSrc') : sourceLabel}:</span>
                <strong>{wizardMatchingTracks.length} {t('tracksReady')}</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button className="button button-light" onClick={() => setWizardOpen(false)}>
                {t('cancel')}
              </button>
              <button
                className="button button-accent"
                disabled={!wizardMatchingTracks.length || isSavingPlaylist}
                onClick={executeWizardPlaylistCreation}
              >
                <Music2 size={15} /> {isSavingPlaylist ? t('saving') : t('createSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function StagingView({
  tracks,
  name,
  description,
  setName,
  setDescription,
  sortOrder,
  setSortOrder,
  onOptimize,
  flowOptimized,
  onMove,
  onSave,
  onClear,
  onRemove,
  isSaving,
}: {
  tracks: Track[]
  name: string
  description: string
  setName: (name: string) => void
  setDescription: (description: string) => void
  sortOrder: string
  setSortOrder: (order: string) => void
  onOptimize: () => void
  flowOptimized: boolean
  onMove: (from: number, to: number) => void
  onSave: () => void
  onClear: () => void
  onRemove: (id: string) => void
  isSaving: boolean
}) {
  const t = useT()
  const flow = useMemo(() => flowScore(tracks), [tracks])
  const transitions = useMemo(() => transitionScores(tracks), [tracks])
  return (
    <section className="staging">
      <div className="staging-heading">
        <div>
          <p className="kicker">{t('readyToExport')}</p>
          <h2>{t('stagingTitle')} ({tracks.length} {t('tracks')})</h2>
          <p>{t('stagingSub')}</p>
          {flow !== null && (
            <p className="flow-badge" title="Average smoothness of back-to-back transitions">
              <Wand2 size={13} /> {t('djFlow')}: <strong>{flow}/100 · {flowLabel(flow)}</strong>
              {flowOptimized && <span className="flow-optimized">{t('optimized')}</span>}
            </p>
          )}
        </div>
        <div className="staging-heading-actions">
          <button
            className="button button-light"
            onClick={onOptimize}
            disabled={tracks.length < 3}
            title="Reorder for the smoothest back-to-back mixes"
          >
            <Wand2 size={14} /> {t('optimizeFlow')}
          </button>
          <button className="text-button" onClick={onClear} disabled={!tracks.length}>
            <X size={14} /> {t('clearSelection')}
          </button>
        </div>
      </div>

      <div className="playlist-save">
        <label>
          {t('playlistName')}
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          {t('description')}
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label style={{ maxWidth: 200 }}>
          {t('sortOrder')}
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="natural">{t('naturalOrder')}</option>
            <option value="bpm_asc">BPM ramp — slow to fast</option>
            <option value="bpm_desc">BPM — fast to slow</option>
            <option value="energy_ramp">Energy ramp</option>
            <option value="popularity">Most popular first</option>
            <option value="newest">Recently added first</option>
          </select>
        </label>
        <button className="button button-accent" onClick={onSave} disabled={!tracks.length || isSaving}>
          <Music2 size={15} /> {isSaving ? t('savingToSpotify') : t('saveToSpotify')}
        </button>
      </div>

      <div className="staging-list">
        {tracks.slice(0, MAX_STAGING_ROWS).map((track, index) => {
          const score = transitions[index]
          return (
          <div
            className="staging-track"
            key={track.id}
            draggable
            style={{ cursor: 'grab' }}
            title="Drag to reorder"
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', String(index))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              const from = Number(e.dataTransfer.getData('text/plain'))
              if (Number.isInteger(from)) onMove(from, index)
            }}
          >
            <span className="staging-pos">
              {score !== null && score !== undefined && (
                <i
                  className={`flow-dot ${score >= 70 ? 'good' : score >= 45 ? 'ok' : 'bad'}`}
                  title={`Transition into this track: ${score}/100`}
                />
              )}
              {String(index + 1).padStart(2, '0')}
            </span>
            <strong>{track.name}</strong>
            <small>
              {track.artist} · {track.album}
            </small>
            <b>{track.audioFeatures ? `${Math.round(track.audioFeatures.tempo)} BPM` : '—'}</b>
            <button
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Remove from staging"
              onClick={() => onRemove(track.id)}
            >
              <X size={14} />
            </button>
          </div>
          )
        })}

        {!tracks.length && (
          <div className="empty">
            <Music2 size={32} />
            <strong>{t('nothingStaged')}</strong>
            <span>{t('nothingStagedSub')}</span>
          </div>
        )}
        {tracks.length > MAX_STAGING_ROWS && (
          <div className="truncated-notice">
            Showing the first {MAX_STAGING_ROWS} matching tracks.
          </div>
        )}
      </div>
    </section>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function TrackPlayButton({
  track,
  size,
  playing,
  playingKind,
  fullReady,
  isPremium,
  onPlay,
}: {
  track: Track
  size: number
  playing: boolean
  playingKind: 'full' | 'preview' | null
  fullReady: boolean
  isPremium: boolean | null
  onPlay: () => void
}) {
  const mode = decidePlaybackMode(track, fullReady, isPremium)
  const title = playing
    ? playingKind === 'full'
      ? 'Pause full track'
      : 'Pause preview'
    : mode === 'full'
      ? 'Play full track (Spotify Premium)'
      : mode === 'preview'
        ? 'Play 30s preview'
        : 'No playback available'
  return (
    <button
      className="table-play"
      title={title}
      aria-label={title}
      disabled={mode === 'none'}
      onClick={onPlay}
    >
      {playing ? '||' : <Play size={size} fill="currentColor" />}
    </button>
  )
}

class StudioErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[studio] render failed:', error)
  }
  render() {
    if (this.state.error) {
      return (
        <main className="app-frame">
          <div className="empty">
            <strong>Something broke while rendering the studio</strong>
            <span style={{ maxWidth: 560 }}>{String(this.state.error?.message || this.state.error)}</span>
            <span>Copy this message and send it over — it pinpoints the bug.</span>
            <button
              className="button button-accent"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/app"
          element={
            <StudioErrorBoundary>
              <Studio />
            </StudioErrorBoundary>
          }
        />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
