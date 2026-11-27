/**
 * Provider integration tests against local emulators. Skipped unless
 * CAPTO_STORAGE_IT=1. Start the emulators with `yarn test:storage:up`.
 *
 *   S3Mock          http://localhost:9090  (any key / secret)
 *   Azurite         http://127.0.0.1:10000/devstoreaccount1
 *   fake-gcs-server http://localhost:4443
 */
import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AzureBlobStorageProvider } from './azure'
import { GcsStorageProvider } from './gcs'
import { S3StorageProvider } from './s3'
import type { StorageProvider } from './types'

const enabled = process.env.CAPTO_STORAGE_IT === '1'

// Public, documented Azurite development credentials (not a secret).
const AZURITE_ACCOUNT = 'devstoreaccount1'
const AZURITE_KEY =
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='

function tempFile(bytes: number): string {
  const dir = mkdtempSync(join(tmpdir(), 'capto-it-'))
  const path = join(dir, 'video.mp4')
  const buf = Buffer.alloc(bytes)
  for (let i = 0; i < bytes; i++) buf[i] = i % 251
  writeFileSync(path, buf)
  return path
}

async function exercise(provider: StorageProvider, size: number): Promise<void> {
  const key = `capto-it/${Date.now()}/video.mp4`
  const file = tempFile(size)
  const progress: number[] = []
  await provider.upload(file, key, {
    contentType: 'video/mp4',
    onProgress: (f) => progress.push(f)
  })
  expect(progress.at(-1)).toBe(1)

  const url = await provider.createSignedUrl(key, 300)
  const res = await fetch(url)
  expect(res.status).toBe(200)
  const body = Buffer.from(await res.arrayBuffer())
  expect(body.length).toBe(size)
  expect(body[size - 1]).toBe((size - 1) % 251)

  await provider.putText(`${key}.txt`, 'hello')
  await provider.delete(`${key}.txt`)
  await provider.delete(key)
  const after = await fetch(url)
  expect(after.status).toBeGreaterThanOrEqual(400)
}

describe.skipIf(!enabled)('storage providers (emulators)', () => {
  const bucket = `capto-it-${Date.now()}`
  let gcsKeyJson = ''

  beforeAll(async () => {
    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: 'http://localhost:9090',
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    })
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    await fetch('http://localhost:4443/storage/v1/b?project=test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: bucket })
    })
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    gcsKeyJson = JSON.stringify({
      type: 'service_account',
      project_id: 'test',
      client_email: 'it@test.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    })
  })

  afterAll(() => undefined)

  it('S3-compatible (S3Mock): multipart upload, sign, read, delete', async () => {
    const provider = new S3StorageProvider({
      id: 's3-compatible',
      bucket,
      region: 'us-east-1',
      endpoint: 'http://localhost:9090',
      forcePathStyle: true,
      accessKeyId: 'test',
      secretAccessKey: 'test'
    })
    // > part size so the multipart path is exercised.
    await exercise(provider, 9 * 1024 * 1024)
  }, 60_000)

  it('Azure Blob (Azurite): upload, SAS, read, delete', async () => {
    const provider = new AzureBlobStorageProvider({
      accountName: AZURITE_ACCOUNT,
      accountKey: AZURITE_KEY,
      container: bucket,
      endpoint: `http://127.0.0.1:10000/${AZURITE_ACCOUNT}`
    })
    await exercise(provider, 9 * 1024 * 1024)
  }, 60_000)

  it('GCS (fake-gcs-server): upload, read via API', async () => {
    const provider = new GcsStorageProvider({
      bucket,
      serviceAccountJson: gcsKeyJson,
      apiEndpoint: 'http://localhost:4443'
    })
    const key = `capto-it/${Date.now()}/video.mp4`
    const size = 6 * 1024 * 1024
    await provider.upload(tempFile(size), key, { contentType: 'video/mp4' })
    // fake-gcs-server does not validate V4 signatures; check signing works and
    // read the object through its JSON API instead.
    const signed = await provider.createSignedUrl(key, 300)
    expect(signed).toContain('X-Goog-Signature')
    const res = await fetch(
      `http://localhost:4443/storage/v1/b/${bucket}/o/${encodeURIComponent(key)}?alt=media`
    )
    expect(res.status).toBe(200)
    expect((await res.arrayBuffer()).byteLength).toBe(size)
    await provider.delete(key)
    const gone = await fetch(`http://localhost:4443/storage/v1/b/${bucket}/o/${encodeURIComponent(key)}`)
    expect(gone.status).toBe(404)
  }, 60_000)
})
