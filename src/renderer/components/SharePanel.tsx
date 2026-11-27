import { useEffect, useRef, useState } from 'react'
import { expiryOptionsFor, formatExpiry, validateSharingConfig } from '@shared/sharing'
import type { AppSettingsView, RecordingMetadata } from '@shared/types'
import { useShare } from '../hooks/useShare'

interface Props {
  meta: RecordingMetadata
  settings: AppSettingsView | null
  /** Credentials configured for the active provider. */
  credentialsReady: boolean
  compact?: boolean
  /** Start uploading as soon as the panel mounts (auto-upload setting). */
  autoStart?: boolean
  onChanged?: () => void
}

export function SharePanel({
  meta,
  settings,
  credentialsReady,
  compact = false,
  autoStart = false,
  onChanged
}: Props) {
  const share = useShare(meta, onChanged)
  const provider = settings?.sharing.provider ?? null
  const options = expiryOptionsFor(provider)
  const [expiry, setExpiry] = useState<number>(settings?.sharing.defaultExpirySec ?? 7 * 86400)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const autoStarted = useRef(false)

  useEffect(() => {
    if (settings) setExpiry(settings.sharing.defaultExpirySec)
  }, [settings])

  const configProblem = settings ? validateSharingConfig(settings.sharing) : 'Loading…'
  const ready = !configProblem && credentialsReady
  const uploading =
    share.progress !== null &&
    (share.progress.phase === 'preparing' ||
      share.progress.phase === 'uploading' ||
      share.progress.phase === 'signing') &&
    share.busy

  useEffect(() => {
    if (autoStart && ready && !share.share && !autoStarted.current) {
      autoStarted.current = true
      void share.upload(expiry)
    }
  }, [autoStart, ready, share, expiry])

  if (!ready) {
    return (
      <div className={`share-panel${compact ? ' share-panel--compact' : ''}`}>
        <p className="muted">
          {configProblem ?? 'Add your storage credentials'} to share links from your own cloud.
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => void window.recorderAPI.showWindow('settings', { tab: 'sharing' })}
        >
          Set up sharing
        </button>
      </div>
    )
  }

  const active = share.share && Date.parse(share.share.expiresAt) > Date.now()

  return (
    <div className={`share-panel${compact ? ' share-panel--compact' : ''}`}>
      <div className="share-panel__row">
        <select
          aria-label="Link expires after"
          value={expiry}
          disabled={share.busy}
          onChange={(e) => setExpiry(Number(e.target.value))}
        >
          {options.map((o) => (
            <option key={o.seconds} value={o.seconds}>
              Link valid {o.label}
            </option>
          ))}
        </select>

        {uploading ? (
          <button type="button" className="btn" onClick={share.cancel}>
            Cancel
          </button>
        ) : !share.share ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={share.busy}
            onClick={() => void share.upload(expiry)}
          >
            Upload &amp; copy link
          </button>
        ) : (
          <>
            {active ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={share.busy}
                onClick={() => void share.copy()}
              >
                Copy link
              </button>
            ) : null}
            <button
              type="button"
              className={active ? 'btn' : 'btn btn-primary'}
              disabled={share.busy}
              onClick={() => void share.regenerate(expiry)}
              title="Create a fresh link with the selected expiry (no re-upload)"
            >
              {active ? 'New link' : 'Renew link'}
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={share.busy}
                  onClick={() => {
                    setConfirmDelete(false)
                    void share.removeRemote()
                  }}
                >
                  Confirm delete
                </button>
                <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={share.busy}
                onClick={() => setConfirmDelete(true)}
                title="Delete the uploaded copy. Existing links stop working."
              >
                Delete from cloud
              </button>
            )}
          </>
        )}
      </div>

      {uploading && share.progress ? (
        <div className="share-panel__progress" role="status">
          <div className="progress">
            <div
              className="progress__bar"
              style={{ width: `${Math.round(share.progress.progress * 100)}%` }}
            />
          </div>
          <span className="muted">
            {share.progress.message} {Math.round(share.progress.progress * 100)}%
          </span>
        </div>
      ) : null}

      {share.share && !uploading ? (
        <p className={active ? 'share-panel__status' : 'share-panel__status share-panel__status--expired'}>
          {active ? '● Shared' : '○ Link expired'} · {formatExpiry(share.share.expiresAt)}
          {confirmDelete ? ' · Deleting makes every link for this recording stop working.' : ''}
        </p>
      ) : null}
      {share.notice ? <p className="share-panel__notice">{share.notice}</p> : null}
      {share.error ? <p className="error-text">{share.error}</p> : null}
    </div>
  )
}
