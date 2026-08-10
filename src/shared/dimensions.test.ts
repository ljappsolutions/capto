import { describe, expect, it } from 'vitest'
import { scaleToMaxOutput } from './dimensions'

describe('scaleToMaxOutput', () => {
  it('does not upscale smaller sources', () => {
    expect(scaleToMaxOutput({ width: 1280, height: 720 })).toEqual({
      width: 1280,
      height: 720
    })
  })

  it('downscales 4K preserving aspect', () => {
    const result = scaleToMaxOutput({ width: 3840, height: 2160 })
    expect(result.width).toBeLessThanOrEqual(1920)
    expect(result.height).toBeLessThanOrEqual(1080)
    expect(result.width % 2).toBe(0)
    expect(result.height % 2).toBe(0)
    expect(result.width / result.height).toBeCloseTo(16 / 9, 2)
  })

  it('handles invalid input', () => {
    expect(scaleToMaxOutput({ width: 0, height: 0 })).toEqual({ width: 1280, height: 720 })
  })
})
