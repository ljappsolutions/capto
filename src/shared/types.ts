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

export type CameraShape = 'circle' | 'rounded' | 'square'

export type CameraBorder = 'none' | 'subtle' | 'accent'

/** 'overlay' = screen with camera bubble, 'camera-only' = full-frame webcam. */
export type CameraLayout = 'overlay' | 'camera-only'

export interface CameraOverlay {
  shape: CameraShape
  /** Bubble size as a fraction of the output's short side (0.1–0.45). */
  size: number
  /** Normalized bubble center, 0–1 of output width. */
  x: number
  /** Normalized bubble center, 0–1 of output height. */
  y: number
  mirror: boolean
  border: CameraBorder
}

export type StorageProviderId = 'aws-s3' | 's3-compatible' | 'azure-blob' | 'gcs'

export type ShareLinkFormat = 'viewer' | 'raw'

/** Non-secret sharing configuration (secrets live in the encrypted credential store). */
export interface SharingSettings {
  provider: StorageProviderId | null
  /** Folder prefix inside the bucket/container, e.g. "capto". */
  prefix: string
  defaultExpirySec: number
  linkFormat: ShareLinkFormat
  viewerBaseUrl: string
  /** Upload + copy link automatically when a recording finishes. */
  autoUpload: boolean
  aws: { region: string; bucket: string }
  s3Compatible: { endpoint: string; region: string; bucket: string; forcePathStyle: boolean }
  azure: { accountName: string; container: string; /** Optional custom blob endpoint (Azurite). */ endpoint: string }
  gcs: { bucket: string; /** Optional custom API endpoint (fake-gcs-server). */ apiEndpoint: string }
}

/** Secrets per provider, never sent to the renderer. */
export type StorageCredentials =
  | { provider: 'aws-s3' | 's3-compatible'; accessKeyId: string; secretAccessKey: string }
  | { provider: 'azure-blob'; accountKey: string }
  | { provider: 'gcs'; serviceAccountJson: string }

/** What the renderer may know about stored credentials. */
export interface CredentialStatus {
  provider: StorageProviderId
  configured: boolean
  /** Last characters of the key id / client email, for recognition. */
  hint: string | null
}

export interface StorageTestResult {
  ok: boolean
  message: string
  /** Step that failed: write | sign | read | delete */
  step?: 'config' | 'write' | 'sign' | 'read' | 'delete'
}

export interface ShareRecord {
  provider: StorageProviderId
  /** Bucket or container. */
  location: string
  objectKey: string
  posterKey?: string
  signedUrl: string
  posterUrl?: string
  viewerUrl?: string
  createdAt: string
  expiresAt: string
}

export interface UploadProgressEvent {
  recordingId: string
  phase: 'preparing' | 'uploading' | 'signing' | 'done' | 'error' | 'cancelled'
  /** 0–1 */
  progress: number
  message?: string
  share?: ShareRecord
}

export interface ShareRequest {
  recordingId: string
  /** Defaults to settings.sharing.defaultExpirySec. */
  expiresInSec?: number
}

export type VideoQuality = '720p' | '1080p' | '1440p'

export interface AppSettings {
  launchAtLogin: boolean
  defaultMicrophoneId: string | null
  defaultCameraId: string | null
  defaultCameraEnabled: boolean
  defaultSystemAudioEnabled: boolean
  recordingDirectory: string | null
  globalShortcut: string
  cameraOverlay: CameraOverlay
  cameraLayout: CameraLayout
  videoQuality: VideoQuality
  systemVolume: number
  micVolume: number
  /** 0 = unlimited. */
  maxRecordingMinutes: number
  sharing: SharingSettings
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
  cameraOverlay: CameraOverlay
  cameraLayout: CameraLayout
  systemVolume: number
  micVolume: number
  videoQuality: VideoQuality
  /** 0 = unlimited. */
  maxDurationMs: number
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
  shares?: ShareRecord[]
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

export type WindowKind =
  | 'picker'
  | 'controls'
  | 'complete'
  | 'recordings'
  | 'settings'
  | 'countdown'
  | 'exporting'

export type ExportPhase = 'finalizing' | 'converting' | 'saving'

export interface ExportProgressEvent {
  phase: ExportPhase
  /** 0–1 overall export progress */
  progress: number
  message: string
}

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
  videoBitrate: number
  ffmpegCrf: number
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
  /** null when there is no duration limit. */
  remainingMs: number | null
  microphoneEnabled: boolean
  cameraEnabled: boolean
  error?: AppError
}
