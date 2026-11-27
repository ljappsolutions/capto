// Mirrors src/shared/shareLink.ts in the desktop app. Copied verbatim below this
// header: keep both files in sync whenever the payload contract changes.

/**
 * Share-link contract between the desktop app and the website viewer.
 *
 * Viewer URL: `${viewerBaseUrl}/v#${encodeSharePayload(payload)}`
 *
 * The payload lives in the URL fragment, which browsers never send to the
 * server: the website stays static and never sees signed URLs.
 * Encoding: UTF-8 JSON → base64url (no padding).
 *
 * Keep this file dependency-free; the website copies it verbatim.
 */

export const SHARE_PAYLOAD_VERSION = 1
export const DEFAULT_VIEWER_BASE_URL = 'https://capto.ljappsolutions.com'

export interface SharePayload {
  /** Payload schema version. */
  v: typeof SHARE_PAYLOAD_VERSION
  /** Signed URL of the MP4 video. */
  u: string
  /** Signed URL of a poster JPEG (optional). */
  p?: string
  /** Title shown on the viewer page (optional). */
  t?: string
  /** ISO timestamp when the signed URLs expire (optional). */
  e?: string
  /** Duration in milliseconds (optional). */
  d?: number
  /** Signed URL of a WebVTT captions file (optional). */
  c?: string
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload)
  return bytesToBase64Url(new TextEncoder().encode(json))
}

/** Returns null for anything malformed or unsafe (non-http URLs). */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const trimmed = encoded.replace(/^#/, '').trim()
    if (!trimmed) return null
    const json = new TextDecoder().decode(base64UrlToBytes(trimmed))
    const raw = JSON.parse(json) as Record<string, unknown>
    if (raw.v !== SHARE_PAYLOAD_VERSION || !isHttpUrl(raw.u)) return null
    const payload: SharePayload = { v: SHARE_PAYLOAD_VERSION, u: raw.u }
    if (isHttpUrl(raw.p)) payload.p = raw.p
    if (isHttpUrl(raw.c)) payload.c = raw.c
    if (typeof raw.t === 'string') payload.t = raw.t.slice(0, 200)
    if (typeof raw.e === 'string' && !Number.isNaN(Date.parse(raw.e))) payload.e = raw.e
    if (typeof raw.d === 'number' && Number.isFinite(raw.d) && raw.d >= 0) payload.d = raw.d
    return payload
  } catch {
    return null
  }
}

export function buildViewerUrl(viewerBaseUrl: string, payload: SharePayload): string {
  const base = viewerBaseUrl.replace(/\/+$/, '')
  return `${base}/v#${encodeSharePayload(payload)}`
}
