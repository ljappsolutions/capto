import { describe, expect, it } from 'vitest'
import {
  buildObjectKey,
  clampExpiry,
  expiryOptionsFor,
  formatExpiry,
  normalizePrefix,
  parseSharingSettings,
  shareStatus,
  validateSharingConfig
} from './sharing'

describe('sharing', () => {
  it('normalizes prefixes and blocks traversal', () => {
    expect(normalizePrefix('/clients//acme/')).toBe('clients/acme')
    expect(normalizePrefix('../x/./y')).toBe('x/y')
    expect(normalizePrefix('')).toBe('')
  })

  it('builds date-sharded object keys', () => {
    expect(buildObjectKey('capto/', 'rec-1', '2026-03-05T10:00:00Z', 'My Demo #1.mp4')).toBe(
      'capto/2026/03/rec-1/My-Demo-1.mp4'
    )
    expect(buildObjectKey('', 'rec-1', 'bad', 'a.mp4')).toBe('unknown/00/rec-1/a.mp4')
  })

  it('clamps expiry to provider limits', () => {
    expect(clampExpiry('aws-s3', 30 * 86400)).toBe(7 * 86400)
    expect(clampExpiry('azure-blob', 30 * 86400)).toBe(30 * 86400)
    expect(clampExpiry('gcs', 1)).toBe(60)
    expect(expiryOptionsFor('gcs').every((o) => o.seconds <= 7 * 86400)).toBe(true)
  })

  it('parses settings defensively', () => {
    const s = parseSharingSettings({
      provider: 'aws-s3',
      prefix: '/a/b/',
      defaultExpirySec: 999999999,
      viewerBaseUrl: 'javascript:alert(1)',
      aws: { bucket: ' my-bucket ' }
    })
    expect(s.provider).toBe('aws-s3')
    expect(s.prefix).toBe('a/b')
    expect(s.defaultExpirySec).toBe(7 * 86400)
    expect(s.viewerBaseUrl).toBe('https://capto.ljappsolutions.com')
    expect(s.aws.bucket).toBe('my-bucket')
    expect(s.aws.region).toBe('us-east-1')
    expect(parseSharingSettings({ provider: 'dropbox' }).provider).toBeNull()
  })

  it('validates required fields', () => {
    expect(validateSharingConfig(parseSharingSettings({}))).toMatch(/provider/)
    expect(validateSharingConfig(parseSharingSettings({ provider: 's3-compatible', s3Compatible: { bucket: 'b' } }))).toMatch(/endpoint/)
    expect(validateSharingConfig(parseSharingSettings({ provider: 'gcs', gcs: { bucket: 'b' } }))).toBeNull()
  })

  it('computes share status and expiry labels', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    const share = {
      provider: 'aws-s3' as const,
      location: 'b',
      objectKey: 'k',
      signedUrl: 'https://x',
      createdAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-03T00:00:00Z'
    }
    expect(shareStatus([], now)).toBe('none')
    expect(shareStatus([share], now)).toBe('active')
    expect(shareStatus([share], Date.parse('2026-02-01T00:00:00Z'))).toBe('expired')
    expect(formatExpiry(share.expiresAt, now)).toBe('Expires in 2 days')
    expect(formatExpiry('2026-01-01T05:00:00Z', now)).toBe('Expires in 5 h')
    expect(formatExpiry('2026-01-10T00:00:00Z', now)).toBe('Expires in 9 days')
  })
})
