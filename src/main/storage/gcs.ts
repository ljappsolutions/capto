import { createReadStream, statSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { Storage, type Bucket } from '@google-cloud/storage'
import { OAuth2Client } from 'google-auth-library'
import { MAX_EXPIRY_SEC } from '@shared/sharing'
import { StorageConfigError, type StorageProvider, type UploadOptions } from './types'

export interface GcsProviderConfig {
  bucket: string
  serviceAccountJson: string
  /** Optional API endpoint, e.g. http://localhost:4443 for fake-gcs-server. */
  apiEndpoint?: string
}

interface ServiceAccount {
  client_email: string
  private_key: string
  project_id?: string
}

function parseServiceAccount(json: string): ServiceAccount {
  try {
    const sa = JSON.parse(json) as Partial<ServiceAccount>
    if (typeof sa.client_email === 'string' && typeof sa.private_key === 'string') {
      return sa as ServiceAccount
    }
  } catch {
    // fall through
  }
  throw new StorageConfigError('The service account JSON is missing client_email or private_key.')
}

function emulatorAuthClient(): OAuth2Client {
  const client = new OAuth2Client()
  client.setCredentials({ access_token: 'emulator', expiry_date: Date.now() + 24 * 3600 * 1000 })
  return client
}

export class GcsStorageProvider implements StorageProvider {
  readonly id = 'gcs' as const
  readonly location: string
  readonly maxExpirySec = MAX_EXPIRY_SEC.gcs
  /** Bucket handle used for API calls (uploads, deletes). */
  private readonly bucket: Bucket
  /** Bucket handle whose client holds the key; used for V4 URL signing. */
  private readonly signingBucket: Bucket

  constructor(config: GcsProviderConfig) {
    const sa = parseServiceAccount(config.serviceAccountJson)
    this.location = config.bucket
    const signing = new Storage({
      projectId: sa.project_id,
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
      apiEndpoint: config.apiEndpoint || undefined
    })
    this.signingBucket = signing.bucket(config.bucket)
    // Emulators (fake-gcs-server) can't mint Google OAuth tokens, and the client
    // always asks for one. Give API calls a static dummy token there; signing
    // still happens locally with the service-account key.
    this.bucket = config.apiEndpoint
      ? new Storage({
          projectId: sa.project_id ?? 'emulator',
          apiEndpoint: config.apiEndpoint,
          authClient: emulatorAuthClient()
        }).bucket(config.bucket)
      : this.signingBucket
  }

  async upload(localPath: string, objectKey: string, options: UploadOptions): Promise<void> {
    const total = statSync(localPath).size
    let sent = 0
    const counter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        sent += chunk.length
        if (total > 0) options.onProgress?.(Math.min(0.99, sent / total))
        cb(null, chunk)
      }
    })
    const write = this.bucket.file(objectKey).createWriteStream({
      resumable: total > 5 * 1024 * 1024,
      contentType: options.contentType,
      metadata: {
        contentDisposition: 'inline',
        cacheControl: 'private, max-age=3600'
      }
    })
    await pipeline(createReadStream(localPath), counter, write, { signal: options.signal })
    options.onProgress?.(1)
  }

  async putText(objectKey: string, body: string): Promise<void> {
    await this.bucket.file(objectKey).save(body, { contentType: 'text/plain', resumable: false })
  }

  async createSignedUrl(objectKey: string, expiresInSec: number): Promise<string> {
    const [url] = await this.signingBucket.file(objectKey).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + Math.min(expiresInSec, this.maxExpirySec) * 1000
    })
    return url
  }

  async delete(objectKey: string): Promise<void> {
    await this.bucket.file(objectKey).delete({ ignoreNotFound: true })
  }
}
