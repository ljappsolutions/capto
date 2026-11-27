import { validateSharingConfig } from '@shared/sharing'
import type { SharingSettings, StorageCredentials, StorageProviderId } from '@shared/types'
import { AzureBlobStorageProvider } from './azure'
import { GcsStorageProvider } from './gcs'
import { S3StorageProvider } from './s3'
import { StorageConfigError, type StorageProvider } from './types'

export { StorageConfigError, type StorageProvider } from './types'

/**
 * Build a provider from non-secret settings + decrypted credentials.
 * Throws StorageConfigError with a user-facing message when something is missing.
 */
export function createStorageProvider(
  sharing: SharingSettings,
  credentials: StorageCredentials | null,
  providerOverride?: StorageProviderId
): StorageProvider {
  const settings = providerOverride ? { ...sharing, provider: providerOverride } : sharing
  const problem = validateSharingConfig(settings)
  if (problem) throw new StorageConfigError(problem)
  const provider = settings.provider!
  if (!credentials || credentials.provider !== provider) {
    throw new StorageConfigError('Add your credentials for this provider in Settings → Sharing.')
  }

  switch (credentials.provider) {
    case 'aws-s3':
      return new S3StorageProvider({
        id: 'aws-s3',
        bucket: settings.aws.bucket,
        region: settings.aws.region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      })
    case 's3-compatible':
      return new S3StorageProvider({
        id: 's3-compatible',
        bucket: settings.s3Compatible.bucket,
        region: settings.s3Compatible.region,
        endpoint: settings.s3Compatible.endpoint,
        forcePathStyle: settings.s3Compatible.forcePathStyle,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      })
    case 'azure-blob':
      return new AzureBlobStorageProvider({
        accountName: settings.azure.accountName,
        accountKey: credentials.accountKey,
        container: settings.azure.container,
        endpoint: settings.azure.endpoint
      })
    case 'gcs':
      return new GcsStorageProvider({
        bucket: settings.gcs.bucket,
        serviceAccountJson: credentials.serviceAccountJson,
        apiEndpoint: settings.gcs.apiEndpoint
      })
  }
}

/**
 * Map SDK errors to short, actionable messages. Never include signed URLs.
 */
export function describeStorageError(error: unknown): string {
  if (error instanceof StorageConfigError) return error.message
  const e = error as { name?: string; code?: string; message?: string; statusCode?: number; $metadata?: { httpStatusCode?: number } }
  const name = e?.name ?? e?.code ?? ''
  const status = e?.$metadata?.httpStatusCode ?? e?.statusCode
  if (name === 'AbortError' || name === 'RequestAbortedError') return 'Upload cancelled.'
  if (/InvalidAccessKeyId|SignatureDoesNotMatch|AuthenticationFailed|invalid_grant/i.test(name + (e?.message ?? ''))) {
    return 'The credentials were rejected. Check the access key / secret.'
  }
  if (/NoSuchBucket|ContainerNotFound|notFound/i.test(name) || status === 404) {
    return 'Bucket or container not found. Check the name (and region).'
  }
  if (/PermanentRedirect|AuthorizationHeaderMalformed/i.test(name)) {
    return 'Wrong region for this bucket. Update the region in Settings → Sharing.'
  }
  if (/AccessDenied|AuthorizationPermissionMismatch|Forbidden/i.test(name) || status === 403) {
    return 'Access denied. The key needs write, read and delete permission on this bucket/prefix.'
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(e?.code ?? e?.message ?? '')) {
    return 'Could not reach the storage service. Check the endpoint and your connection.'
  }
  const message = (e?.message ?? String(error)).replace(/https?:\/\/\S+/g, '[url]')
  return message.slice(0, 300) || 'Unknown storage error.'
}
