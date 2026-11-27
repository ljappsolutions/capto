import { DEFAULT_VIEWER_BASE_URL } from './shareLink'
import type { ShareRecord, SharingSettings, StorageProviderId } from './types'

export const STORAGE_PROVIDERS: readonly StorageProviderId[] = [
  'aws-s3',
  's3-compatible',
  'azure-blob',
  'gcs'
]

export const PROVIDER_LABELS: Record<StorageProviderId, string> = {
  'aws-s3': 'Amazon S3',
  's3-compatible': 'S3-compatible (Cloudflare R2, Backblaze B2, MinIO…)',
  'azure-blob': 'Azure Blob Storage',
  gcs: 'Google Cloud Storage'
}

const HOUR = 60 * 60
const DAY = 24 * HOUR

/** SigV4 (S3) and GCS V4 signed URLs are capped at 7 days by the providers. */
export const MAX_EXPIRY_SEC: Record<StorageProviderId, number> = {
  'aws-s3': 7 * DAY,
  's3-compatible': 7 * DAY,
  'azure-blob': 30 * DAY,
  gcs: 7 * DAY
}

export const EXPIRY_OPTIONS: readonly { label: string; seconds: number }[] = [
  { label: '1 hour', seconds: HOUR },
  { label: '1 day', seconds: DAY },
  { label: '3 days', seconds: 3 * DAY },
  { label: '7 days', seconds: 7 * DAY },
  { label: '14 days', seconds: 14 * DAY },
  { label: '30 days', seconds: 30 * DAY }
]

export function expiryOptionsFor(provider: StorageProviderId | null): typeof EXPIRY_OPTIONS {
  const max = provider ? MAX_EXPIRY_SEC[provider] : 7 * DAY
  return EXPIRY_OPTIONS.filter((o) => o.seconds <= max)
}

export function clampExpiry(provider: StorageProviderId, seconds: number): number {
  const max = MAX_EXPIRY_SEC[provider]
  if (!Number.isFinite(seconds) || seconds <= 0) return Math.min(7 * DAY, max)
  return Math.min(Math.max(60, Math.round(seconds)), max)
}

export const DEFAULT_SHARING: SharingSettings = {
  provider: null,
  prefix: 'capto',
  defaultExpirySec: 7 * DAY,
  linkFormat: 'viewer',
  viewerBaseUrl: DEFAULT_VIEWER_BASE_URL,
  autoUpload: false,
  aws: { region: 'us-east-1', bucket: '' },
  s3Compatible: { endpoint: '', region: 'auto', bucket: '', forcePathStyle: false },
  azure: { accountName: '', container: '', endpoint: '' },
  gcs: { bucket: '', apiEndpoint: '' }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, fallback: string, max = 512): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : fallback
}

export function normalizePrefix(prefix: string): string {
  return prefix
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '.' && p !== '..')
    .join('/')
}

function httpUrlOrEmpty(v: unknown, fallback: string): string {
  const s = str(v, fallback)
  if (!s) return ''
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:' ? s.replace(/\/+$/, '') : fallback
  } catch {
    return fallback
  }
}

export function parseSharingSettings(raw: unknown): SharingSettings {
  const d = DEFAULT_SHARING
  if (!isObject(raw)) return structuredClone(d)
  const aws = isObject(raw.aws) ? raw.aws : {}
  const s3c = isObject(raw.s3Compatible) ? raw.s3Compatible : {}
  const az = isObject(raw.azure) ? raw.azure : {}
  const gcs = isObject(raw.gcs) ? raw.gcs : {}
  const provider = STORAGE_PROVIDERS.includes(raw.provider as StorageProviderId)
    ? (raw.provider as StorageProviderId)
    : null
  const expiry =
    typeof raw.defaultExpirySec === 'number' && Number.isFinite(raw.defaultExpirySec)
      ? raw.defaultExpirySec
      : d.defaultExpirySec
  return {
    provider,
    prefix: normalizePrefix(str(raw.prefix, d.prefix)),
    defaultExpirySec: provider ? clampExpiry(provider, expiry) : Math.max(60, expiry),
    linkFormat: raw.linkFormat === 'raw' ? 'raw' : 'viewer',
    viewerBaseUrl: httpUrlOrEmpty(raw.viewerBaseUrl, d.viewerBaseUrl) || d.viewerBaseUrl,
    autoUpload: typeof raw.autoUpload === 'boolean' ? raw.autoUpload : d.autoUpload,
    aws: { region: str(aws.region, d.aws.region, 64) || d.aws.region, bucket: str(aws.bucket, '', 255) },
    s3Compatible: {
      endpoint: httpUrlOrEmpty(s3c.endpoint, ''),
      region: str(s3c.region, d.s3Compatible.region, 64) || d.s3Compatible.region,
      bucket: str(s3c.bucket, '', 255),
      forcePathStyle: typeof s3c.forcePathStyle === 'boolean' ? s3c.forcePathStyle : false
    },
    azure: {
      accountName: str(az.accountName, '', 64),
      container: str(az.container, '', 63),
      endpoint: httpUrlOrEmpty(az.endpoint, '')
    },
    gcs: { bucket: str(gcs.bucket, '', 222), apiEndpoint: httpUrlOrEmpty(gcs.apiEndpoint, '') }
  }
}

/** Bucket/container for the active provider, or '' if not set. */
export function locationFor(s: SharingSettings): string {
  switch (s.provider) {
    case 'aws-s3':
      return s.aws.bucket
    case 's3-compatible':
      return s.s3Compatible.bucket
    case 'azure-blob':
      return s.azure.container
    case 'gcs':
      return s.gcs.bucket
    default:
      return ''
  }
}

/** Returns a human-readable problem, or null when the non-secret config is complete. */
export function validateSharingConfig(s: SharingSettings): string | null {
  if (!s.provider) return 'Choose a storage provider.'
  if (!locationFor(s)) {
    return s.provider === 'azure-blob' ? 'Enter a container name.' : 'Enter a bucket name.'
  }
  if (s.provider === 's3-compatible' && !s.s3Compatible.endpoint) return 'Enter the endpoint URL.'
  if (s.provider === 'azure-blob' && !s.azure.accountName) return 'Enter the storage account name.'
  return null
}

function safeSegment(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 120) || 'recording'
  )
}

/**
 * `{prefix}/{yyyy}/{mm}/{recordingId}/{file}`. Each recording gets its own
 * folder so the poster and future captions sit next to the video.
 */
export function buildObjectKey(
  prefix: string,
  recordingId: string,
  createdAtIso: string,
  file: string
): string {
  const date = new Date(createdAtIso)
  const valid = !Number.isNaN(date.getTime())
  const yyyy = valid ? String(date.getUTCFullYear()) : 'unknown'
  const mm = valid ? String(date.getUTCMonth() + 1).padStart(2, '0') : '00'
  const parts = [normalizePrefix(prefix), yyyy, mm, safeSegment(recordingId), safeSegment(file)]
  return parts.filter(Boolean).join('/')
}

export type ShareStatus = 'none' | 'active' | 'expired'

export function latestShare(shares: ShareRecord[] | undefined): ShareRecord | null {
  if (!shares || shares.length === 0) return null
  return [...shares].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function shareStatus(shares: ShareRecord[] | undefined, now = Date.now()): ShareStatus {
  const s = latestShare(shares)
  if (!s) return 'none'
  return Date.parse(s.expiresAt) > now ? 'active' : 'expired'
}

export function formatExpiry(expiresAtIso: string, now = Date.now()): string {
  const ms = Date.parse(expiresAtIso) - now
  if (Number.isNaN(ms)) return ''
  if (ms <= 0) return 'Expired'
  // Round down so the label never overstates how long a link lasts
  // (matches the website viewer).
  const minutes = Math.max(1, Math.floor(ms / 60000))
  if (minutes < 60) return `Expires in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `Expires in ${hours} h`
  return `Expires in ${Math.floor(hours / 24)} days`
}
