import { clipboard } from 'electron'
import { existsSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FINAL_MIME_TYPE, POSTER_FILENAME } from '@shared/constants'
import { buildViewerUrl } from '@shared/shareLink'
import {
  buildObjectKey,
  clampExpiry,
  latestShare,
  normalizePrefix
} from '@shared/sharing'
import type {
  ShareRecord,
  ShareRequest,
  SharingSettings,
  StorageProviderId,
  StorageTestResult,
  UploadProgressEvent
} from '@shared/types'
import { getCredentials } from './credentials'
import { log } from './logger'
import { getRecordingMetadata, updateRecordingMetadata } from './recordings'
import { loadSettings } from './settings'
import { createStorageProvider, describeStorageError, type StorageProvider } from './storage'
import { extractPosterFrame } from './transcode'

type ProgressEmitter = (event: UploadProgressEvent) => void

const activeUploads = new Map<string, AbortController>()

/** Settings copy whose bucket/container for `provider` is `location`. */
function withLocation(
  sharing: SharingSettings,
  provider: StorageProviderId,
  location: string
): SharingSettings {
  const s = structuredClone(sharing)
  s.provider = provider
  if (provider === 'aws-s3') s.aws.bucket = location
  if (provider === 's3-compatible') s.s3Compatible.bucket = location
  if (provider === 'azure-blob') s.azure.container = location
  if (provider === 'gcs') s.gcs.bucket = location
  return s
}

function currentProvider(sharing = loadSettings().sharing): StorageProvider {
  return createStorageProvider(
    sharing,
    sharing.provider ? getCredentials(sharing.provider) : null
  )
}

function providerForShare(share: ShareRecord): StorageProvider {
  const sharing = withLocation(loadSettings().sharing, share.provider, share.location)
  return createStorageProvider(sharing, getCredentials(share.provider))
}

function preferredLink(share: ShareRecord, sharing: SharingSettings): string {
  return sharing.linkFormat === 'viewer' && share.viewerUrl ? share.viewerUrl : share.signedUrl
}

async function signShare(
  provider: StorageProvider,
  share: Omit<ShareRecord, 'signedUrl' | 'posterUrl' | 'viewerUrl' | 'createdAt' | 'expiresAt'>,
  expiresInSec: number,
  title: string,
  durationMs: number
): Promise<ShareRecord> {
  const sharing = loadSettings().sharing
  const seconds = clampExpiry(provider.id, expiresInSec)
  const signedUrl = await provider.createSignedUrl(share.objectKey, seconds)
  const posterUrl = share.posterKey
    ? await provider.createSignedUrl(share.posterKey, seconds).catch(() => undefined)
    : undefined
  const now = Date.now()
  const expiresAt = new Date(now + seconds * 1000).toISOString()
  const viewerUrl = buildViewerUrl(sharing.viewerBaseUrl, {
    v: 1,
    u: signedUrl,
    p: posterUrl,
    t: title,
    e: expiresAt,
    d: durationMs
  })
  return {
    ...share,
    signedUrl,
    posterUrl,
    viewerUrl,
    createdAt: new Date(now).toISOString(),
    expiresAt
  }
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.(mp4|webm)$/i, '')
}

/**
 * Upload a recording (and a poster frame), sign links, save the share record,
 * and copy the preferred link to the clipboard.
 */
export async function shareRecording(
  request: ShareRequest,
  emit: ProgressEmitter
): Promise<ShareRecord> {
  const { recordingId } = request
  if (activeUploads.has(recordingId)) {
    throw new Error('This recording is already uploading.')
  }
  const controller = new AbortController()
  activeUploads.set(recordingId, controller)
  const tempPoster = join(tmpdir(), `capto-poster-${recordingId}-${Date.now()}.jpg`)

  try {
    emit({ recordingId, phase: 'preparing', progress: 0, message: 'Preparing upload…' })
    const meta = await getRecordingMetadata(recordingId)
    if (!meta || !existsSync(meta.path)) throw new Error('Recording file not found.')

    const settings = loadSettings()
    const provider = currentProvider(settings.sharing)
    const prefix = normalizePrefix(settings.sharing.prefix)
    const objectKey = buildObjectKey(prefix, meta.id, meta.createdAt, meta.filename)
    let posterKey: string | undefined = buildObjectKey(prefix, meta.id, meta.createdAt, POSTER_FILENAME)

    // Poster is best-effort: a failure should not block sharing.
    try {
      await extractPosterFrame(meta.path, tempPoster, Math.min(1000, meta.durationMs / 2))
      await provider.upload(tempPoster, posterKey, {
        contentType: 'image/jpeg',
        signal: controller.signal
      })
    } catch (error) {
      if (controller.signal.aborted) throw error
      log.warn('Poster upload skipped', { error: describeStorageError(error) })
      posterKey = undefined
    }

    emit({ recordingId, phase: 'uploading', progress: 0.02, message: 'Uploading…' })
    await provider.upload(meta.path, objectKey, {
      contentType: meta.path.toLowerCase().endsWith('.webm') ? 'video/webm' : FINAL_MIME_TYPE,
      signal: controller.signal,
      onProgress: (f) =>
        emit({ recordingId, phase: 'uploading', progress: 0.02 + f * 0.93, message: 'Uploading…' })
    })

    emit({ recordingId, phase: 'signing', progress: 0.97, message: 'Creating link…' })
    const share = await signShare(
      provider,
      { provider: provider.id, location: provider.location, objectKey, posterKey },
      request.expiresInSec ?? settings.sharing.defaultExpirySec,
      titleFromFilename(meta.filename),
      meta.durationMs
    )

    await updateRecordingMetadata(recordingId, (m) => ({
      ...m,
      shares: [...(m.shares ?? []), share]
    }))
    clipboard.writeText(preferredLink(share, settings.sharing))
    log.info('Recording shared', { id: recordingId, provider: share.provider })
    emit({ recordingId, phase: 'done', progress: 1, message: 'Link copied to clipboard', share })
    return share
  } catch (error) {
    const cancelled = controller.signal.aborted
    const message = cancelled ? 'Upload cancelled.' : describeStorageError(error)
    log.warn('Share failed', { id: recordingId, message })
    emit({ recordingId, phase: cancelled ? 'cancelled' : 'error', progress: 0, message })
    throw new Error(message)
  } finally {
    activeUploads.delete(recordingId)
    await fs.rm(tempPoster, { force: true }).catch(() => undefined)
  }
}

export function cancelShare(recordingId: string): void {
  activeUploads.get(recordingId)?.abort()
}

/** Re-sign the latest upload with a new expiry; no re-upload. Copies the link. */
export async function regenerateShareLink(
  recordingId: string,
  expiresInSec?: number
): Promise<ShareRecord> {
  const meta = await getRecordingMetadata(recordingId)
  const last = latestShare(meta?.shares)
  if (!meta || !last) throw new Error('This recording has not been uploaded yet.')
  try {
    const settings = loadSettings()
    const provider = providerForShare(last)
    const share = await signShare(
      provider,
      {
        provider: last.provider,
        location: last.location,
        objectKey: last.objectKey,
        posterKey: last.posterKey
      },
      expiresInSec ?? settings.sharing.defaultExpirySec,
      titleFromFilename(meta.filename),
      meta.durationMs
    )
    await updateRecordingMetadata(recordingId, (m) => ({
      ...m,
      shares: [...(m.shares ?? []), share]
    }))
    clipboard.writeText(preferredLink(share, settings.sharing))
    return share
  } catch (error) {
    throw new Error(describeStorageError(error))
  }
}

/** Delete every uploaded object for this recording; existing links stop working. */
export async function deleteRemoteCopies(recordingId: string): Promise<void> {
  const meta = await getRecordingMetadata(recordingId)
  if (!meta?.shares?.length) return
  const seen = new Set<string>()
  const failures: string[] = []
  for (const share of meta.shares) {
    for (const key of [share.objectKey, share.posterKey]) {
      if (!key) continue
      const id = `${share.provider}|${share.location}|${key}`
      if (seen.has(id)) continue
      seen.add(id)
      try {
        await providerForShare(share).delete(key)
      } catch (error) {
        failures.push(describeStorageError(error))
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Some files could not be deleted: ${failures[0]}`)
  }
  await updateRecordingMetadata(recordingId, (m) => ({ ...m, shares: [] }))
  log.info('Remote copies deleted', { id: recordingId })
}

/** Copy the preferred link for the latest share (if still valid). */
export async function copyShareLink(recordingId: string): Promise<string> {
  const meta = await getRecordingMetadata(recordingId)
  const last = latestShare(meta?.shares)
  if (!last) throw new Error('This recording has not been uploaded yet.')
  const link = preferredLink(last, loadSettings().sharing)
  clipboard.writeText(link)
  return link
}

/**
 * Write → sign → read back → delete a tiny probe object under the prefix.
 */
export async function testStorageConnection(): Promise<StorageTestResult> {
  const sharing = loadSettings().sharing
  let provider: StorageProvider
  try {
    provider = currentProvider(sharing)
  } catch (error) {
    return { ok: false, step: 'config', message: describeStorageError(error) }
  }
  const prefix = normalizePrefix(sharing.prefix)
  const key = [prefix, '.capto-connection-test', `${Date.now()}.txt`].filter(Boolean).join('/')
  const body = `capto-probe-${Math.random().toString(36).slice(2)}`

  let step: StorageTestResult['step'] = 'write'
  try {
    await provider.putText(key, body)
    step = 'sign'
    const url = await provider.createSignedUrl(key, 120)
    step = 'read'
    const res = await fetch(url)
    const text = await res.text()
    if (!res.ok || text !== body) {
      throw new Error(`Signed URL read failed (HTTP ${res.status}).`)
    }
    step = 'delete'
    await provider.delete(key)
    return { ok: true, message: `Connected to ${provider.location}. Upload, link and delete all work.` }
  } catch (error) {
    if (step !== 'write' && step !== 'delete') {
      await provider.delete(key).catch(() => undefined)
    }
    return { ok: false, step, message: describeStorageError(error) }
  }
}

export function hasActiveUploads(): boolean {
  return activeUploads.size > 0
}
