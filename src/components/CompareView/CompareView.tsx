import { useMemo, useState } from 'react'
import { useT } from '../../lib/i18n'
import type { OYMBin, OYMCategory } from '../../lib/oym/bins'
import type { Track } from '../../lib/types'

function avg(tracks: Track[], pick: (t: Track) => number): number | null {
  if (!tracks.length) return null
  return tracks.reduce((s, t) => s + pick(t), 0) / tracks.length
}

export default function CompareView({
  bins,
  tracks,
  onStage,
}: {
  bins: Record<OYMCategory, OYMBin[]>
  tracks: Track[]
  onStage: (ids: string[]) => void
}) {
  const allBins = useMemo(() => {
    const cats = Object.keys(bins) as OYMCategory[]
    return cats.flatMap((c) => bins[c])
  }, [bins])
  const t = useT()
  const [binAId, setBinAId] = useState<string>('')
  const [binBId, setBinBId] = useState<string>('')

  const binA = allBins.find((b) => b.id === (binAId || allBins[0]?.id)) ?? null
  const binB = allBins.find((b) => b.id === (binBId || allBins[1]?.id)) ?? null

  const stats = useMemo(() => {
    if (!binA || !binB) return null
    const byId = new Map(tracks.map((t) => [t.id, t]))
    const a = binA.trackIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t))
    const b = binB.trackIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t))
    const setA = new Set(a.map((t) => t.id))
    const setB = new Set(b.map((t) => t.id))
    const common = b.filter((t) => setA.has(t.id))
    const onlyA = a.filter((t) => !setB.has(t.id))
    const onlyB = b.filter((t) => !setA.has(t.id))
    return { a, b, common, onlyA, onlyB }
  }, [binA, binB, tracks])

  if (!allBins.length) {
    return (
      <div className="empty">
        <strong>{t('compareNothing')}</strong>
        <span>{t('compareNothingSub')}</span>
      </div>
    )
  }

  const bpmA = stats ? avg(stats.a, (t) => t.audioFeatures?.tempo ?? 120) : null
  const bpmB = stats ? avg(stats.b, (t) => t.audioFeatures?.tempo ?? 120) : null
  const nrgA = stats ? avg(stats.a, (t) => (t.audioFeatures?.energy ?? 0.5) * 100) : null
  const nrgB = stats ? avg(stats.b, (t) => (t.audioFeatures?.energy ?? 0.5) * 100) : null

  const picker = (value: string, set: (v: string) => void, label: string) => (
    <label className="compare-pick">
      {label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        {!value && <option value="">{t('pickBin')}</option>}
        {allBins.map((b) => (
          <option key={b.id} value={b.id}>
            {b.categoryLabel}: {b.label} ({b.trackCount})
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <section className="compare">
      <div className="compare-picks">
        {picker(binAId, setBinAId, 'BIN A')}
        <span className="compare-vs">vs</span>
        {picker(binBId, setBinBId, 'BIN B')}
      </div>

      {stats && binA && binB && (
        <>
          <div className="compare-cards">
            <div className="compare-card">
              <strong>{binA.label}</strong>
              <span>{stats.a.length.toLocaleString()} tracks</span>
              <span>{bpmA !== null ? `${Math.round(bpmA)} BPM avg` : ''}</span>
              <span>{nrgA !== null ? `${Math.round(nrgA)}% energy avg` : ''}</span>
            </div>
            <div className="compare-card overlap">
              <strong>{stats.common.length.toLocaleString()} {t('shared')}</strong>
              <span>
                {stats.a.length ? Math.round((stats.common.length / stats.a.length) * 100) : 0}% of A ·{' '}
                {stats.b.length ? Math.round((stats.common.length / stats.b.length) * 100) : 0}% of B
              </span>
              <span>
                Δ {bpmA !== null && bpmB !== null ? `${Math.abs(Math.round(bpmA - bpmB))} BPM` : '—'} ·{' '}
                {nrgA !== null && nrgB !== null ? `${Math.abs(Math.round(nrgA - nrgB))}% energy` : ''}
              </span>
              {stats.common.length > 0 && (
                <button className="button button-light" onClick={() => onStage(stats.common.map((t) => t.id))}>
                  {t('stageShared')} ({stats.common.length})
                </button>
              )}
            </div>
            <div className="compare-card">
              <strong>{binB.label}</strong>
              <span>{stats.b.length.toLocaleString()} tracks</span>
              <span>{bpmB !== null ? `${Math.round(bpmB)} BPM avg` : ''}</span>
              <span>{nrgB !== null ? `${Math.round(nrgB)}% energy avg` : ''}</span>
            </div>
          </div>

          <div className="compare-cols">
            <div>
              <p className="kicker">{t('onlyIn')} {binA.label.toUpperCase()} ({stats.onlyA.length})</p>
              <ul className="compare-list">
                {stats.onlyA.slice(0, 8).map((t) => (
                  <li key={t.id}>{t.name} — {t.artist}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="kicker">{t('onlyIn')} {binB.label.toUpperCase()} ({stats.onlyB.length})</p>
              <ul className="compare-list">
                {stats.onlyB.slice(0, 8).map((t) => (
                  <li key={t.id}>{t.name} — {t.artist}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
