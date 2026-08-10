import { describe, expect, it } from 'vitest'
import {
  buildRecordingFilename,
  ensureUniqueBasename,
  formatRecordingTimestamp,
  sanitizeFilenamePart
} from './filename'

describe('sanitizeFilenamePart', () => {
  it('strips unsafe characters and collapses spaces', () => {
    expect(sanitizeFilenamePart('Visual Studio Code')).toBe('Visual-Studio-Code')
    expect(sanitizeFilenamePart('a/b:c*d?.webm')).toBe('abcd.webm')
  })

  it('falls back when empty', () => {
    expect(sanitizeFilenamePart('***')).toBe('Recording')
  })
})

describe('buildRecordingFilename', () => {
  it('includes timestamp and source', () => {
    const date = new Date('2026-08-08T21:35:42')
    expect(buildRecordingFilename('Terminal', date)).toBe(
      `${formatRecordingTimestamp(date)}_Terminal`
    )
  })
})

describe('ensureUniqueBasename', () => {
  it('appends suffix on collision', () => {
    const existing = new Set(['foo', 'foo-2'])
    expect(ensureUniqueBasename('foo', existing)).toBe('foo-3')
    expect(ensureUniqueBasename('bar', existing)).toBe('bar')
  })
})
