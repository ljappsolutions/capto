import { useCallback, useEffect, useState } from 'react'
import { formatBytes, formatDuration } from '@shared/format'
import type { RecordingMetadata } from '@shared/types'
import { SharePanel } from '../components/SharePanel'
import { useCredentialsReady } from '../hooks/useCredentialsReady'
import { useSettings } from '../hooks/useSettings'
import '../styles/complete.css'

export function CompleteScreen() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id') ?? ''
  const [meta, setMeta] = useState<RecordingMetadata | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const { settings } = useSettings()
  const credentialsReady = useCredentialsReady(settings?.sharing.provider ?? null)

  const reloadMeta = useCallback(async () => {
    const items = await window.recorderAPI.listRecordings()
    const found = items.find((item) => item.metadata.id === id)?.metadata
    if (found) setMeta(found)
  }, [id])

  useEffect(() => {
    async function load(): Promise<void> {
      if (!id) {
        setError('Missing recording id')
        return
      }
      const items = await window.recorderAPI.listRecordings()
      const found = items.find((item) => item.metadata.id === id)?.metadata
      if (!found) {
        setError('Recording not found')
        return
      }
      setMeta(found)
      setName(found.filename.replace(/\.(webm|mp4)$/i, ''))
      const fileUrl = await window.recorderAPI.getRecordingFileUrl(id)
      setUrl(fileUrl)
    }
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load recording')
    })
  }, [id])

  async function onRename(): Promise<void> {
    if (!meta) return
    const next = await window.recorderAPI.renameRecording({
      id: meta.id,
      newBasename: name
    })
    setMeta(next)
    setRenaming(false)
  }

  async function onDelete(): Promise<void> {
    if (!meta) return
    await window.recorderAPI.deleteRecording(meta.id)
    await window.recorderAPI.hideWindow('complete')
  }

  return (
    <div className="app-shell complete">
      <header>
        <h1>Recording Complete</h1>
        <p className="muted">Saved locally on this Mac. Share it from your own cloud below.</p>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {meta ? (
        <>
          <div className="complete__preview panel">
            {url ? <video src={url} controls playsInline /> : <p className="muted">Loading preview…</p>}
          </div>

          <div className="complete__meta panel">
            {renaming ? (
              <div className="row">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Filename"
                />
                <button type="button" className="btn btn-primary" onClick={() => void onRename()}>
                  Save
                </button>
                <button type="button" className="btn" onClick={() => setRenaming(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <h2>{meta.filename}</h2>
            )}
            <p className="muted">
              {formatDuration(meta.durationMs)} · {formatBytes(meta.sizeBytes)} ·{' '}
              {meta.captureSourceName}
            </p>
            {meta.width > 0 ? (
              <p className="muted">
                {meta.width}×{meta.height} · {meta.fps} fps · {meta.mimeType}
              </p>
            ) : null}
          </div>

          <div className="panel">
            <h3 className="complete__section-title">Share with a link</h3>
            <SharePanel
              meta={meta}
              settings={settings}
              credentialsReady={credentialsReady}
              autoStart={Boolean(settings?.sharing.autoUpload) && !meta.shares?.length}
              onChanged={() => void reloadMeta()}
            />
          </div>

          <footer className="complete__actions">
            <button
              type="button"
              className="btn"
              onClick={() => void window.recorderAPI.revealRecording(meta.id)}
            >
              Reveal in Finder
            </button>
            <button type="button" className="btn" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void onDelete()}>
              Delete
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void window.recorderAPI.hideWindow('complete')}
            >
              Done
            </button>
          </footer>
        </>
      ) : null}
    </div>
  )
}
