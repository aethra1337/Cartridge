import { useEffect, useState } from 'react'
import { History, Music2, X } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { getSyncHistory } from '../../lib/cache/hydration'
import type { SyncHistoryRecord } from '../../lib/cache/database'

export default function SyncHistoryModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [rows, setRows] = useState<SyncHistoryRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getSyncHistory().then((list) => {
      if (!cancelled) setRows(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <History size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t('syncHistory')}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {rows === null && (
            <div className="empty">
              <strong>{t('whatsNewLoading')}</strong>
            </div>
          )}
          {rows !== null && rows.length === 0 && (
            <div className="empty">
              <Music2 size={32} />
              <strong>{t('historyEmpty')}</strong>
              <span>{t('historyEmptySub')}</span>
            </div>
          )}
          {rows !== null && rows.length > 0 && (
            <ul className="compare-list">
              {rows.map((row) => (
                <li key={row.id ?? `${row.at}-${row.label}`}>
                  <strong>{row.label}</strong>
                  <span>
                    {' '}
                    · {row.trackCount.toLocaleString()} tracks ·{' '}
                    {new Date(row.at).toLocaleString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {row.durationMs > 0 && <> · {Math.round(row.durationMs / 1000)}s</>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer">
          <button className="text-button" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
