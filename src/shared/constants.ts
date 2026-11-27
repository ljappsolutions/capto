export const APP_NAME = 'Capto'
export const APP_ID = 'app.capto.desktop'

export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+R'

/** Default recording limit in minutes; 0 means unlimited. */
export const DEFAULT_MAX_RECORDING_MINUTES = 0
/** Upper bound accepted for the limit setting (8 hours). */
export const MAX_RECORDING_MINUTES_LIMIT = 8 * 60

export const CREDENTIALS_FILENAME = 'credentials.bin'
export const POSTER_FILENAME = 'poster.jpg'

export const COUNTDOWN_SECONDS = 3

export const MEDIA_RECORDER_TIMESLICE_MS = 1000

export const TARGET_FPS = 30

/** Default max output when settings are unavailable (1080p). */
export const MAX_OUTPUT_WIDTH = 1920
export const MAX_OUTPUT_HEIGHT = 1080

/** Fallback bitrate; prefer getOutputLimits(quality).videoBitrate. */
export const VIDEO_BITRATE = 5_000_000
export const AUDIO_BITRATE = 160_000

export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
] as const

export const METADATA_VERSION = 2

export const SETTINGS_FILENAME = 'settings.json'
export const METADATA_DIRNAME = 'metadata'
export const RECOVERIES_DIRNAME = 'Recoveries'

export const PARTIAL_EXTENSION = '.partial.webm'
/** Intermediate MediaRecorder container before QuickTime-friendly transcode. */
export const INTERMEDIATE_EXTENSION = '.webm'
/** Final delivered recording format (H.264/AAC). */
export const FINAL_EXTENSION = '.mp4'
export const FINAL_MIME_TYPE = 'video/mp4'
