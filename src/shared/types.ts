export type CaptureSourceType = 'screen' | 'window'

export interface CaptureSource {
  id: string
  name: string
  type: CaptureSourceType
  thumbnailDataUrl: string
  appIconDataUrl?: string
  displayId?: string
}

export type PermissionStatus = 'granted' | 'denied' | 'restricted' | 'unknown' | 'not-determined'

export interface PermissionState {
  screen: PermissionStatus
  microphone: PermissionStatus
  camera: PermissionStatus
  /** Informational; CoreAudio desktop capture relies on Info.plist + stream track state. */
  systemAudio: PermissionStatus
  screenRequiresRestart: boolean
}

export type CameraPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type VideoQuality = '720p' | '1080p'

export interface AppSettings {
  launchAtLogin: boolean
  defaultMicrophoneId: string | null
  defaultCameraId: string | null
  defaultCameraEnabled: boolean
  defaultSystemAudioEnabled: boolean
  recordingDirectory: string | null
  globalShortcut: string
  cameraPosition: CameraPosition
  videoQuality: VideoQuality
  systemVolume: number
  micVolume: number
}

/** Settings as shown in the UI, including runtime packaging context. */
export interface AppSettingsView extends AppSettings {
  isPackaged: boolean
}

export type RecordingState =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'countdown'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'completed'
  | 'error'

export interface RecordingOptions {
  captureSourceId: string
  captureSourceName: string
  captureSourceType: CaptureSourceType
  microphoneEnabled: boolean
  microphoneDeviceId: string | null
  cameraEnabled: boolean
  cameraDeviceId: string | null
  systemAudioEnabled: boolean
  cameraPosition: CameraPosition
  systemVolume: number
  micVolume: number
}

export interface RecordingMetadata {
  version: number
  id: string
  filename: string
  path: string
  createdAt: string
  durationMs: number
  sizeBytes: number
  captureSourceName: string
  captureSourceType: CaptureSourceType
  microphoneEnabled: boolean
  cameraEnabled: boolean
  systemAudioEnabled: boolean
  mimeType: string
  width: number
  height: number
  fps: number
  recovered?: boolean
}

export interface RecordingResult {
  metadata: RecordingMetadata
}

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput'
}

export interface VideoDevice {
  deviceId: string
  label: string
  kind: 'videoinput'
}

export type WindowKind = 'picker' | 'controls' | 'complete' | 'recordings' | 'settings' | 'countdown'

export interface CreateRecordingPayload {
  id: string
  captureSourceName: string
  captureSourceType: CaptureSourceType
  mimeType: string
  microphoneEnabled: boolean
  cameraEnabled: boolean
  systemAudioEnabled: boolean
  width: number
  height: number
  fps: number
}

export interface AppendChunkPayload {
  id: string
  chunk: ArrayBuffer
  sequence: number
}

export interface FinalizeRecordingPayload {
  id: string
  durationMs: number
}

export interface RenameRecordingPayload {
  id: string
  newBasename: string
}

export interface RecordingListItem {
  metadata: RecordingMetadata
}

export type AppErrorCode =
  | 'SCREEN_PERMISSION_MISSING'
  | 'MICROPHONE_PERMISSION_DENIED'
  | 'CAMERA_PERMISSION_DENIED'
  | 'SOURCE_DISAPPEARED'
  | 'DISPLAY_STREAM_FAILED'
  | 'SYSTEM_AUDIO_UNAVAILABLE'
  | 'MIME_UNSUPPORTED'
  | 'MEDIA_RECORDER_FAILED'
  | 'DISK_FULL'
  | 'OUTPUT_DIR_UNAVAILABLE'
  | 'FILE_CREATE_FAILED'
  | 'CHUNK_WRITE_FAILED'
  | 'SHUTDOWN_DURING_RECORDING'
  | 'RENDERER_CRASH'
  | 'UNKNOWN'

export interface AppError {
  code: AppErrorCode
  message: string
  details?: string
}

export interface RecordingProgressEvent {
  state: RecordingState
  elapsedMs: number
  remainingMs: number
  microphoneEnabled: boolean
  cameraEnabled: boolean
  error?: AppError
}
