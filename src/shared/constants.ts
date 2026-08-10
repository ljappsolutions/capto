export const APP_NAME = 'Capto'
export const APP_ID = 'app.capto.desktop'

export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+R'

/** Maximum recording duration for MVP (5 minutes). */
export const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000

export const COUNTDOWN_SECONDS = 3

export const MEDIA_RECORDER_TIMESLICE_MS = 1000

export const TARGET_FPS = 30

export const MAX_OUTPUT_WIDTH = 1920
export const MAX_OUTPUT_HEIGHT = 1080

export const VIDEO_BITRATE = 4_000_000
export const AUDIO_BITRATE = 128_000

export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
] as const

export const METADATA_VERSION = 1

export const SETTINGS_FILENAME = 'settings.json'
export const METADATA_DIRNAME = 'metadata'
export const RECOVERIES_DIRNAME = 'Recoveries'

export const PARTIAL_EXTENSION = '.partial.webm'
/** Intermediate MediaRecorder container before QuickTime-friendly transcode. */
export const INTERMEDIATE_EXTENSION = '.webm'
/** Final delivered recording format (H.264/AAC). */
export const FINAL_EXTENSION = '.mp4'
export const FINAL_MIME_TYPE = 'video/mp4'
