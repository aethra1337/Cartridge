import type { Track } from '../types'

export interface PlaylistPreset {
  id: string
  name: string
  emoji: string
  description: string
  suggestedPlaylistTitle: string
  suggestedDescription: string
  filter: (track: Track) => boolean
  sort: (a: Track, b: Track) => number
}

export const PLAYLIST_PRESETS: PlaylistPreset[] = [
  {
    id: 'workout-high-bpm',
    name: 'High BPM Workout',
    emoji: '⚡',
    description: 'Fast-paced, high energy tracks (125+ BPM) for gym, running & cardio.',
    suggestedPlaylistTitle: 'Cartridge: High BPM Workout',
    suggestedDescription: 'Curated 125+ BPM high octane tracks from my Liked Songs.',
    filter: (track) => {
      const bpm = track.audioFeatures?.tempo || 0
      const energy = track.audioFeatures?.energy || 0
      return bpm >= 125 || energy >= 0.75
    },
    sort: (a, b) => (b.audioFeatures?.tempo || 0) - (a.audioFeatures?.tempo || 0),
  },
  {
    id: 'late-night-chill',
    name: 'Late Night Chill',
    emoji: '🌙',
    description: 'Mellow, low-tempo, relaxed vibes for studying, winding down, or late drives.',
    suggestedPlaylistTitle: 'Cartridge: Late Night Chill',
    suggestedDescription: 'Smooth, relaxed and low-tempo songs curated with Cartridge.',
    filter: (track) => {
      const energy = track.audioFeatures?.energy !== undefined ? track.audioFeatures.energy : 0.5
      const bpm = track.audioFeatures?.tempo || 100
      return energy <= 0.55 && bpm <= 118
    },
    sort: (a, b) => (a.audioFeatures?.energy || 0) - (b.audioFeatures?.energy || 0),
  },
  {
    id: 'dance-party-groove',
    name: 'Peak Dance & Groove',
    emoji: '🪩',
    description: 'High danceability tracks with strong rhythm to get anyone moving.',
    suggestedPlaylistTitle: 'Cartridge: Peak Dance Floor',
    suggestedDescription: 'Highest rhythm & danceability anthems from my Liked Songs.',
    filter: (track) => {
      const dance = track.audioFeatures?.danceability || 0
      const energy = track.audioFeatures?.energy || 0
      return dance >= 0.68 || (dance >= 0.62 && energy >= 0.65)
    },
    sort: (a, b) => (b.audioFeatures?.danceability || 0) - (a.audioFeatures?.danceability || 0),
  },
  {
    id: 'sad-melancholy-hours',
    name: 'Melancholic Hours',
    emoji: '🌧️',
    description: 'Deep, emotional, low-valence songs for reflective moods.',
    suggestedPlaylistTitle: 'Cartridge: Melancholic Echoes',
    suggestedDescription: 'Emotional, introspective and moody tracks from my library.',
    filter: (track) => {
      const valence = track.audioFeatures?.valence !== undefined ? track.audioFeatures.valence : 0.5
      return valence <= 0.38
    },
    sort: (a, b) => (a.audioFeatures?.valence || 0) - (b.audioFeatures?.valence || 0),
  },
  {
    id: 'happy-euphoria',
    name: 'Pure Euphoria & Joy',
    emoji: '☀️',
    description: 'Uplifting, optimistic, high-valence feel-good bangers.',
    suggestedPlaylistTitle: 'Cartridge: Feel-Good Euphoria',
    suggestedDescription: 'Bright, joyful and uplifting songs to boost your day.',
    filter: (track) => {
      const valence = track.audioFeatures?.valence || 0
      return valence >= 0.62
    },
    sort: (a, b) => (b.audioFeatures?.valence || 0) - (a.audioFeatures?.valence || 0),
  },
  {
    id: 'top-mainstream-hits',
    name: 'Top Hits & Chart Toppers',
    emoji: '🔥',
    description: 'The most popular, globally recognized tracks in your collection.',
    suggestedPlaylistTitle: 'Cartridge: Mainstream Hits',
    suggestedDescription: 'Highest popularity tracks curated from my Spotify library.',
    filter: (track) => track.popularity >= 60,
    sort: (a, b) => b.popularity - a.popularity,
  },
  {
    id: 'hidden-underground-gems',
    name: 'Underground & Hidden Gems',
    emoji: '💎',
    description: 'Undiscovered indie tracks, b-sides, and deep cuts with lower popularity.',
    suggestedPlaylistTitle: 'Cartridge: Hidden Gems & Deep Cuts',
    suggestedDescription: 'Underrated, indie and deep-cut tracks from my Liked Songs.',
    filter: (track) => track.popularity <= 40,
    sort: (a, b) => a.popularity - b.popularity,
  },
  {
    id: 'recent-additions',
    name: 'Recently Saved Favorites',
    emoji: '✨',
    description: 'Your freshest library additions from the last 90 days.',
    suggestedPlaylistTitle: 'Cartridge: Fresh Additions',
    suggestedDescription: 'The latest tracks saved to my Spotify library.',
    filter: (track) => {
      const added = new Date(track.addedAt).getTime()
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
      return added >= ninetyDaysAgo
    },
    sort: (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  },
]
