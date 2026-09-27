import { estimateAudioFeatures } from '../oym/audioIntelligence'
import type { Track } from '../types'

type SeedRow = [
  title: string,
  artist: string,
  album: string,
  genres: string[],
  year: number,
  popularity: number,
  durationSec: number,
  explicit?: boolean,
  daysAgo?: number,
]

// Fictional artists so the demo never misrepresents real musicians
// (audio features here are estimates anyway).
const SEED: SeedRow[] = [
  // Pop / dance pop
  ['Paper Satellites', 'Velvet Static', 'Neon Postcards', ['pop'], 2023, 82, 214, false, 12],
  ['Glow Relay', 'Velvet Static', 'Neon Postcards', ['pop', 'dance pop'], 2023, 77, 198, false, 40],
  ['Sugar Circuit', 'Candy Riot', 'Bubblegum Voltage', ['dance pop'], 2024, 88, 205, false, 5],
  ['Half Light Parade', 'Candy Riot', 'Bubblegum Voltage', ['dance pop'], 2022, 64, 221, false, 120],
  ['Ultraviolet Hearts', 'Mira Sol', 'Daydream Warranty', ['pop'], 2021, 71, 236, false, 300],
  // Rock / indie / punk / metal
  ['Concrete Bloom', 'Ashen Meridian', 'Rust & Petals', ['rock'], 2019, 68, 248, false, 210],
  ['Static Bloom', 'Ashen Meridian', 'Rust & Petals', ['rock'], 2015, 55, 262, false, 500],
  ['Fog Machinery', 'Paper Witches', 'Basement Weather', ['indie rock'], 2020, 61, 233, false, 150],
  ['Basement Weather', 'Paper Witches', 'Basement Weather', ['indie rock'], 2020, 58, 251, false, 150],
  ['Glass Teeth', 'Paper Witches', 'Loft Tapes', ['indie rock'], 2024, 66, 189, false, 8],
  ['Riot of Pigeons', 'The Short Fuses', 'Three Chord Riot', ['punk'], 2018, 52, 142, false, 320],
  ['Three Chord Riot', 'The Short Fuses', 'Three Chord Riot', ['punk'], 2018, 49, 131, false, 320],
  ['Iron Harvest', 'Carrion Choir', 'Fields of Static', ['metal'], 2021, 57, 312, true, 95],
  ['Fields of Static', 'Carrion Choir', 'Fields of Static', ['metal'], 2021, 54, 345, true, 95],
  ['Anvil Choir', 'Carrion Choir', 'Hammer Hymns', ['metal'], 2017, 44, 298, false, 430],
  // Hip hop / rap / trap
  ['Corner Store Prophets', 'Marble Mouth', 'Corner Store Dreams', ['hip hop'], 2022, 74, 226, true, 60],
  ['Marble Mouth Season', 'Marble Mouth', 'Corner Store Dreams', ['hip hop'], 2022, 69, 241, false, 60],
  ['Velvet Cipher', 'Iris Decoded', 'Soft Encryption', ['rap'], 2023, 78, 208, true, 25],
  ['Night Bus Confessions', 'Iris Decoded', 'Soft Encryption', ['rap'], 2023, 73, 232, false, 25],
  ['Chrome Oasis', 'Yung Mirage', 'Desert Bandwidth', ['trap'], 2024, 85, 197, true, 3],
  ['Desert Bandwidth', 'Yung Mirage', 'Desert Bandwidth', ['trap'], 2024, 81, 184, false, 3],
  // Electronic: house / techno / synthwave / dnb
  ['Midnight Ferry', 'Neon Coastlines', 'Harbor Lights', ['synthwave'], 2016, 62, 284, false, 600],
  ['Midnight Ferry (Remastered 2015)', 'Neon Coastlines', 'Harbor Lights Deluxe', ['synthwave'], 2015, 48, 286, false, 700],
  ['Harbor Lights', 'Neon Coastlines', 'Harbor Lights', ['synthwave'], 2016, 59, 267, false, 600],
  ['Glass Harbor', 'Neon Coastlines', 'Tide Machines', ['synthwave'], 2020, 63, 251, false, 180],
  ['Tide Machines', 'Glass Harbor', 'Tide Machines', ['house'], 2021, 67, 372, false, 170],
  ['Afterhours Ledger', 'Glass Harbor', 'Tide Machines', ['house'], 2021, 60, 388, false, 170],
  ['Concrete Pulse', 'Kessler Unit', 'Factory Prayers', ['techno'], 2019, 51, 421, false, 260],
  ['Factory Prayers', 'Kessler Unit', 'Factory Prayers', ['techno'], 2019, 47, 445, false, 260],
  ['Jungle Telegram', 'Breakneck Bureau', 'Amen Archive', ['drum and bass'], 2023, 56, 312, false, 30],
  // R&B / soul / funk
  ['Honey Interval', 'Sable June', 'Slow Honey', ['r&b'], 2022, 72, 254, false, 80],
  ['Slow Honey', 'Sable June', 'Slow Honey', ['r&b', 'soul'], 2022, 70, 269, false, 80],
  ['Copper Skyline', 'The Velvet Tones', 'Brass & Smoke', ['soul', 'funk'], 1978, 58, 296, false, 800],
  ['Brass & Smoke', 'The Velvet Tones', 'Brass & Smoke', ['funk'], 1979, 61, 278, false, 800],
  ['Pick Up the Groove', 'Kingfisher Funk Collective', 'Riverbooty', ['funk'], 1981, 55, 312, false, 750],
  // Jazz / lo-fi / ambient / classical
  ['Blue Umbrella', 'Cassius Reed Quartet', 'Rain Ledger', ['jazz'], 1994, 46, 342, false, 650],
  ['Rain Ledger', 'Cassius Reed Quartet', 'Rain Ledger', ['jazz'], 1994, 43, 385, false, 650],
  ['Night Shift Noodles', 'Tape Ghost', 'Low Fidelity Diner', ['lo-fi'], 2021, 53, 148, false, 110],
  ['Low Fidelity Diner', 'Tape Ghost', 'Low Fidelity Diner', ['lo-fi'], 2021, 50, 162, false, 110],
  ['Steam Window', 'Tape Ghost', 'Steam Window EP', ['lo-fi'], 2023, 57, 139, false, 15],
  ['Weightless Rooms', 'Aera', 'Still Air', ['ambient'], 2020, 38, 478, false, 200],
  ['Still Air', 'Aera', 'Still Air', ['ambient'], 2020, 35, 512, false, 200],
  ['Cello for Empty Stairwells', 'Helena Voss', 'Marble Hours', ['classical'], 2016, 31, 402, false, 380],
  // Turkish: pop / rock / hip hop / arabesk / folk / anatolian
  ['Boğaz Esintisi', 'Deniz Aksoy', 'Martı Hattı', ['turkish pop'], 2023, 83, 219, false, 20],
  ['Martı Hattı', 'Deniz Aksoy', 'Martı Hattı', ['turkish pop'], 2023, 79, 233, false, 20],
  ['Gece Vardiyası', 'Kara Kedi', 'Asfalt Türküsü', ['turkish rock'], 2019, 65, 257, false, 190],
  ['Asfalt Türküsü', 'Kara Kedi', 'Asfalt Türküsü', ['turkish rock', 'anatolian rock'], 2019, 62, 274, false, 190],
  ['Anadolu Rüzgarı', 'Efe Yalçın', 'Bozkır Elektrik', ['anatolian rock'], 1976, 57, 318, false, 820],
  ['Bozkır Elektrik', 'Efe Yalçın', 'Bozkır Elektrik', ['anatolian rock'], 1976, 54, 335, false, 820],
  ['Mahalle Efsanesi', 'Kont Plak', 'Beton Bahçe', ['turkish hip hop'], 2024, 86, 203, true, 2],
  ['Beton Bahçe', 'Kont Plak', 'Beton Bahçe', ['turkish hip hop'], 2024, 82, 217, false, 2],
  ['Yarım Kalan Mektup', 'Gülizar', 'Hasret Hattı', ['arabesk'], 1991, 66, 289, false, 700],
  ['Hasret Hattı', 'Gülizar', 'Hasret Hattı', ['arabesk'], 1991, 63, 301, false, 700],
  ['Dumanlı Yaylalar', 'Gülizar', 'Dumanlı Yaylalar', ['arabesk'], 1988, 52, 312, false, 760],
  ['Saz ile Söz', 'Dede Korkut Ensemble', 'Kökler', ['turkish folk'], 2005, 34, 356, false, 540],
  ['Kökler', 'Dede Korkut Ensemble', 'Kökler', ['turkish folk'], 2005, 31, 378, false, 540],
  // Acoustic / folk singles
  ['Porch Light', 'Willow Hart', 'Kitchen Songs', ['acoustic', 'folk'], 2017, 45, 228, false, 460],
  ['Kitchen Songs', 'Willow Hart', 'Kitchen Songs', ['folk'], 2017, 42, 245, false, 460],
]

export function buildDemoTracks(): Track[] {
  return SEED.map((row, index) => {
    const [name, artist, album, genres, year, popularity, durationSec, explicit = false, daysAgo = 400] = row
    const id = `demo-${String(index + 1).padStart(3, '0')}`
    const durationMs = durationSec * 1000
    const releaseDate = `${year}-06-15`
    return {
      id,
      uri: `spotify:track:${id}`,
      name,
      artist,
      artistGenres: genres,
      album,
      albumImageUrl: null,
      releaseDate,
      year,
      decade: `${Math.floor(year / 10) * 10}s`,
      previewUrl: null,
      addedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      popularity,
      explicit,
      durationMs,
      audioFeatures: estimateAudioFeatures(
        { id, name, duration_ms: durationMs, popularity, release_date: releaseDate },
        genres
      ),
    }
  })
}
