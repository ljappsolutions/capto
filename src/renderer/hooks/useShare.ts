import { useCallback, useEffect, useState } from 'react'
import { latestShare } from '@shared/sharing'
import type { RecordingMetadata, ShareRecord, UploadProgressEvent } from '@shared/types'

export interface ShareState {
  progress: UploadProgressEvent | null
  share: ShareRecord | null
  busy: boolean
  error: string | null
  notice: string | null
  upload: (expiresInSec?: number) => Promise<void>
  cancel: () => void
  regenerate: (expiresInSec?: number) => Promise<void>
  copy: () => Promise<void>
  removeRemote: () => Promise<void>
}

/**
 * Share actions + live upload progress for one recording.
 * `onChanged` lets the parent refresh metadata after share records change.
 */
export function useShare(
  meta: RecordingMetadata | null,
  onChanged?: () => void
): ShareState {
  const id = meta?.id ?? ''
  const [progress, setProgress] = useState<UploadProgressEvent | null>(null)
  const [share, setShare] = useState<ShareRecord | null>(latestShare(meta?.shares))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setShare(latestShare(meta?.shares))
  }, [meta])

  useEffect(() => {
    if (!id) return
    return window.recorderAPI.onUploadProgress((event) => {
      if (event.recordingId !== id) return
      setProgress(event)
      if (event.phase === 'done' && event.share) setShare(event.share)
    })
  }, [id])

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true)
      setError(null)
      setNotice(null)
      try {
        await fn()
        onChanged?.()
      } catch (err) {
        setError(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : 'Something went wrong')
      } finally {
        setBusy(false)
      }
    },
    [onChanged]
  )

  const upload = useCallback(
    (expiresInSec?: number) =>
      run(async () => {
        const next = await window.recorderAPI.shareRecording({ recordingId: id, expiresInSec })
        setShare(next)
        setNotice('Link copied to clipboard')
      }),
    [id, run]
  )

  const regenerate = useCallback(
    (expiresInSec?: number) =>
      run(async () => {
        const next = await window.recorderAPI.regenerateShareLink(id, expiresInSec)
        setShare(next)
        setNotice('New link copied to clipboard')
      }),
    [id, run]
  )

  const copy = useCallback(
    () =>
      run(async () => {
        await window.recorderAPI.copyShareLink(id)
        setNotice('Link copied to clipboard')
      }),
    [id, run]
  )

  const removeRemote = useCallback(
    () =>
      run(async () => {
        await window.recorderAPI.deleteRemoteCopies(id)
        setShare(null)
        setProgress(null)
        setNotice('Deleted from cloud. Old links no longer work.')
      }),
    [id, run]
  )

  const cancel = useCallback(() => {
    void window.recorderAPI.cancelShare(id)
  }, [id])

  return { progress, share, busy, error, notice, upload, cancel, regenerate, copy, removeRemote }
}
