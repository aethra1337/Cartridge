import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useT } from '../../lib/i18n'
import type { Track } from '../../lib/types'

function topEntries(counts: Map<string, number>, limit: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function BarBlock({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  return (
    <div className="chart-shell" style={{ marginTop: 20 }}>
      <p className="kicker">{title}</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#2b2119" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#b0a491' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: '#b0a491' }}
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
          />
          <Tooltip
            contentStyle={{
              background: '#100c09',
              color: '#ffffff',
              border: '1px solid #2b2119',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="#fb7c1f" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function StatsView({ tracks }: { tracks: Track[] }) {
  const t = useT()

  const stats = useMemo(() => {
    if (!tracks.length) return null

    const artistCount = new Map<string, number>()
    tracks.forEach((tr) => {
      const first = tr.artist.split(',')[0]?.trim() || tr.artist
      artistCount.set(first, (artistCount.get(first) || 0) + 1)
    })

    const genreCount = new Map<string, number>()
    tracks.forEach((tr) => {
      tr.artistGenres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1))
    })

    const decadeCount = new Map<string, number>()
    tracks.forEach((tr) => {
      if (tr.decade) decadeCount.set(tr.decade, (decadeCount.get(tr.decade) || 0) + 1)
    })
    const decades = [...decadeCount.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([name, count]) => ({ name, count }))

    const withFeatures = tracks.filter((tr) => tr.audioFeatures)
    const avg = (pick: (tr: Track) => number) =>
      withFeatures.length ? withFeatures.reduce((s, tr) => s + pick(tr), 0) / withFeatures.length : null
    const avgBpm = avg((tr) => tr.audioFeatures?.tempo ?? 120)
    const avgEnergy = avg((tr) => (tr.audioFeatures?.energy ?? 0.5) * 100)
    const avgDance = avg((tr) => (tr.audioFeatures?.danceability ?? 0.5) * 100)
    const avgValence = avg((tr) => (tr.audioFeatures?.valence ?? 0.5) * 100)
    const minutes = Math.round(tracks.reduce((s, tr) => s + (tr.durationMs || 0), 0) / 60000)

    return {
      artists: artistCount.size,
      minutes,
      avgBpm: avgBpm !== null ? Math.round(avgBpm) : null,
      avgEnergy: avgEnergy !== null ? Math.round(avgEnergy) : null,
      avgDance: avgDance !== null ? Math.round(avgDance) : null,
      avgValence: avgValence !== null ? Math.round(avgValence) : null,
      topArtists: topEntries(artistCount, 10),
      topGenres: topEntries(genreCount, 10),
      decades,
    }
  }, [tracks])

  if (!stats) {
    return (
      <div className="empty">
        <strong>{t('statsEmpty')}</strong>
        <span>{t('statsEmptySub')}</span>
      </div>
    )
  }

  return (
    <section className="stats-view">
      <div className="insights">
        <div>
          <span>{t('tracks').toUpperCase()}</span>
          <strong>{tracks.length.toLocaleString()}</strong>
        </div>
        <div>
          <span>{t('statsArtistsWord').toUpperCase()}</span>
          <strong>{stats.artists.toLocaleString()}</strong>
        </div>
        <div>
          <span>{t('statsMinutesWord').toUpperCase()}</span>
          <strong>{stats.minutes.toLocaleString()}</strong>
        </div>
        <div>
          <span>{t('statsAvgBpm').toUpperCase()}</span>
          <strong>{stats.avgBpm !== null ? `${stats.avgBpm} BPM` : '—'}</strong>
        </div>
        <div>
          <span>{t('statsAvgEnergy').toUpperCase()}</span>
          <strong>{stats.avgEnergy !== null ? `${stats.avgEnergy}%` : '—'}</strong>
        </div>
        <div>
          <span>{t('statsAvgDance').toUpperCase()}</span>
          <strong>{stats.avgDance !== null ? `${stats.avgDance}%` : '—'}</strong>
        </div>
        <div>
          <span>{t('statsAvgValence').toUpperCase()}</span>
          <strong>{stats.avgValence !== null ? `${stats.avgValence}%` : '—'}</strong>
        </div>
      </div>

      <BarBlock title={t('statsArtists')} data={stats.topArtists} />
      {stats.topGenres.length > 0 && <BarBlock title={t('statsGenres')} data={stats.topGenres} />}
      {stats.decades.length > 0 && <BarBlock title={t('statsDecades')} data={stats.decades} />}
    </section>
  )
}
