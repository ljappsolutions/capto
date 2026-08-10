import type { RecordingMetadata } from './types'

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
    recovered: Boolean(o.recovered)
  }
}
