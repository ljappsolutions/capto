import type { StorageProviderId } from '@shared/types'

export interface UploadOptions {
  contentType: string
  /** 0–1 */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/**
 * A cloud storage backend. Implementations run only in the main process and
 * must never log credentials or signed URLs.
 */
export interface StorageProvider {
  readonly id: StorageProviderId
  /** Bucket or container name, used for share records. */
  readonly location: string
  readonly maxExpirySec: number
  upload(localPath: string, objectKey: string, options: UploadOptions): Promise<void>
  /** Small in-memory upload (used by the connection test). */
  putText(objectKey: string, body: string): Promise<void>
  createSignedUrl(objectKey: string, expiresInSec: number): Promise<string>
  delete(objectKey: string): Promise<void>
}

export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageConfigError'
  }
}
