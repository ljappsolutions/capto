import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
  type ContainerClient
} from '@azure/storage-blob'
import { MAX_EXPIRY_SEC } from '@shared/sharing'
import type { StorageProvider, UploadOptions } from './types'

export interface AzureProviderConfig {
  accountName: string
  accountKey: string
  container: string
  /** Optional blob service URL, e.g. http://127.0.0.1:10000/devstoreaccount1 for Azurite. */
  endpoint?: string
}

const BLOCK_SIZE = 8 * 1024 * 1024

export class AzureBlobStorageProvider implements StorageProvider {
  readonly id = 'azure-blob' as const
  readonly location: string
  readonly maxExpirySec = MAX_EXPIRY_SEC['azure-blob']
  private readonly credential: StorageSharedKeyCredential
  private readonly container: ContainerClient
  private readonly insecureEndpoint: boolean
  private ensured = false

  constructor(config: AzureProviderConfig) {
    this.location = config.container
    this.credential = new StorageSharedKeyCredential(config.accountName, config.accountKey)
    const endpoint =
      config.endpoint?.replace(/\/+$/, '') || `https://${config.accountName}.blob.core.windows.net`
    this.insecureEndpoint = endpoint.startsWith('http://')
    const service = new BlobServiceClient(endpoint, this.credential)
    this.container = service.getContainerClient(config.container)
  }

  /** Create the (private) container on first use; a no-op when it already exists. */
  private async ensureContainer(): Promise<void> {
    if (this.ensured) return
    await this.container.createIfNotExists()
    this.ensured = true
  }

  async upload(localPath: string, objectKey: string, options: UploadOptions): Promise<void> {
    await this.ensureContainer()
    const blob = this.container.getBlockBlobClient(objectKey)
    const { statSync } = await import('node:fs')
    const total = statSync(localPath).size
    await blob.uploadFile(localPath, {
      blockSize: BLOCK_SIZE,
      concurrency: 4,
      abortSignal: options.signal,
      blobHTTPHeaders: {
        blobContentType: options.contentType,
        blobContentDisposition: 'inline',
        blobCacheControl: 'private, max-age=3600'
      },
      onProgress: (ev) => {
        if (total > 0) options.onProgress?.(Math.min(1, ev.loadedBytes / total))
      }
    })
    options.onProgress?.(1)
  }

  async putText(objectKey: string, body: string): Promise<void> {
    await this.ensureContainer()
    await this.container
      .getBlockBlobClient(objectKey)
      .upload(body, Buffer.byteLength(body), { blobHTTPHeaders: { blobContentType: 'text/plain' } })
  }

  async createSignedUrl(objectKey: string, expiresInSec: number): Promise<string> {
    const now = Date.now()
    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.location,
        blobName: objectKey,
        permissions: BlobSASPermissions.parse('r'),
        // Allow for small clock skew between this Mac and Azure.
        startsOn: new Date(now - 5 * 60 * 1000),
        expiresOn: new Date(now + Math.min(expiresInSec, this.maxExpirySec) * 1000),
        protocol: this.insecureEndpoint ? SASProtocol.HttpsAndHttp : SASProtocol.Https
      },
      this.credential
    ).toString()
    return `${this.container.getBlobClient(objectKey).url}?${sas}`
  }

  async delete(objectKey: string): Promise<void> {
    await this.container.getBlobClient(objectKey).deleteIfExists()
  }
}
