import { useEffect, useMemo, useState } from 'react'
import { Music2, RefreshCw, X } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { getTracksAddedSince, type NewTrackInfo } from '../../lib/spotify/api'
import { diffRemoved, loadSnapshot } from '../../lib/studio/librarySnapshot'

type State =
  | { status: 'loading' }
  | { status: 'ready'; tracks: NewTrackInfo[]; hasMore: boolean }
  | { status: 'error'; message: string }

export default function WhatsNewModal({
  sinceIso,
  currentIds,
  onSync,
  onClose,
}: {
  sinceIso: string
  currentIds: string[]
  onSync: () => void
  onClose: () => void
}) {
  const t = useT()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [tab, setTab] = useState<'added' | 'removed'>('added')
  const removed = useMemo(
    () => diffRemoved(loadSnapshot(), new Set(currentIds)),
    // snapshot is read once per open; currentIds is stable for the modal lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    let cancelled = false
    getTracksAddedSince(sinceIso, 50)
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', ...result })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not check for new tracks.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [sinceIso])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('whatsNewTitle')}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <nav className="tabs" style={{ marginBottom: 12 }}>
            <button className={`tab ${tab === 'added' ? 'active' : ''}`} onClick={() => setTab('added')}>
              {t('addedTab')}
            </button>
            <button className={`tab ${tab === 'removed' ? 'active' : ''}`} onClick={() => setTab('removed')}>
              {t('removedTab')} ({removed.length})
            </button>
          </nav>
          {tab === 'removed' ? (
            removed.length === 0 ? (
              <div className="empty">
                <Music2 size={32} />
                <strong>{t('whatsNewEmpty')}</strong>
              </div>
            ) : (
              <ul className="compare-list">
                {removed.map((tr) => (
                  <li key={tr.id}>{tr.label}</li>
                ))}
              </ul>
            )
          ) : (
            <>
          {state.status === 'loading' && (
            <div className="empty">
              <strong>{t('whatsNewLoading')}</strong>
            </div>
          )}
          {state.status === 'error' && (
            <div className="empty">
              <Music2 size={32} />
              <strong>{state.message}</strong>
            </div>
          )}
          {state.status === 'ready' && state.tracks.length === 0 && (
            <div className="empty">
              <Music2 size={32} />
              <strong>{t('whatsNewEmpty')}</strong>
              <span>{t('whatsNewEmptySub')}</span>
            </div>
          )}
          {state.status === 'ready' && state.tracks.length > 0 && (
            <>
              <p className="kicker">
                {state.tracks.length}
                {state.hasMore ? '+' : ''} {t('whatsNewSince')}
              </p>
              <ul className="compare-list">
                {state.tracks.map((tr) => (
                  <li key={tr.id}>
                    {tr.name} — {tr.artist}
                  </li>
                ))}
              </ul>
            </>
          )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="text-button" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="button button-accent" onClick={onSync}>
            <RefreshCw size={14} /> {t('whatsNewSync')}
          </button>
        </div>
      </div>
    </div>
  )
}
