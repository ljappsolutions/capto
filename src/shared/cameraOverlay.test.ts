import { describe, expect, it } from 'vitest'
import {
  computeBubbleRect,
  cornerCenter,
  DEFAULT_CAMERA_OVERLAY,
  nearestCorner,
  parseCameraOverlay,
  snapToCorner
} from './cameraOverlay'

describe('cameraOverlay', () => {
  it('keeps the bubble inside the frame', () => {
    const rect = computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, x: 1, y: 1 }, 1920, 1080)
    expect(rect.left + rect.side).toBeLessThanOrEqual(1920)
    expect(rect.top + rect.side).toBeLessThanOrEqual(1080)
    const r2 = computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, x: 0, y: 0 }, 1920, 1080)
    expect(r2.left).toBeGreaterThanOrEqual(0)
    expect(r2.top).toBeGreaterThanOrEqual(0)
  })

  it('sizes relative to the short side and clamps size', () => {
    expect(computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, size: 0.2 }, 1920, 1080).side).toBe(216)
    expect(computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, size: 5 }, 1000, 1000).side).toBe(450)
  })

  it('uses shape-specific corner radius', () => {
    expect(computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, shape: 'circle', size: 0.2 }, 1000, 1000).cornerRadius).toBe(100)
    expect(computeBubbleRect({ ...DEFAULT_CAMERA_OVERLAY, shape: 'square', size: 0.2 }, 1000, 1000).cornerRadius).toBe(0)
  })

  it('migrates legacy corner positions', () => {
    const o = parseCameraOverlay(undefined, 'top-left')
    expect(nearestCorner(o)).toBe('top-left')
    expect(nearestCorner(parseCameraOverlay(null))).toBe('bottom-right')
  })

  it('parses and clamps stored overlays', () => {
    const o = parseCameraOverlay({ shape: 'rounded', size: 0.01, x: 2, y: -1, mirror: false, border: 'bogus' })
    expect(o.shape).toBe('rounded')
    expect(o.size).toBe(0.1)
    expect(o.x).toBe(1)
    expect(o.y).toBe(0)
    expect(o.mirror).toBe(false)
    expect(o.border).toBe('subtle')
  })

  it('snaps near corners', () => {
    const c = cornerCenter('top-right', 0.22, 1920, 1080)
    const snapped = snapToCorner({ ...DEFAULT_CAMERA_OVERLAY, x: c.x - 0.02, y: c.y + 0.02 }, 1920, 1080)
    expect(snapped.x).toBeCloseTo(c.x)
    expect(snapped.y).toBeCloseTo(c.y)
  })
})
