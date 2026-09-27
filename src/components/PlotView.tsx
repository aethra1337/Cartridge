import { useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import type { Track } from '../lib/types'
import { boxSelectBounds, DRAG_THRESHOLD_PX, pointsInBox } from '../lib/plot/boxSelect'

export type PlotAxis =
  | 'energy'
  | 'danceability'
  | 'valence'
  | 'bpm'
  | 'acousticness'
  | 'popularity'
  | 'loudness'
  | 'liveness'
  | 'speechiness'

/** Subset of the recharts chart-event state we rely on for box select. */
export interface ChartPointer {
  xValue?: number | string
  yValue?: number | string
  chartX?: number
  chartY?: number
}

export default function PlotView({
  tracks,
  onSelect,
  onSelectMany,
}: {
  tracks: Track[]
  onSelect: (id: string) => void
  onSelectMany?: (ids: string[]) => void
}) {
  const [xAxis, setXAxis] = useState<PlotAxis>('danceability')
  const [yAxis, setYAxis] = useState<PlotAxis>('energy')
  const [sizeAxis, setSizeAxis] = useState<PlotAxis>('popularity')
  // Box-select drag state: data-space anchor + pixel-space live rect.
  const dragStartData = useRef<{ x: number; y: number } | null>(null)
  const dragStartPx = useRef<{ x: number; y: number } | null>(null)
  const [dragRect, setDragRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const chartShellRef = useRef<HTMLDivElement | null>(null)

  /** Translate recharts wrapper pixels into shell pixels for the overlay. */
  const toShellPx = (p: ChartPointer): { x: number; y: number } | null => {
    if (typeof p.chartX !== 'number' || typeof p.chartY !== 'number') return null
    const shell = chartShellRef.current?.querySelector('.recharts-wrapper')?.getBoundingClientRect()
    const root = chartShellRef.current?.getBoundingClientRect()
    const dx = (shell?.left ?? 0) - (root?.left ?? 0)
    const dy = (shell?.top ?? 0) - (root?.top ?? 0)
    return { x: p.chartX + dx, y: p.chartY + dy }
  }

  const getMetricValue = (t: Track, axis: PlotAxis): number => {
    switch (axis) {
      case 'energy':
        return Math.round((t.audioFeatures?.energy || 0.5) * 100)
      case 'danceability':
        return Math.round((t.audioFeatures?.danceability || 0.5) * 100)
      case 'valence':
        return Math.round((t.audioFeatures?.valence || 0.5) * 100)
      case 'acousticness':
        return Math.round((t.audioFeatures?.acousticness || 0.2) * 100)
      case 'speechiness':
        return Math.round((t.audioFeatures?.speechiness || 0.05) * 100)
      case 'liveness':
        return Math.round((t.audioFeatures?.liveness || 0.1) * 100)
      case 'loudness':
        return Number((t.audioFeatures?.loudness ?? -14).toFixed(1))
      case 'popularity':
        return t.popularity
      case 'bpm':
        return Math.round(t.audioFeatures?.tempo || 120)
    }
  }

  const axisDomain = (axis: PlotAxis): [number, number] | ['auto', 'auto'] => {
    if (axis === 'bpm') return [50, 210]
    if (axis === 'loudness') return [-60, 0]
    if (axis === 'popularity') return [0, 100]
    return [0, 100]
  }

  const axisOptions = (
    <>
      <option value="danceability">Danceability</option>
      <option value="energy">Energy</option>
      <option value="valence">Valence (Mood)</option>
      <option value="bpm">BPM</option>
      <option value="acousticness">Acousticness</option>
      <option value="speechiness">Speechiness</option>
      <option value="liveness">Liveness</option>
      <option value="loudness">Loudness (dB)</option>
      <option value="popularity">Popularity</option>
    </>
  )

  const data = tracks
    .filter((track) => track.audioFeatures)
    .slice(0, 1200)
    .map((track) => {
      const rawSize = getMetricValue(track, sizeAxis)
      // Loudness is negative (dB): shift to a positive spread so the
      // size scale never gets a degenerate all-constant domain (NaN bubbles).
      const z = sizeAxis === 'loudness' ? Math.max(rawSize + 60, 4) : Math.max(rawSize, 8)
      return {
        x: getMetricValue(track, xAxis),
        y: getMetricValue(track, yAxis),
        z,
        id: track.id,
        name: track.name,
        artist: track.artist,
        bpm: Math.round(track.audioFeatures?.tempo || 0),
        energy: Math.round((track.audioFeatures?.energy || 0) * 100),
        valence: Math.round((track.audioFeatures?.valence || 0) * 100),
      }
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))

  return (
    <section className="plot-view">
      <div className="plot-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="kicker">Interactive audio matrix</p>
          <h2>
            {xAxis.toUpperCase()} vs {yAxis.toUpperCase()} · Size: {sizeAxis.toUpperCase()}
          </h2>
          <p>Bubble size reflects {sizeAxis}. Click any point to add to staging, drag a box to stage many at once.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
            X axis:
            <select value={xAxis} onChange={(e) => setXAxis(e.target.value as PlotAxis)}>
              {axisOptions}
            </select>
          </label>

          <label style={{ fontSize: 11, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
            Y axis:
            <select value={yAxis} onChange={(e) => setYAxis(e.target.value as PlotAxis)}>
              {axisOptions}
            </select>
          </label>

          <label style={{ fontSize: 11, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 6 }}>
            Size:
            <select value={sizeAxis} onChange={(e) => setSizeAxis(e.target.value as PlotAxis)}>
              {axisOptions}
            </select>
          </label>
        </div>
      </div>

      <div className="plot-actions">
        <button
          className="button button-light"
          onClick={() => onSelectMany?.(data.slice(0, 100).map((d) => d.id))}
          disabled={!data.length}
        >
          <Check size={13} /> Add first {Math.min(100, data.length)} plotted to staging
        </button>
        <span className="plot-hint">Showing {data.length.toLocaleString()} points · X / Y / Size</span>
      </div>

      <div className="chart-shell" style={{ marginTop: 20 }}>
        <div ref={chartShellRef} style={{ position: 'relative', cursor: 'crosshair' }}>
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart
            margin={{ top: 18, right: 22, bottom: 30, left: 0 }}
            onMouseDown={(s) => {
              const p = s as unknown as ChartPointer
              if (typeof p.xValue === 'number' && typeof p.yValue === 'number') {
                dragStartData.current = { x: p.xValue, y: p.yValue }
                dragStartPx.current = toShellPx(p)
              }
            }}
            onMouseMove={(s) => {
              if (!dragStartData.current || !dragStartPx.current) return
              const px = toShellPx(s as unknown as ChartPointer)
              if (!px) return
              const anchor = dragStartPx.current
              setDragRect({ x0: anchor.x, y0: anchor.y, x1: px.x, y1: px.y })
            }}
            onMouseUp={(s) => {
              const start = dragStartData.current
              dragStartData.current = null
              dragStartPx.current = null
              const rect = dragRect
              setDragRect(null)
              if (!start || !rect) return
              if (Math.abs(rect.x1 - rect.x0) < DRAG_THRESHOLD_PX && Math.abs(rect.y1 - rect.y0) < DRAG_THRESHOLD_PX) {
                return // plain click — the Scatter onClick handles it
              }
              const p = s as unknown as ChartPointer
              if (typeof p.xValue !== 'number' || typeof p.yValue !== 'number') return
              const box = boxSelectBounds(start, { x: p.xValue, y: p.yValue })
              const ids = pointsInBox(data, box).map((d) => d.id)
              if (ids.length) onSelectMany?.(ids)
            }}
            onMouseLeave={() => {
              dragStartData.current = null
              dragStartPx.current = null
              setDragRect(null)
            }}
          >
            <CartesianGrid stroke="#2b2119" />
            <XAxis
              type="number"
              dataKey="x"
              name={xAxis}
              domain={axisDomain(xAxis)}
              tick={{ fontSize: 11, fill: '#b0a491' }}
              label={{ value: `${xAxis.toUpperCase()}${xAxis === 'loudness' ? ' dB' : xAxis === 'bpm' ? '' : ' %'}`, position: 'bottom', offset: 15, style: { fill: '#7d6f61', fontSize: 11 } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yAxis}
              domain={axisDomain(yAxis)}
              tick={{ fontSize: 11, fill: '#b0a491' }}
              label={{ value: `${yAxis.toUpperCase()}${yAxis === 'loudness' ? ' dB' : yAxis === 'bpm' ? '' : ' %'}`, angle: -90, position: 'left', offset: 10, style: { fill: '#7d6f61', fontSize: 11 } }}
            />
            <ZAxis type="number" dataKey="z" range={[30, 220]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as { name: string; artist: string; bpm: number; energy: number; valence: number }
                  return (
                    <div style={{ background: '#100c09', color: '#ffffff', padding: '8px 12px', borderRadius: 6, fontSize: 12, border: '1px solid #2b2119' }}>
                      <strong>{p.name}</strong>
                      <div style={{ color: '#b0a491' }}>{p.artist}</div>
                      <div style={{ color: '#fb7c1f', marginTop: 4 }}>
                        {p.bpm} BPM · Energy {p.energy}% · Mood (Valence) {p.valence}%
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Scatter
              name="Tracks"
              data={data}
              fill="#fb7c1f"
              onClick={(point) => {
                const p = point as unknown as { payload?: { id?: string }; id?: string }
                const id = p.payload?.id ?? p.id
                if (id) onSelect(id)
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
        {dragRect && Math.abs(dragRect.x1 - dragRect.x0) + Math.abs(dragRect.y1 - dragRect.y0) > DRAG_THRESHOLD_PX && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(dragRect.x0, dragRect.x1),
              top: Math.min(dragRect.y0, dragRect.y1),
              width: Math.abs(dragRect.x1 - dragRect.x0),
              height: Math.abs(dragRect.y1 - dragRect.y0),
              border: '1px solid #fb7c1f',
              background: 'rgba(251, 124, 31, 0.12)',
              pointerEvents: 'none',
            }}
          />
        )}
        </div>
      </div>
    </section>
  )
}
