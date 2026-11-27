import { createReadStream, statSync } from 'node:fs'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MAX_EXPIRY_SEC } from '@shared/sharing'
import type { StorageProvider, UploadOptions } from './types'

export interface S3ProviderConfig {
  id: 'aws-s3' | 's3-compatible'
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Custom endpoint for S3-compatible services (R2, B2, MinIO…). */
  endpoint?: string
  forcePathStyle?: boolean
}

/** Multipart part size: 8 MiB keeps memory low while staying under the 10k-part cap for ~80 GB files. */
const PART_SIZE = 8 * 1024 * 1024

export class S3StorageProvider implements StorageProvider {
  readonly id: S3ProviderConfig['id']
  readonly location: string
  readonly maxExpirySec: number
  private readonly client: S3Client

  constructor(config: S3ProviderConfig) {
    this.id = config.id
    this.location = config.bucket
    this.maxExpirySec = MAX_EXPIRY_SEC[config.id]
    this.client = new S3Client({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle ?? false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      // Some S3-compatible services reject the newer default CRC32 checksums.
      requestChecksumCalculation: config.endpoint ? 'WHEN_REQUIRED' : 'WHEN_SUPPORTED',
      responseChecksumValidation: config.endpoint ? 'WHEN_REQUIRED' : 'WHEN_SUPPORTED'
    })
  }

  async upload(localPath: string, objectKey: string, options: UploadOptions): Promise<void> {
    const total = statSync(localPath).size
    const upload = new Upload({
      client: this.client,
      queueSize: 4,
      partSize: PART_SIZE,
      leavePartsOnError: false,
      params: {
        Bucket: this.location,
        Key: objectKey,
        Body: createReadStream(localPath),
        ContentType: options.contentType,
        ContentDisposition: 'inline',
        CacheControl: 'private, max-age=3600'
      }
    })

    upload.on('httpUploadProgress', (p) => {
      if (total > 0 && typeof p.loaded === 'number') {
        options.onProgress?.(Math.min(1, p.loaded / total))
      }
    })

    const onAbort = (): void => {
      void upload.abort()
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    try {
      await upload.done()
      options.onProgress?.(1)
    } finally {
      options.signal?.removeEventListener('abort', onAbort)
    }
  }

  async putText(objectKey: string, body: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.location,
        Key: objectKey,
        Body: body,
        ContentType: 'text/plain'
      })
    )
  }

  async createSignedUrl(objectKey: string, expiresInSec: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.location, Key: objectKey }),
      { expiresIn: Math.min(expiresInSec, this.maxExpirySec) }
    )
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.location, Key: objectKey }))
  }
}
