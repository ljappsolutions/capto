import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CREDENTIALS_FILENAME } from '@shared/constants'
import { STORAGE_PROVIDERS } from '@shared/sharing'
import type { CredentialStatus, StorageCredentials, StorageProviderId } from '@shared/types'
import { log } from './logger'

/**
 * Encrypted credential store. Secrets are encrypted with Electron safeStorage
 * (macOS Keychain-backed key) and only ever handled in the main process.
 */

type Store = Partial<Record<StorageProviderId, StorageCredentials>>

function storePath(): string {
  return join(app.getPath('userData'), CREDENTIALS_FILENAME)
}

let cache: Store | null = null

function assertEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Secure storage is not available on this Mac (Keychain). Credentials cannot be saved.'
    )
  }
}

function readStore(): Store {
  if (cache) return cache
  const path = storePath()
  if (!existsSync(path)) {
    cache = {}
    return cache
  }
  try {
    assertEncryptionAvailable()
    const json = safeStorage.decryptString(readFileSync(path))
    const parsed = JSON.parse(json) as unknown
    cache = sanitizeStore(parsed)
  } catch (error) {
    // Never log the payload; only the failure.
    log.error('Failed to read credential store', {
      error: error instanceof Error ? error.message : String(error)
    })
    cache = {}
  }
  return cache
}

function writeStore(store: Store): void {
  assertEncryptionAvailable()
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const encrypted = safeStorage.encryptString(JSON.stringify(store))
  writeFileSync(storePath(), encrypted, { mode: 0o600 })
  cache = store
}

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Validate shape coming from disk or the renderer. Returns null if invalid. */
export function sanitizeCredentials(raw: unknown): StorageCredentials | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  switch (o.provider) {
    case 'aws-s3':
    case 's3-compatible':
      if (!nonEmpty(o.accessKeyId) || !nonEmpty(o.secretAccessKey)) return null
      return {
        provider: o.provider,
        accessKeyId: o.accessKeyId.trim(),
        secretAccessKey: o.secretAccessKey.trim()
      }
    case 'azure-blob':
      if (!nonEmpty(o.accountKey)) return null
      return { provider: 'azure-blob', accountKey: o.accountKey.trim() }
    case 'gcs': {
      if (!nonEmpty(o.serviceAccountJson)) return null
      try {
        const sa = JSON.parse(o.serviceAccountJson) as Record<string, unknown>
        if (!nonEmpty(sa.client_email) || !nonEmpty(sa.private_key)) return null
      } catch {
        return null
      }
      return { provider: 'gcs', serviceAccountJson: o.serviceAccountJson.trim() }
    }
    default:
      return null
  }
}

function sanitizeStore(raw: unknown): Store {
  const out: Store = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const id of STORAGE_PROVIDERS) {
    const c = sanitizeCredentials((raw as Record<string, unknown>)[id])
    if (c && c.provider === id) out[id] = c
  }
  return out
}

export function getCredentials(provider: StorageProviderId): StorageCredentials | null {
  return readStore()[provider] ?? null
}

export function saveCredentials(raw: unknown): CredentialStatus {
  const creds = sanitizeCredentials(raw)
  if (!creds) {
    throw new Error('Credentials are incomplete or invalid.')
  }
  const store = { ...readStore(), [creds.provider]: creds }
  writeStore(store)
  log.info('Credentials saved', { provider: creds.provider })
  return statusFor(creds.provider)
}

export function clearCredentials(provider: StorageProviderId): CredentialStatus {
  const store = { ...readStore() }
  delete store[provider]
  if (Object.keys(store).length === 0) {
    cache = {}
    if (existsSync(storePath())) rmSync(storePath())
  } else {
    writeStore(store)
  }
  log.info('Credentials removed', { provider })
  return statusFor(provider)
}

function hintFor(creds: StorageCredentials): string {
  switch (creds.provider) {
    case 'aws-s3':
    case 's3-compatible':
      return `…${creds.accessKeyId.slice(-4)}`
    case 'azure-blob':
      return `…${creds.accountKey.slice(-4)}`
    case 'gcs':
      try {
        return String((JSON.parse(creds.serviceAccountJson) as { client_email: string }).client_email)
      } catch {
        return 'service account'
      }
  }
}

export function statusFor(provider: StorageProviderId): CredentialStatus {
  const creds = getCredentials(provider)
  return { provider, configured: Boolean(creds), hint: creds ? hintFor(creds) : null }
}

export function allCredentialStatuses(): CredentialStatus[] {
  return STORAGE_PROVIDERS.map(statusFor)
}
