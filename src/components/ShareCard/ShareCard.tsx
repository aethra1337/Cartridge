import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, X } from 'lucide-react'
import { useT } from '../../lib/i18n'
import type { Track } from '../../lib/types'
import './ShareCard.css'

export function buildShareText(
  trackCount: number,
  artistCount: number,
  topGenres: string[],
  topArtist: { name: string; count: number } | null,
  fav: Track | null,
  sourceLabel?: string
): string {
  const lines = [
    `My music taste, organized by Cartridge:`,
    `${trackCount.toLocaleString()} tracks · ${artistCount.toLocaleString()} artists${sourceLabel ? ` (${sourceLabel})` : ''}`,
    topGenres.length ? `Top genres: ${topGenres.join(', ')}` : '',
    topArtist ? `Most tracks: ${topArtist.name} (${topArtist.count} tracks)` : '',
    fav ? `Most popular: ${fav.name} — ${fav.artist} (${fav.popularity}/100)` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

export default function ShareCardModal({
  tracks,
  sourceLabel,
  liveCount,
  onClose,
}: {
  tracks: Track[]
  sourceLabel?: string
  liveCount?: number | null
  onClose: () => void
}) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  const data = useMemo(() => {
    const genreCount = new Map<string, number>()
    tracks.forEach((t) => t.artistGenres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1)))
    const topGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g)
    // First-artist names only ("A, B" counts for A) — same basis for top + total.
    const firstNames = tracks.map((t) => t.artist.split(',')[0]?.trim() || t.artist)
    const artistCount = new Map<string, number>()
    firstNames.forEach((n) => artistCount.set(n, (artistCount.get(n) || 0) + 1))
    const [topName, topN] = [...artistCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
    const topArtist = topName ? { name: topName, count: topN } : null
    const fav = [...tracks].sort((a, b) => b.popularity - a.popularity)[0] ?? null
    const topPopular = [...tracks].sort((a, b) => b.popularity - a.popularity).slice(0, 5)
    const artists = new Set(firstNames).size
    return { topGenres, topArtist, fav, topPopular, artists }
  }, [tracks])

  const text = buildShareText(tracks.length, data.artists, data.topGenres, data.topArtist, data.fav, sourceLabel)
  const stale = liveCount != null && liveCount !== tracks.length

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable
    }
  }

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 1080
    const H = 1350
    canvas.width = W
    canvas.height = H
    // bg
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    // accent bar
    ctx.fillStyle = '#fb7c1f'
    ctx.fillRect(0, 0, W, 14)
    ctx.fillRect(0, H - 14, W, 14)
    // glow blobs
    const blob = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, c)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    blob(W * 0.85, H * 0.12, 320, 'rgba(251,124,31,0.35)')
    blob(W * 0.12, H * 0.85, 360, 'rgba(140,12,12,0.45)')
    // text
    ctx.fillStyle = '#97816e'
    ctx.font = '600 34px Inter, sans-serif'
    ctx.fillText('C A R T R I D G E', 90, 150)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 84px "Space Grotesk", Inter, sans-serif'
    const wrap = (s: string, y: number) => {
      ctx.fillText(s, 90, y)
    }
    wrap('My music,', 300)
    wrap('in order.', 400)
    ctx.fillStyle = '#fb7c1f'
    ctx.font = '700 120px "Space Grotesk", Inter, sans-serif'
    ctx.fillText(tracks.length.toLocaleString(), 90, 600)
    ctx.fillStyle = '#b0a491'
    ctx.font = '500 40px Inter, sans-serif'
    ctx.fillText(`tracks · ${data.artists.toLocaleString()} artists`, 90, 660)
    let y = 800
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 44px Inter, sans-serif'
    data.topGenres.slice(0, 3).forEach((g, i) => {
      ctx.fillStyle = '#fb7c1f'
      ctx.fillText(`${i + 1}.`, 90, y)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(g, 170, y)
      y += 80
    })
    y += 40
    ctx.fillStyle = '#b0a491'
    ctx.font = '500 38px Inter, sans-serif'
    if (data.topArtist) {
      ctx.fillText(`Most tracks: ${data.topArtist.name} (${data.topArtist.count})`.slice(0, 42), 90, y)
      y += 70
    }
    if (data.fav) {
      ctx.fillText(`Most popular: ${(data.fav.name + ' — ' + data.fav.artist).slice(0, 38)}`, 90, y)
      y += 70
    }
    ctx.fillStyle = '#97816e'
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillText(`Source: ${(sourceLabel ?? 'local cache').slice(0, 40)}`, 90, y)
    ctx.fillStyle = '#97816e'
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillText('Organized with Cartridge', 90, H - 70)
    const a = document.createElement('a')
    a.download = 'cartridge-taste.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('shareTaste')}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="share-preview">
            <p className="kicker">CARTRIDGE · MY MUSIC IN ORDER</p>
            <p className="share-big">
              {tracks.length.toLocaleString()} <span>tracks</span>
            </p>
            <p className="share-mid">{data.artists.toLocaleString()} artists</p>
            <ol>
              {data.topGenres.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
            {data.topArtist && (
              <p className="share-line">
                Most tracks: {data.topArtist.name} ({data.topArtist.count} tracks)
              </p>
            )}
            {data.topPopular.length > 0 && (
              <ol className="share-top">
                {data.topPopular.map((t) => (
                  <li key={t.id}>
                    {t.name} — {t.artist} <span>({t.popularity})</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="share-source">
              Source: {sourceLabel ?? 'local cache'} · {tracks.length.toLocaleString()} tracks
              {stale && ' · outdated, sync first'}
            </p>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <div className="modal-footer">
          <button className="button button-light" onClick={copyText}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('copied') : t('copyText')}
          </button>
          <button className="button button-accent" onClick={downloadPng}>
            <Download size={14} /> {t('downloadPng')}
          </button>
        </div>
      </div>
    </div>
  )
}
