import { describe, expect, it } from 'vitest'
import { buildViewerUrl, decodeSharePayload, encodeSharePayload } from './shareLink'

describe('shareLink', () => {
  const payload = {
    v: 1 as const,
    u: 'https://bucket.s3.amazonaws.com/capto/a.mp4?X-Amz-Signature=abc+/=',
    p: 'https://bucket.s3.amazonaws.com/capto/poster.jpg?sig=1',
    t: 'Demo — ñandú 🎥',
    e: '2026-12-03T10:00:00.000Z',
    d: 12345
  }

  it('round-trips including unicode', () => {
    const encoded = encodeSharePayload(payload)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeSharePayload(encoded)).toEqual(payload)
  })

  it('accepts a leading #', () => {
    expect(decodeSharePayload('#' + encodeSharePayload(payload))).toEqual(payload)
  })

  it('rejects garbage and unsafe urls', () => {
    expect(decodeSharePayload('')).toBeNull()
    expect(decodeSharePayload('!!!')).toBeNull()
    expect(decodeSharePayload(encodeSharePayload({ ...payload, u: 'javascript:alert(1)' }))).toBeNull()
    const noPoster = decodeSharePayload(
      encodeSharePayload({ ...payload, p: 'data:text/html,hi' })
    )
    expect(noPoster?.p).toBeUndefined()
  })

  it('builds viewer url without double slashes', () => {
    const url = buildViewerUrl('https://example.com/', payload)
    expect(url.startsWith('https://example.com/v#')).toBe(true)
  })
})
