import { describe, expect, it } from 'vitest'
import { parseMetadata } from './metadata'

describe('parseMetadata', () => {
  it('returns null for invalid payloads', () => {
    expect(parseMetadata(null)).toBeNull()
    expect(parseMetadata({})).toBeNull()
  })

  it('parses a valid metadata object', () => {
    const meta = parseMetadata({
      version: 1,
      id: 'abc',
      filename: 'clip.webm',
      path: '/tmp/clip.webm',
      createdAt: '2026-08-08T00:00:00.000Z',
      durationMs: 1200,
      sizeBytes: 4096,
      captureSourceName: 'Safari',
      captureSourceType: 'window',
      microphoneEnabled: true,
      cameraEnabled: false,
      systemAudioEnabled: true,
      mimeType: 'video/webm',
      width: 1280,
      height: 720,
      fps: 30
    })

    expect(meta?.id).toBe('abc')
    expect(meta?.captureSourceType).toBe('window')
    expect(meta?.width).toBe(1280)
  })
})
