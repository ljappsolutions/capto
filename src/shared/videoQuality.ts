import type { VideoQuality } from './types'

export interface OutputLimits {
  width: number
  height: number
  /** Target MediaRecorder video bitrate (bits/sec). */
  videoBitrate: number
  /** Suggested ffmpeg CRF (lower = higher quality). */
  ffmpegCrf: number
}

/** 1440p (QHD) is what YouTube labels as 1440p / “2K”. */
export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, OutputLimits> = {
  '720p': { width: 1280, height: 720, videoBitrate: 2_500_000, ffmpegCrf: 23 },
  '1080p': { width: 1920, height: 1080, videoBitrate: 5_000_000, ffmpegCrf: 22 },
  '1440p': { width: 2560, height: 1440, videoBitrate: 10_000_000, ffmpegCrf: 21 }
}

export function getOutputLimits(quality: VideoQuality): OutputLimits {
  return VIDEO_QUALITY_PRESETS[quality] ?? VIDEO_QUALITY_PRESETS['1080p']
}

export function isVideoQuality(value: unknown): value is VideoQuality {
  return value === '720p' || value === '1080p' || value === '1440p'
}
