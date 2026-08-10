import { MAX_OUTPUT_HEIGHT, MAX_OUTPUT_WIDTH } from './constants'

export interface Size {
  width: number
  height: number
}

/**
 * Scale source dimensions into max output bounds without upscaling.
 * Preserves aspect ratio; results are even integers for codec friendliness.
 */
export function scaleToMaxOutput(
  source: Size,
  maxWidth = MAX_OUTPUT_WIDTH,
  maxHeight = MAX_OUTPUT_HEIGHT
): Size {
  if (source.width <= 0 || source.height <= 0) {
    return { width: 1280, height: 720 }
  }

  const widthScale = maxWidth / source.width
  const heightScale = maxHeight / source.height
  const scale = Math.min(1, widthScale, heightScale)

  let width = Math.round(source.width * scale)
  let height = Math.round(source.height * scale)

  if (width % 2 !== 0) width -= 1
  if (height % 2 !== 0) height -= 1

  return {
    width: Math.max(2, width),
    height: Math.max(2, height)
  }
}
