import type { RecordingMetadata, ShareRecord } from './types'
import { STORAGE_PROVIDERS } from './sharing'

function parseShare(raw: unknown): ShareRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (!STORAGE_PROVIDERS.includes(o.provider as ShareRecord['provider'])) return null
  if (
    typeof o.location !== 'string' ||
    typeof o.objectKey !== 'string' ||
    typeof o.signedUrl !== 'string' ||
    typeof o.createdAt !== 'string' ||
    typeof o.expiresAt !== 'string'
  ) {
    return null
  }
  return {
    provider: o.provider as ShareRecord['provider'],
    location: o.location,
    objectKey: o.objectKey,
    posterKey: typeof o.posterKey === 'string' ? o.posterKey : undefined,
    signedUrl: o.signedUrl,
    posterUrl: typeof o.posterUrl === 'string' ? o.posterUrl : undefined,
    viewerUrl: typeof o.viewerUrl === 'string' ? o.viewerUrl : undefined,
    createdAt: o.createdAt,
    expiresAt: o.expiresAt
  }
}

export function parseMetadata(raw: unknown): RecordingMetadata | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.filename !== 'string' || typeof o.path !== 'string') {
    return null
  }
  if (typeof o.createdAt !== 'string' || typeof o.durationMs !== 'number') return null
  if (typeof o.sizeBytes !== 'number') return null
  if (o.captureSourceType !== 'screen' && o.captureSourceType !== 'window') return null

  return {
    version: typeof o.version === 'number' ? o.version : 1,
    id: o.id,
    filename: o.filename,
    path: o.path,
    createdAt: o.createdAt,
    durationMs: o.durationMs,
    sizeBytes: o.sizeBytes,
    captureSourceName: typeof o.captureSourceName === 'string' ? o.captureSourceName : 'Unknown',
    captureSourceType: o.captureSourceType,
    microphoneEnabled: Boolean(o.microphoneEnabled),
    cameraEnabled: Boolean(o.cameraEnabled),
    systemAudioEnabled: Boolean(o.systemAudioEnabled),
    mimeType: typeof o.mimeType === 'string' ? o.mimeType : 'video/webm',
    width: typeof o.width === 'number' ? o.width : 0,
    height: typeof o.height === 'number' ? o.height : 0,
    fps: typeof o.fps === 'number' ? o.fps : 30,
    recovered: Boolean(o.recovered),
    shares: Array.isArray(o.shares)
      ? o.shares.map(parseShare).filter((x): x is ShareRecord => x !== null)
      : []
  }
}
