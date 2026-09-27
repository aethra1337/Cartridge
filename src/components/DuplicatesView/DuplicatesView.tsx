import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { duplicateIdsToStage, findDuplicateGroups } from '../../lib/oym/duplicates'
import type { Track } from '../../lib/types'

const MAX_GROUPS = 60

export default function DuplicatesView({
  tracks,
  onStage,
}: {
  tracks: Track[]
  onStage: (ids: string[]) => void
}) {
  const t = useT()
  const groups = useMemo(() => findDuplicateGroups(tracks), [tracks])
  const extraCopies = groups.reduce((sum, g) => sum + g.tracks.length - 1, 0)

  if (!tracks.length) {
    return (
      <div className="empty">
        <strong>{t('dupEmpty')}</strong>
        <span>{t('dupEmptySub')}</span>
      </div>
    )
  }

  if (!groups.length) {
    return (
      <div className="empty">
        <strong>{t('dupNone')}</strong>
        <span>{t('dupNoneSub')}</span>
      </div>
    )
  }

  return (
    <section className="duplicates">
      <div className="insights">
        <div>
          <span>{t('dupGroupsWord').toUpperCase()}</span>
          <strong>{groups.length.toLocaleString()}</strong>
        </div>
        <div>
          <span>{t('dupCopiesWord').toUpperCase()}</span>
          <strong>{extraCopies.toLocaleString()}</strong>
        </div>
      </div>

      <div className="plot-actions">
        <button className="button button-light" onClick={() => onStage(duplicateIdsToStage(groups))}>
          <Check size={13} /> {t('dupStageAll')} ({extraCopies})
        </button>
        <span className="plot-hint">{t('dupHint')}</span>
      </div>

      <div className="compare-cards">
        {groups.slice(0, MAX_GROUPS).map((g) => (
          <div className="compare-card" key={g.key}>
            <strong>{g.name}</strong>
            <span>
              {g.artist} · {g.tracks.length} {t('dupVersionsWord')}
            </span>
            <ul className="compare-list">
              {g.tracks.slice(0, 5).map((tr) => (
                <li key={tr.id}>
                  {tr.name} — {tr.album} ({tr.year ?? '—'})
                </li>
              ))}
            </ul>
            <button
              className="button button-light"
              onClick={() => onStage(g.tracks.slice(1).map((tr) => tr.id))}
            >
              {t('dupStageGroup')} ({g.tracks.length - 1})
            </button>
          </div>
        ))}
      </div>

      {groups.length > MAX_GROUPS && (
        <div className="truncated-notice">
          Showing the first {MAX_GROUPS} duplicate groups.
        </div>
      )}
    </section>
  )
}
