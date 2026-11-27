import type { CameraBorder, CameraOverlay, CameraPosition, CameraShape } from './types'

export const CAMERA_SIZE_MIN = 0.1
export const CAMERA_SIZE_MAX = 0.45
/** Gap between bubble and frame edge when snapping, as a fraction of the short side. */
export const CAMERA_EDGE_MARGIN = 0.03

export const CAMERA_SIZE_PRESETS = { S: 0.16, M: 0.22, L: 0.32 } as const

export const DEFAULT_CAMERA_OVERLAY: CameraOverlay = {
  shape: 'circle',
  size: CAMERA_SIZE_PRESETS.M,
  x: 0.88,
  y: 0.82,
  mirror: true,
  border: 'subtle'
}

const SHAPES: readonly CameraShape[] = ['circle', 'rounded', 'square']
const BORDERS: readonly CameraBorder[] = ['none', 'subtle', 'accent']

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface BubbleRect {
  /** Top-left corner in output pixels. */
  left: number
  top: number
  /** Side length in output pixels (bubble is always square-framed). */
  side: number
  /** Corner radius in pixels for the clip path. */
  cornerRadius: number
}

export function cornerRadiusFor(shape: CameraShape, side: number): number {
  if (shape === 'circle') return side / 2
  if (shape === 'rounded') return side * 0.18
  return 0
}

/**
 * Clamp a normalized center so the whole bubble stays inside the frame.
 */
export function clampCenter(
  overlay: Pick<CameraOverlay, 'x' | 'y' | 'size'>,
  width: number,
  height: number
): { x: number; y: number } {
  const side = Math.min(width, height) * clamp(overlay.size, CAMERA_SIZE_MIN, CAMERA_SIZE_MAX)
  const halfX = width > 0 ? side / 2 / width : 0
  const halfY = height > 0 ? side / 2 / height : 0
  return {
    x: clamp(overlay.x, halfX, 1 - halfX),
    y: clamp(overlay.y, halfY, 1 - halfY)
  }
}

export function computeBubbleRect(
  overlay: CameraOverlay,
  width: number,
  height: number
): BubbleRect {
  const side = Math.round(
    Math.min(width, height) * clamp(overlay.size, CAMERA_SIZE_MIN, CAMERA_SIZE_MAX)
  )
  const center = clampCenter(overlay, width, height)
  const left = Math.round(center.x * width - side / 2)
  const top = Math.round(center.y * height - side / 2)
  return { left, top, side, cornerRadius: cornerRadiusFor(overlay.shape, side) }
}

/** Normalized center that puts the bubble in a corner with the standard margin. */
export function cornerCenter(
  corner: CameraPosition,
  size: number,
  width: number,
  height: number
): { x: number; y: number } {
  const short = Math.min(width, height)
  const side = short * clamp(size, CAMERA_SIZE_MIN, CAMERA_SIZE_MAX)
  const margin = short * CAMERA_EDGE_MARGIN
  const leftX = (margin + side / 2) / width
  const topY = (margin + side / 2) / height
  return {
    x: corner.endsWith('left') ? leftX : 1 - leftX,
    y: corner.startsWith('top') ? topY : 1 - topY
  }
}

/**
 * Snap to a corner when the center is within `threshold` (normalized) of it.
 */
export function snapToCorner(
  overlay: CameraOverlay,
  width: number,
  height: number,
  threshold = 0.06
): CameraOverlay {
  const corners: CameraPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  for (const corner of corners) {
    const c = cornerCenter(corner, overlay.size, width, height)
    if (Math.abs(c.x - overlay.x) < threshold && Math.abs(c.y - overlay.y) < threshold) {
      return { ...overlay, x: c.x, y: c.y }
    }
  }
  return { ...overlay, ...clampCenter(overlay, width, height) }
}

/** Nearest corner to the overlay center (used for quick "move to corner" actions). */
export function nearestCorner(overlay: Pick<CameraOverlay, 'x' | 'y'>): CameraPosition {
  const v = overlay.y < 0.5 ? 'top' : 'bottom'
  const h = overlay.x < 0.5 ? 'left' : 'right'
  return `${v}-${h}` as CameraPosition
}

/** 16:9 reference frame used when converting legacy corner settings. */
const REF_W = 1920
const REF_H = 1080

export function parseCameraOverlay(raw: unknown, legacyPosition?: unknown): CameraOverlay {
  const base = { ...DEFAULT_CAMERA_OVERLAY }
  if (
    legacyPosition === 'top-left' ||
    legacyPosition === 'top-right' ||
    legacyPosition === 'bottom-left' ||
    legacyPosition === 'bottom-right'
  ) {
    Object.assign(base, cornerCenter(legacyPosition, base.size, REF_W, REF_H))
  } else {
    Object.assign(base, cornerCenter('bottom-right', base.size, REF_W, REF_H))
  }
  if (typeof raw !== 'object' || raw === null) return base
  const o = raw as Record<string, unknown>
  const num = (v: unknown, fallback: number, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback
  return {
    shape: SHAPES.includes(o.shape as CameraShape) ? (o.shape as CameraShape) : base.shape,
    size: num(o.size, base.size, CAMERA_SIZE_MIN, CAMERA_SIZE_MAX),
    x: num(o.x, base.x, 0, 1),
    y: num(o.y, base.y, 0, 1),
    mirror: typeof o.mirror === 'boolean' ? o.mirror : base.mirror,
    border: BORDERS.includes(o.border as CameraBorder) ? (o.border as CameraBorder) : base.border
  }
}
