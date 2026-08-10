import { useCallback, useEffect, useState } from 'react'
import { formatBytes, formatDuration } from '@shared/format'
import type { RecordingListItem } from '@shared/types'
import '../styles/recordings.css'

export function RecordingsScreen() {
  const [items, setItems] = useState<RecordingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await window.recorderAPI.listRecordings()
      setItems(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list recordings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="app-shell recordings">
      <header className="recordings__header">
        <div>
          <h1>Recent Recordings</h1>
          <p className="muted">Local MP4 files stored on this Mac.</p>
        </div>
        <button type="button" className="btn" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="muted">No recordings yet. Create one with ⌘⇧R.</p>
      ) : null}

      <div className="recordings__list">
        {items.map(({ metadata }) => (
          <article key={metadata.id} className="recording-item panel">
            <div>
              <h2>
                {metadata.filename}
                {metadata.recovered ? <span className="badge">Recovered</span> : null}
              </h2>
              <p className="muted">
                {new Date(metadata.createdAt).toLocaleString()} ·{' '}
                {formatDuration(metadata.durationMs)} · {formatBytes(metadata.sizeBytes)}
              </p>
              <p className="muted">{metadata.captureSourceName}</p>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => void window.recorderAPI.revealRecording(metadata.id)}
              >
                Reveal in Finder
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void window.recorderAPI.showWindow('complete', { id: metadata.id })
                }
              >
                Open
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() =>
                  void window.recorderAPI.deleteRecording(metadata.id).then(() => refresh())
                }
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
