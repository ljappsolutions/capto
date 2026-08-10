import { describe, expect, it } from 'vitest'
import { getOutputLimits, isVideoQuality } from './videoQuality'

describe('videoQuality', () => {
  it('maps 1440p to QHD limits', () => {
    const limits = getOutputLimits('1440p')
    expect(limits.width).toBe(2560)
    expect(limits.height).toBe(1440)
    expect(limits.videoBitrate).toBeGreaterThan(getOutputLimits('1080p').videoBitrate)
  })

  it('validates quality strings', () => {
    expect(isVideoQuality('1440p')).toBe(true)
    expect(isVideoQuality('4k')).toBe(false)
  })
})
